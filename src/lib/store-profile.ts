import { create } from "zustand"
import { persist } from "zustand/middleware"

export type BusinessCategory =
  | "retail"
  | "fnb"
  | "pharmacy_herbal"
  | "fashion"
  | "services"
  | "custom"

export interface StoreTerminology {
  catalogHeading: string
  singleProductHeading: string
  buyButtonText: string
  aiPersonaTitle: string
  aiButtonText: string
  searchPlaceholder: string
  bannerGreetingTemplate: string
  botGreetingTemplate: string
  allCategoryLabel: string
  cartEmptyText: string
  orderSuccessText: string
  itemReceiptTitle: string
  orderMoreText: string
}

export interface BusinessCategoryInfo {
  id: BusinessCategory
  label: string
  icon: string
  description: string
  defaultStoreName: string
  defaultTagline: string
  terminology: StoreTerminology
}

export const CATEGORY_PRESETS: Record<BusinessCategory, BusinessCategoryInfo> = {
  retail: {
    id: "retail",
    label: "Retail & Minimarket (Umum)",
    icon: "Store",
    description: "Cocok untuk toko kelontong, minimarket, distributor barang, dan aneka dagangan umum.",
    defaultStoreName: "Toko Retail POS",
    defaultTagline: "Pusat Belanja Kebutuhan Harian Lengkap & Terjangkau",
    terminology: {
      catalogHeading: "Katalog Toko",
      singleProductHeading: "Produk Spesifik (Deep-link & Konsultasi)",
      buyButtonText: "+ Tambah Pesanan",
      aiPersonaTitle: "Asisten Toko Cerdas",
      aiButtonText: "Tanya Asisten AI",
      searchPlaceholder: "Cari produk, kategori, atau barcode...",
      bannerGreetingTemplate: "Halo Pengunjung dari {channel}! Selamat datang di {storeName}.",
      botGreetingTemplate: "Halo! Senang Anda berkunjung dari {channel}. Ada produk atau rekomendasi yang bisa saya bantu hari ini?",
      allCategoryLabel: "Semua Produk",
      cartEmptyText: "Pilih produk dari katalog untuk memulai pemesanan.",
      orderSuccessText: "Pesanan Anda telah dikonfirmasi dan sedang dipersiapkan.",
      itemReceiptTitle: "Rincian Pesanan Produk",
      orderMoreText: "Pesan Produk Lainnya",
    },
  },
  fnb: {
    id: "fnb",
    label: "Kuliner, Kafe & Restoran (F&B)",
    icon: "Utensils",
    description: "Cocok untuk kedai kopi, restoran, warung makan, bakery, dan usaha kuliner.",
    defaultStoreName: "Resto & Cafe Nusantara",
    defaultTagline: "Sajian Lezat & Higienis Dibuat dari Bahan Pilihan Setiap Hari",
    terminology: {
      catalogHeading: "Buku Menu & Minuman",
      singleProductHeading: "Menu Spesifik (Deep-link & Rekomendasi Rasa)",
      buyButtonText: "+ Pesan Menu",
      aiPersonaTitle: "Pramusaji AI",
      aiButtonText: "Tanya Pramusaji AI",
      searchPlaceholder: "Cari makanan, minuman, menu hemat, camilan...",
      bannerGreetingTemplate: "Halo Sahabat Kuliner dari {channel}! Selamat menikmati hidangan di {storeName}.",
      botGreetingTemplate: "Halo! Selamat datang dari {channel}. Mau rekomendasi menu favorit koki atau promo hari ini?",
      allCategoryLabel: "Semua Menu 🍽️",
      cartEmptyText: "Pilih hidangan lezat dari daftar menu untuk mulai memesan.",
      orderSuccessText: "Pesanan hidangan Anda telah diterima dan diteruskan ke dapur.",
      itemReceiptTitle: "Rincian Pesanan Menu",
      orderMoreText: "Pesan Menu Lainnya",
    },
  },
  pharmacy_herbal: {
    id: "pharmacy_herbal",
    label: "Apotek, Herbal & Farmasi",
    icon: "Pill",
    description: "Cocok untuk apotek, toko obat herbal, jamu tradisional, dan klinik suplemen kesehatan.",
    defaultStoreName: "Apotek Herbal Nusantara",
    defaultTagline: "Pusat Herbal Alami Berkhasiat & Suplemen Berizin Resmi BPOM RI",
    terminology: {
      catalogHeading: "Katalog Resep & Suplemen Herbal",
      singleProductHeading: "Produk Herbal Spesifik (Deep-link & Konsultasi Apoteker)",
      buyButtonText: "+ Beli Herbal",
      aiPersonaTitle: "Apoteker AI Pendamping",
      aiButtonText: "Tanya Apoteker",
      searchPlaceholder: "Cari produk herbal, no. BPOM, atau keluhan kesehatan...",
      bannerGreetingTemplate: "Halo Pengunjung dari {channel}! Selamat datang di {storeName}.",
      botGreetingTemplate: "Halo! Senang Anda berkunjung melalui {channel}. Ada keluhan kesehatan atau rekomendasi suplemen herbal yang ingin dikonsultasikan?",
      allCategoryLabel: "Semua Herbal 🌿",
      cartEmptyText: "Pilih resep herbal alami dari katalog untuk memulai pemesanan.",
      orderSuccessText: "Pesanan resep herbal Anda telah dikonfirmasi dan sedang dipersiapkan.",
      itemReceiptTitle: "Rincian Resep Herbal",
      orderMoreText: "Pesan Herbal Lainnya",
    },
  },
  fashion: {
    id: "fashion",
    label: "Fashion, Busana & Butik",
    icon: "Shirt",
    description: "Cocok untuk butik pakaian, distro, sepatu, aksesoris, dan produk mode gaya hidup.",
    defaultStoreName: "Boutique & Fashion Studio",
    defaultTagline: "Gaya Busana Trendi & Nyaman untuk Menunjang Penampilan Terbaik Anda",
    terminology: {
      catalogHeading: "Katalog Koleksi Fashion",
      singleProductHeading: "Koleksi Spesifik (Deep-link & Panduan Ukuran)",
      buyButtonText: "+ Masukkan Tas",
      aiPersonaTitle: "Fashion Stylist AI",
      aiButtonText: "Konsultasi Gaya",
      searchPlaceholder: "Cari busana, outfit, model, ukuran...",
      bannerGreetingTemplate: "Halo Fashionista dari {channel}! Temukan inspirasi outfit terkini di {storeName}.",
      botGreetingTemplate: "Halo! Selamat datang dari {channel}. Sedang mencari paduan outfit acara atau ukuran yang pas?",
      allCategoryLabel: "Semua Koleksi 👗",
      cartEmptyText: "Pilih pakaian atau aksesori dari koleksi untuk mulai belanja.",
      orderSuccessText: "Pesanan busana Anda telah dikonfirmasi dan siap dikemas rapi.",
      itemReceiptTitle: "Rincian Belanja Busana",
      orderMoreText: "Lihat Koleksi Lainnya",
    },
  },
  services: {
    id: "services",
    label: "Jasa, Bengkel & Salon",
    icon: "Wrench",
    description: "Cocok untuk salon kecantikan, barbershop, bengkel servis, kursus, dan penyedia jasa.",
    defaultStoreName: "Studio Layanan Profesional",
    defaultTagline: "Pelayanan Profesional Cepat, Tepat, dan Terpercaya",
    terminology: {
      catalogHeading: "Daftar Paket Layanan & Jasa",
      singleProductHeading: "Layanan Spesifik (Deep-link & Konsultasi Jadwal)",
      buyButtonText: "+ Pesan Layanan",
      aiPersonaTitle: "Konsultan Layanan AI",
      aiButtonText: "Tanya Konsultan",
      searchPlaceholder: "Cari paket servis, jasa, konsultasi...",
      bannerGreetingTemplate: "Halo Pengunjung dari {channel}! Selamat datang di {storeName}.",
      botGreetingTemplate: "Halo! Senang bertemu Anda via {channel}. Layanan apa yang bisa kami bantu jadwalkan hari ini?",
      allCategoryLabel: "Semua Layanan ⚙️",
      cartEmptyText: "Pilih paket jasa atau layanan dari daftar untuk melakukan pemesanan.",
      orderSuccessText: "Reservasi layanan Anda telah tercatat dan jadwal siap dikonfirmasi.",
      itemReceiptTitle: "Rincian Reservasi Layanan",
      orderMoreText: "Pesan Layanan Lainnya",
    },
  },
  custom: {
    id: "custom",
    label: "Kustom Mandiri (Bebas)",
    icon: "Sliders",
    description: "Atur nama toko, slogan, dan seluruh terminologi antarmuka secara bebas dan spesifik.",
    defaultStoreName: "Toko Digital Mandiri",
    defaultTagline: "Katalog & Transaksi Digital Praktis",
    terminology: {
      catalogHeading: "Katalog Toko",
      singleProductHeading: "Produk Spesifik (Deep-link & Konsultasi)",
      buyButtonText: "+ Beli Sekarang",
      aiPersonaTitle: "Asisten Toko Cerdas",
      aiButtonText: "Tanya Asisten AI",
      searchPlaceholder: "Cari item katalog, kategori, atau barcode...",
      bannerGreetingTemplate: "Halo Pengunjung dari {channel}! Selamat datang di {storeName}.",
      botGreetingTemplate: "Halo! Senang Anda berkunjung dari {channel}. Ada yang bisa kami bantu rekomendasikan?",
      allCategoryLabel: "Semua Item",
      cartEmptyText: "Pilih item dari katalog untuk memulai pemesanan.",
      orderSuccessText: "Pesanan Anda telah dikonfirmasi dan sedang dipersiapkan.",
      itemReceiptTitle: "Rincian Pesanan",
      orderMoreText: "Pesan Item Lainnya",
    },
  },
}

export interface StoreProfileState {
  storeName: string
  tagline: string
  businessCategory: BusinessCategory
  terminology: StoreTerminology

  // Actions
  setBusinessCategory: (category: BusinessCategory) => void
  applyCategoryPreset: (category: BusinessCategory) => void
  updateStoreProfile: (profile: Partial<{ storeName: string; tagline: string }>) => void
  updateTerminology: (customTerminology: Partial<StoreTerminology>) => void
  resetToDefault: () => void
  hydrateFromServer: () => Promise<void>
  saveToServer: () => Promise<boolean>

  // Helper
  renderTemplate: (template: string, channel?: string) => string
}

export const useStoreProfileStore = create<StoreProfileState>()(
  persist(
    (set, get) => ({
      storeName: CATEGORY_PRESETS.retail.defaultStoreName,
      tagline: CATEGORY_PRESETS.retail.defaultTagline,
      businessCategory: "retail",
      terminology: { ...CATEGORY_PRESETS.retail.terminology },

      setBusinessCategory: (category) => {
        set({ businessCategory: category })
      },

      applyCategoryPreset: (category) => {
        const preset = CATEGORY_PRESETS[category]
        if (!preset) return
        set({
          businessCategory: category,
          storeName: preset.defaultStoreName,
          tagline: preset.defaultTagline,
          terminology: { ...preset.terminology },
        })
      },

      updateStoreProfile: (profile) => {
        set((state) => ({
          ...state,
          ...profile,
        }))
      },

      updateTerminology: (customTerminology) => {
        set((state) => ({
          terminology: {
            ...state.terminology,
            ...customTerminology,
          },
        }))
      },

      resetToDefault: () => {
        set({
          storeName: CATEGORY_PRESETS.retail.defaultStoreName,
          tagline: CATEGORY_PRESETS.retail.defaultTagline,
          businessCategory: "retail",
          terminology: { ...CATEGORY_PRESETS.retail.terminology },
        })
      },

      hydrateFromServer: async () => {
        try {
          const res = await fetch("/api/store-profile-get")
          if (!res.ok) return
          const json = await res.json()
          if (json.success && json.data) {
            const d = json.data
            set((state) => ({
              ...state,
              businessCategory: (d.businessCategory as BusinessCategory) || state.businessCategory,
              storeName: d.storeName || state.storeName,
              tagline: d.tagline !== undefined ? d.tagline : state.tagline,
              terminology: d.terminology
                ? { ...state.terminology, ...d.terminology }
                : state.terminology,
            }))
          }
        } catch (e) {
          // Abaikan jika offline / network gagal, tetap pakai cache lokal
        }
      },

      saveToServer: async () => {
        const state = get()
        try {
          const token = typeof window !== "undefined"
            ? (localStorage.getItem("access_token") || sessionStorage.getItem("access_token"))
            : null

          const res = await fetch("/api/store-profile-update", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              businessCategory: state.businessCategory,
              storeName: state.storeName,
              tagline: state.tagline,
              aiPersonaTitle: state.terminology.aiPersonaTitle,
              terminology: state.terminology
            })
          })
          if (!res.ok) return false
          const json = await res.json()
          return Boolean(json.success)
        } catch {
          return false
        }
      },

      renderTemplate: (template, channel = "Media Digital") => {
        const state = get()
        return template
          .replace(/{channel}/gi, channel)
          .replace(/{storeName}/gi, state.storeName || "Toko Kami")
      },
    }),
    {
      name: "qris-pos-store-profile",
    }
  )
)
