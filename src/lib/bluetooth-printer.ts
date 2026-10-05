// Web Bluetooth ESC/POS Thermal 58mm Printer Driver
export interface ReceiptItem {
  name: string
  qty: number
  price: number
}

export interface ReceiptData {
  storeName?: string
  address?: string
  transactionId?: string | null
  dateStr?: string
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod: string
  cashGiven?: number
  change?: number
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator
}

// Format 32-column line for 58mm paper (16-character left, 16-character right)
function formatLine(left: string, right: string, width = 32): string {
  const leftTrim = left.slice(0, width - right.length - 1)
  const spaces = " ".repeat(Math.max(1, width - leftTrim.length - right.length))
  return leftTrim + spaces + right + "\n"
}

export async function printReceiptViaBluetooth(data: ReceiptData): Promise<{ success: boolean; message: string }> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      message: "Browser ini belum mendukung Web Bluetooth. Silakan gunakan Google Chrome atau Microsoft Edge di Android/Desktop.",
    }
  }

  try {
    const nav = navigator as any
    // Minta user memilih printer thermal Bluetooth terdekat
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { namePrefix: "RPP" },
        { namePrefix: "MTP" },
        { namePrefix: "POS" },
        { namePrefix: "Thermal" },
        { namePrefix: "Printer" },
        { namePrefix: "BT" },
      ],
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // Standar POS Printer Service
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      ],
    })

    const server = await device.gatt.connect()

    // Cari service yang tersedia
    let service: any = null
    const candidateServices = [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "0000ff00-0000-1000-8000-00805f9b34fb",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    ]

    for (const sUuid of candidateServices) {
      try {
        service = await server.getPrimaryService(sUuid)
        if (service) break
      } catch {
        // try next service UUID
      }
    }

    if (!service) {
      throw new Error("Layanan cetak printer tidak ditemukan pada perangkat Bluetooth ini.")
    }

    const characteristics = await service.getCharacteristics()
    const writeCharacteristic = characteristics.find(
      (c: any) => c.properties.write || c.properties.writeWithoutResponse
    )

    if (!writeCharacteristic) {
      throw new Error("Karakteristik cetak data (write) tidak ditemukan.")
    }

    // Bangun ESC/POS Raw Command Bytes
    const commands: number[] = [
      0x1b, 0x40, // ESC @ (Reset & Initialize)
      0x1b, 0x61, 0x01, // ESC a 1 (Center Align)
    ]

    const textEncoder = new TextEncoder()
    const appendText = (str: string) => {
      const bytes = textEncoder.encode(str)
      bytes.forEach((b) => commands.push(b))
    }

    // Header Struk
    appendText(`${data.storeName || "QRIS-POS SHOP"}\n`)
    appendText(`${data.address || "Jl. Jenderal Sudirman No. 123"}\n`)
    appendText(`${data.dateStr || new Date().toLocaleString("id-ID")}\n`)
    if (data.transactionId) {
      appendText(`ID: #${data.transactionId.slice(0, 8)}\n`)
    }
    appendText("--------------------------------\n")

    // Left Align untuk Items
    commands.push(0x1b, 0x61, 0x00) // ESC a 0

    const formatIdr = (val: number) =>
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)

    data.items.forEach((item) => {
      appendText(`${item.name}\n`)
      const detail = `${item.qty} x ${formatIdr(item.price)}`
      const subtotal = formatIdr(item.qty * item.price)
      appendText(formatLine(detail, subtotal))
    })

    appendText("--------------------------------\n")
    appendText(formatLine("TOTAL", formatIdr(data.totalAmount)))
    appendText(formatLine("Metode Bayar", data.paymentMethod.toUpperCase()))

    if (data.paymentMethod === "cash" && (data.cashGiven || 0) > 0) {
      appendText(formatLine("Tunai Diterima", formatIdr(data.cashGiven || 0)))
      appendText(formatLine("Kembalian", formatIdr(data.change || 0)))
    }

    appendText("--------------------------------\n")
    // Center Align Footer
    commands.push(0x1b, 0x61, 0x01)
    appendText("Terima kasih atas\nkunjungan Anda!\n")
    appendText("\n\n\n") // Feed lines
    commands.push(0x1d, 0x56, 0x00) // GS V 0 (Cut Paper)

    // Kirim chunked data (maks 512 bytes per packet BLE)
    const payload = new Uint8Array(commands)
    const chunkSize = 128
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize)
      if (writeCharacteristic.properties.writeWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk)
      } else {
        await writeCharacteristic.writeValue(chunk)
      }
    }

    return {
      success: true,
      message: "Struk berhasil dicetak ke printer Bluetooth thermal!",
    }
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      return { success: false, message: "Pemilihan printer Bluetooth dibatalkan." }
    }
    return {
      success: false,
      message: err.message || "Gagal mencetak via Bluetooth. Mengalihkan ke dialog cetak browser.",
    }
  }
}
