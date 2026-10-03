import { useState, useRef, useEffect } from "react"
import { useCustomerCartStore } from "@/stores/customer-cart-store"
import type { Product } from "@/types"
import {
  X,
  Send,
  Leaf,
  ShieldCheck,
  Plus,
  Check,
  RotateCcw,
  Sparkles,
  Bot,
  ChevronDown,
  Info,
} from "lucide-react"

interface ChatMessage {
  id: string
  sender: "user" | "bot"
  text: string
  products?: Product[]
  timestamp: string
}

const QUICK_PROMPTS = [
  { label: "🥩 Tengkuk Tegang & Kolesterol", text: "Leher dan tengkuk saya terasa kaku dan berat setelah makan santan, herbal apa yang cocok untuk kolesterol?" },
  { label: "🦵 Asam Urat & Nyeri Sendi", text: "Jempol kaki dan sendi lutut saya bengkak ngilu habis makan emping dan jeroan, apa obat herbalnya?" },
  { label: "❄️ Darah Kental & Kesemutan", text: "Tangan dan kaki saya sering kesemutan, baal, dan ujung jari terasa dingin, herbal apa untuk melancarkan darah?" },
  { label: "🩸 Gula Darah & Cepat Lelah", text: "Gula darah saya cenderung tinggi dan badan gampang lemas sehabis makan, ada rekomendasi herbal penurun gula?" },
  { label: "💓 Tensi Tinggi & Pusing", text: "Kepala saya sering pusing berdenyut dan tensi darah di atas normal 140/90, herbal apa yang aman untuk tensi?" },
]

export function CustomerChatbotWidget({
  formatRupiah,
}: {
  formatRupiah: (n: number) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)

  const { addToCart } = useCustomerCartStore()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: `Halo! Selamat datang di **Konsultan Herbal Medika QRIS-POS** 🌿✨

Saya adalah asisten kesehatan herbal AI resmi. Seluruh rekomendasi produk kami telah **berizin resmi BPOM RI** dan diracik untuk mendukung mitigasi 5 masalah sirkulasi degeneratif:
• **Kolesterol & Plak Jantung**
• **Darah Kental & Sirkulasi Perifer**
• **Asam Urat & Radang Sendi**
• **Diabetes & Regulasi Glukosa**
• **Hipertensi & Tensi Darah**

Silakan pilih topik cepat di bawah atau ceritakan keluhan Anda secara bebas!`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom()
    }
  }, [messages, isOpen, isMinimized, isLoading])

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim()
    if (!message || isLoading) return

    const userMsgId = `user-${Date.now()}`
    const userTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: message,
        timestamp: userTime,
      },
    ])

    setInputMessage("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/consultation-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      })

      const data = await res.json()
      const botTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

      if (data.success && data.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: data.data.reply,
            products: data.data.recommendedProducts || [],
            timestamp: botTime,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: "Mohon maaf, terjadi kendala saat memproses konsultasi Anda. Namun seluruh produk herbal kami tersedia lengkap di katalog atas berizin resmi BPOM.",
            timestamp: botTime,
          },
        ])
      }
    } catch (err) {
      console.error("Consultation fetch error:", err)
      const botTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Koneksi terputus sejenak. Silakan coba kembali atau pilih salah satu tombol keluhan cepat di atas 🌿",
          timestamp: botTime,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCartFromBot = (product: Product) => {
    addToCart(product)
    setAddedProductId(product.id)
    setTimeout(() => {
      setAddedProductId(null)
    }, 2000)
  }

  const resetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "bot",
        text: "Percakapan telah diatur ulang. Ada keluhan kesehatan degeneratif yang ingin Anda konsultasikan kembali? 🌿",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ])
  }

  return (
    <>
      {/* ── FLOATING TRIGGER BUTTON (Always visible at bottom right) ── */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 animate-in fade-in zoom-in duration-300">
          <div className="relative group">
            {/* Tooltip hint on desktop */}
            <div className="hidden sm:flex absolute -top-10 right-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg pointer-events-none opacity-90 group-hover:opacity-100 transition">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Tanya Herbalist AI (BPOM)</span>
              <div className="absolute -bottom-1 right-6 h-2 w-2 rotate-45 bg-stone-900" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(true)
                setIsMinimized(false)
              }}
              className="relative flex items-center gap-2.5 rounded-full bg-linear-to-r from-emerald-700 to-teal-800 px-4 sm:px-5 py-3 text-white shadow-xl shadow-emerald-800/30 ring-2 ring-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Buka Konsultasi Herbal AI"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                <Bot className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
                </span>
              </div>
              <div className="text-left pr-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 leading-none">
                  Asisten Medika
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-white leading-tight">
                  Konsultasi Herbal 🌿
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── CHAT DRAWER / WINDOW ── */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out ${
            isMinimized
              ? "bottom-4 right-4 sm:right-6 w-72 rounded-2xl bg-white shadow-2xl border border-stone-200"
              : "inset-x-2 bottom-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[440px] max-h-[85vh] sm:max-h-[640px] h-[80vh] sm:h-[600px] rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col overflow-hidden ring-1 ring-black/5"
          }`}
        >
          {/* Header */}
          <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 p-3.5 sm:p-4 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Leaf className="h-5 w-5 text-emerald-200" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-800" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 leading-tight">
                  Konsultan Herbal Medika
                  <span className="rounded-md bg-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-100">
                    AI RAG
                  </span>
                </h3>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-300" />
                  Katalog BPOM &amp; Resep Herbal Resmi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-100">
              <button
                type="button"
                onClick={resetChat}
                title="Reset Obrolan"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Perbesar" : "Kecilkan"}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <ChevronDown className={`h-4 w-4 transform transition-transform ${isMinimized ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup Konsultasi"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Minimized Bar Content */}
          {isMinimized ? (
            <div
              onClick={() => setIsMinimized(false)}
              className="p-3 cursor-pointer flex items-center justify-between text-xs text-stone-600 font-medium hover:bg-stone-50"
            >
              <span className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-emerald-600" />
                Lanjutkan sesi konsultasi...
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Buka</span>
            </div>
          ) : (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/60">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                        m.sender === "user"
                          ? "bg-emerald-700 text-white rounded-br-none"
                          : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-none"
                      }`}
                    >
                      {/* Markdown formatting simulation */}
                      <div className="whitespace-pre-wrap space-y-1.5">
                        {m.text.split("\n\n").map((paragraph, pIdx) => {
                          if (paragraph.startsWith("### ")) {
                            return (
                              <h4 key={pIdx} className="font-extrabold text-stone-900 mt-2 text-[12px] flex items-center gap-1">
                                {paragraph.replace("### ", "")}
                              </h4>
                            )
                          }
                          if (paragraph.startsWith("• ")) {
                            return (
                              <p key={pIdx} className="pl-2 font-medium text-stone-700">
                                {paragraph}
                              </p>
                            )
                          }
                          // Bold parser
                          const parts = paragraph.split(/(\*\*.*?\*\*)/g)
                          return (
                            <p key={pIdx}>
                              {parts.map((part, i) => {
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  return (
                                    <strong key={i} className="font-bold text-stone-950">
                                      {part.slice(2, -2)}
                                    </strong>
                                  )
                                }
                                return part
                              })}
                            </p>
                          )
                        })}
                      </div>

                      {/* Attached Product Cards from RAG */}
                      {m.products && m.products.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-stone-200/80 space-y-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Formulasi BPOM Rekomendasi:
                          </p>
                          <div className="space-y-2">
                            {m.products.map((p) => {
                              const isAdded = addedProductId === p.id
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 text-stone-800 transition hover:bg-emerald-50"
                                >
                                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                                    {p.imageUrl ? (
                                      <img
                                        src={p.imageUrl}
                                        alt={p.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-emerald-700">
                                        <Leaf className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[11px] truncate text-stone-900">
                                      {p.name}
                                    </p>
                                    <p className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                                      {formatRupiah(p.price)}
                                    </p>
                                    <p className="text-[9px] text-stone-500 truncate">
                                      {p.sku} • {p.category}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCartFromBot(p)}
                                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition flex items-center gap-1 ${
                                      isAdded
                                        ? "bg-emerald-600 text-white"
                                        : "bg-[#FF5A2B] text-white hover:bg-[#E5481B] active:scale-95 shadow-xs"
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="h-3 w-3" />
                                        <span>Masuk!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-3 w-3" />
                                        <span>Beli</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-400 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-xs border border-stone-200 text-stone-600 text-xs flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">
                        Menganalisis indikasi &amp; mencocokkan BPOM...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Carousel */}
              <div className="px-3 py-2 bg-stone-100/90 border-t border-stone-200/80 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(qp.text)}
                    disabled={isLoading}
                    className="whitespace-nowrap rounded-xl bg-white border border-stone-200/90 px-2.5 py-1 text-[10px] font-bold text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition active:scale-95 shrink-0"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-stone-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ceritakan keluhan Anda (misal: tengkuk pegal)..."
                    disabled={isLoading}
                    className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs active:scale-95"
                    aria-label="Kirim Pesan"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                <p className="mt-1.5 text-center text-[9px] text-stone-400 flex items-center justify-center gap-1">
                  <Info className="h-2.5 w-2.5" />
                  Informasi edukasi &amp; belanja suplemen resmi BPOM RI
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
