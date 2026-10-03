import { useState, useRef, useEffect, useCallback } from "react"
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
  Headset,
} from "lucide-react"

type SessionStatus = "ai" | "waiting_admin" | "admin" | "closed"

interface ChatMessage {
  id: string
  sender: "user" | "bot" | "admin"
  text: string
  products?: Product[]
  timestamp: string
  animate?: boolean // true = sedang "diketik" (efek mengetik), produk tampil setelah selesai
}

interface PollMessage {
  id: string
  sender: "customer" | "bot" | "admin"
  content: string
  products?: Product[]
  createdAt: string
}

const SESSION_KEY = "chat_session_id"

const QUICK_PROMPTS = [
  { label: "ðŸ¥© Tengkuk Tegang", text: "Akhir-akhir ini tengkuk saya sering terasa kaku dan berat." },
  { label: "ðŸ¦µ Nyeri Sendi", text: "Jempol kaki dan lutut saya sering bengkak dan ngilu." },
  { label: "â„ï¸ Kesemutan", text: "Tangan dan kaki saya sering kesemutan dan ujung jari terasa dingin." },
  { label: "ðŸ©¸ Gampang Lemas", text: "Badan saya gampang lemas dan sering haus akhir-akhir ini." },
  { label: "ðŸ’“ Sering Pusing", text: "Kepala saya sering pusing berdenyut dan tensi saya agak tinggi." },
]

const clock = (iso?: string) =>
  new Date(iso || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

const WELCOME_TEXT =
  "Halo, selamat datang! ðŸ‘‹ Senang sekali Anda mampir.\n\nBoleh saya tahu, apa kabar Anda hari ini? Kalau ada yang sedang mengganjal atau ingin Anda ceritakan soal kesehatan, saya siap mendengarkan ðŸ˜Š"

// Render markdown ringan: ### heading, â€¢ bullet, **tebal**
function RichText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap space-y-1.5">
      {text.split("\n\n").map((paragraph, pIdx) => {
        if (paragraph.startsWith("### ")) {
          return (
            <h4 key={pIdx} className="font-semibold text-stone-900 mt-2 text-xs leading-snug">
              {paragraph.replace("### ", "")}
            </h4>
          )
        }
        const parts = paragraph.split(/(\*\*.*?\*\*)/g)
        return (
          <p
            key={pIdx}
            className={`font-normal text-stone-700 leading-relaxed [text-wrap:pretty] ${paragraph.startsWith("â€¢ ") ? "pl-2" : ""}`}
          >
            {parts.map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={i} className="font-semibold text-stone-900">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              ),
            )}
          </p>
        )
      })}
    </div>
  )
}

// Efek ketikan bertahap; memanggil onDone saat seluruh teks sudah tampil
function TypedText({ text, onTick, onDone }: { text: string; onTick: () => void; onDone: () => void }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (n >= text.length) {
      onDone()
      return
    }
    const t = setTimeout(() => {
      setN((v) => Math.min(text.length, v + 2))
      onTick()
    }, 16)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, text])

  return <RichText text={text.slice(0, n)} />
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div
        className="rounded-2xl rounded-bl-none bg-white px-3.5 py-3 shadow-xs border border-stone-200 flex items-center gap-1.5"
        role="status"
        aria-label="Asisten sedang mengetik"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  )
}

export function CustomerChatbotWidget({
  formatRupiah,
}: {
  formatRupiah: (n: number) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false) // indikator "sedang mengetik"
  const [addedProductId, setAddedProductId] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>("ai")

  const { addToCart } = useCustomerCartStore()

  const welcomeMessage = (): ChatMessage => ({
    id: `welcome-${Date.now()}`,
    sender: "bot",
    text: WELCOME_TEXT,
    timestamp: clock(),
  })

  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()])
  const sessionIdRef = useRef<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null,
  )
  const seenAdminIds = useRef<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [])

  useEffect(() => {
    if (isOpen && !isMinimized) scrollToBottom()
  }, [messages, isOpen, isMinimized, isTyping, scrollToBottom])

  // Pulihkan percakapan sebelumnya bila sesi masih tersimpan
  useEffect(() => {
    const sid = sessionIdRef.current
    if (!sid) return
    ;(async () => {
      try {
        const res = await fetch(`/api/chat-poll?sessionId=${encodeURIComponent(sid)}`)
        if (res.status === 404) {
          localStorage.removeItem(SESSION_KEY)
          sessionIdRef.current = null
          return
        }
        const json = await res.json()
        if (!json.success) return
        const restored: PollMessage[] = json.data.messages || []
        restored.forEach((m) => m.sender === "admin" && seenAdminIds.current.add(m.id))
        if (restored.length > 0) {
          setMessages([
            welcomeMessage(),
            ...restored.map<ChatMessage>((m) => ({
              id: m.id,
              sender: m.sender === "customer" ? "user" : m.sender,
              text: m.content,
              products: m.products,
              timestamp: clock(m.createdAt),
            })),
          ])
        }
        setStatus(json.data.status)
      } catch {
        // abaikan: mulai percakapan baru
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling balasan admin selama sesi diserahkan ke manusia
  useEffect(() => {
    if (!isOpen || (status !== "waiting_admin" && status !== "admin")) return
    const sid = sessionIdRef.current
    if (!sid) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/chat-poll?sessionId=${encodeURIComponent(sid)}`)
        const json = await res.json()
        if (!json.success) return
        const incoming: PollMessage[] = json.data.messages || []

        const fresh = incoming.filter((m) => m.sender === "admin" && !seenAdminIds.current.has(m.id))
        fresh.forEach((m) => seenAdminIds.current.add(m.id))
        if (fresh.length > 0) {
          setMessages((prev) => [
            ...prev,
            ...fresh.map<ChatMessage>((m) => ({
              id: m.id,
              sender: "admin",
              text: m.content,
              timestamp: clock(m.createdAt),
            })),
          ])
        }

        const next: SessionStatus = json.data.status
        if (next === "ai") {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-back-${Date.now()}`,
              sender: "bot",
              text: "Terima kasih sudah menunggu ðŸ™ Saya kembali mendampingi Anda ya. Silakan lanjutkan ceritanya.",
              timestamp: clock(),
            },
          ])
        }
        if (next !== status) setStatus(next)
      } catch {
        // koneksi sesaat putus; coba lagi di siklus berikut
      }
    }

    const timer = setInterval(poll, 4000)
    return () => clearInterval(timer)
  }, [isOpen, status])

  const pushBot = (text: string, products?: Product[], animate = true) => {
    setMessages((prev) => [
      ...prev,
      { id: `bot-${Date.now()}-${prev.length}`, sender: "bot", text, products, timestamp: clock(), animate },
    ])
  }

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim()
    if (!message || isTyping) return

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: "user", text: message, timestamp: clock() },
    ])
    setInputMessage("")

    const handedOff = status === "waiting_admin" || status === "admin"
    if (!handedOff) setIsTyping(true)
    const startedAt = Date.now()

    try {
      const res = await fetch("/api/consultation-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message }),
      })
      const json = await res.json()

      if (!json.success || !json.data) throw new Error(json.error || "Gagal memproses")
      const d = json.data

      if (d.sessionId && d.sessionId !== sessionIdRef.current) {
        sessionIdRef.current = d.sessionId
        localStorage.setItem(SESSION_KEY, d.sessionId)
      }
      if (d.status) setStatus(d.status)

      // Sudah di tangan admin: pesan tersimpan, tidak ada balasan bot
      if (!d.reply) {
        return
      }

      // Jeda "mengetik" seperti manusia: makin panjang balasan, makin lama
      const typingMs = Math.min(2800, 900 + String(d.reply).length * 12)
      const wait = Math.max(0, typingMs - (Date.now() - startedAt))
      await new Promise((r) => setTimeout(r, wait))

      pushBot(d.reply, d.recommendedProducts || [])
    } catch (err) {
      console.error("Consultation fetch error:", err)
      pushBot(
        "Maaf, koneksi saya sedang kurang stabil ðŸ™ Boleh coba kirim ulang pesan Anda sebentar lagi?",
        undefined,
        false,
      )
    } finally {
      setIsTyping(false)
    }
  }

  const finishTyping = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id && m.animate ? { ...m, animate: false } : m)))
  }

  const resumeAi = async () => {
    const sid = sessionIdRef.current
    if (!sid) return
    try {
      await fetch("/api/consultation-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, action: "resume_ai" }),
      })
      setStatus("ai")
      pushBot("Baik, saya kembali mendampingi Anda ya ðŸ˜Š Silakan lanjutkan ceritanya.")
    } catch {
      // biarkan status apa adanya
    }
  }

  const handleAddToCartFromBot = (product: Product) => {
    addToCart(product)
    setAddedProductId(product.id)
    setTimeout(() => setAddedProductId(null), 2000)
  }

  const resetChat = () => {
    localStorage.removeItem(SESSION_KEY)
    sessionIdRef.current = null
    seenAdminIds.current = new Set()
    setStatus("ai")
    setIsTyping(false)
    setMessages([welcomeMessage()])
  }

  const handedOff = status === "waiting_admin" || status === "admin"

  return (
    <>
      {/* â”€â”€ FLOATING TRIGGER BUTTON â”€â”€ */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 animate-in fade-in zoom-in duration-300">
          <div className="relative group">
            <div className="hidden sm:flex absolute -top-10 right-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg pointer-events-none opacity-90 group-hover:opacity-100 transition">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Ngobrol soal kesehatan Anda</span>
              <div className="absolute -bottom-1 right-6 h-2 w-2 rotate-45 bg-stone-900" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(true)
                setIsMinimized(false)
              }}
              className="relative flex items-center gap-2.5 rounded-full bg-linear-to-r from-emerald-700 to-teal-800 px-4 sm:px-5 py-3 text-white shadow-xl shadow-emerald-800/30 ring-2 ring-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Buka konsultasi kesehatan"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                <Bot className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
                </span>
              </div>
              <div className="text-left pr-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200 leading-none">
                  Asisten Kesehatan
                </p>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">Konsultasi ðŸŒ¿</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ CHAT WINDOW â”€â”€ */}
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
                {handedOff ? <Headset className="h-5 w-5 text-emerald-100" /> : <Leaf className="h-5 w-5 text-emerald-200" />}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-800" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {status === "admin" ? "Admin Apotek" : "Asisten Kesehatan"}
                </h3>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-300" />
                  {status === "admin"
                    ? "Terhubung dengan admin"
                    : status === "waiting_admin"
                      ? "Menunggu admin membalas"
                      : isTyping
                        ? "sedang mengetik..."
                        : "Online"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-100">
              <button
                type="button"
                onClick={resetChat}
                title="Mulai percakapan baru"
                className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Perbesar" : "Kecilkan"}
                className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <ChevronDown className={`h-4 w-4 transform transition-transform ${isMinimized ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isMinimized ? (
            <div
              onClick={() => setIsMinimized(false)}
              className="p-3 cursor-pointer flex items-center justify-between text-xs text-stone-600 font-medium hover:bg-stone-50"
            >
              <span className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-emerald-600" />
                Lanjutkan percakapan...
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Buka</span>
            </div>
          ) : (
            <>
              {/* Banner serah-terima ke admin */}
              {handedOff && (
                <div className="shrink-0 flex items-center justify-between gap-2 bg-amber-50 border-b border-amber-200/70 px-3.5 py-2 text-[11px] text-amber-900">
                  <span className="flex items-center gap-1.5 leading-snug">
                    <Headset className="h-3.5 w-3.5 shrink-0" />
                    {status === "admin" ? "Admin sedang membantu Anda." : "Percakapan diteruskan ke admin. Mohon tunggu sebentar."}
                  </span>
                  <button
                    type="button"
                    onClick={resumeAi}
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 transition"
                  >
                    Lanjut dengan AI
                  </button>
                </div>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/60">
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                    {m.sender === "admin" && (
                      <span className="mb-1 px-1 text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                        <Headset className="h-3 w-3" /> Admin
                      </span>
                    )}
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                        m.sender === "user"
                          ? "bg-emerald-700 text-white rounded-br-none"
                          : m.sender === "admin"
                            ? "bg-amber-50 text-stone-800 border border-amber-200/80 rounded-bl-none"
                            : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-none"
                      }`}
                    >
                      {m.sender === "user" ? (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      ) : m.animate ? (
                        <TypedText text={m.text} onTick={scrollToBottom} onDone={() => finishTyping(m.id)} />
                      ) : (
                        <RichText text={m.text} />
                      )}

                      {/* Kartu produk (hanya setelah teks selesai diketik) */}
                      {!m.animate && m.products && m.products.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-stone-200/80 space-y-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Rekomendasi untuk Anda
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
                                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-emerald-700">
                                        <Leaf className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs truncate text-stone-900">{p.name}</p>
                                    <p className="text-xs text-emerald-700 font-semibold tabular-nums">
                                      {formatRupiah(p.price)}
                                    </p>
                                    <p className="text-[10px] text-stone-500 truncate">
                                      {p.sku} â€¢ {p.category}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCartFromBot(p)}
                                    className={`shrink-0 min-h-[36px] rounded-lg px-3 text-[11px] font-semibold transition flex items-center gap-1 ${
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
                    <span className="text-[10px] text-stone-400 mt-1 px-1">{m.timestamp}</span>
                  </div>
                ))}

                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts: hanya saat percakapan baru dimulai */}
              {messages.length <= 1 && !handedOff && (
                <div className="px-3 py-2 bg-stone-100/90 border-t border-stone-200/80 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(qp.text)}
                      disabled={isTyping}
                      className="whitespace-nowrap rounded-xl bg-white border border-stone-200/90 px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition active:scale-95 shrink-0"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              )}

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
                    placeholder={handedOff ? "Tulis pesan untuk admin..." : "Ketik pesan Anda..."}
                    disabled={isTyping}
                    className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs active:scale-95"
                    aria-label="Kirim Pesan"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                <p className="mt-1.5 text-center text-[10px] text-stone-400 flex items-center justify-center gap-1">
                  <Info className="h-2.5 w-2.5" />
                  Informasi edukasi, bukan pengganti saran dokter
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
