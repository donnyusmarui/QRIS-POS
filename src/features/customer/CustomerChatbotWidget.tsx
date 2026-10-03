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
  ChevronUp,
  Info,
  Headset,
  CheckSquare,
  Square,
  Activity,
  User,
  Phone,
} from "lucide-react"

type SessionStatus = "ai" | "waiting_admin" | "admin" | "closed"

interface ChatMessage {
  id: string
  sender: "user" | "bot" | "admin"
  text: string
  products?: Product[]
  timestamp: string
  animate?: boolean
}

interface PollMessage {
  id: string
  sender: "customer" | "bot" | "admin"
  content: string
  products?: Product[]
  createdAt: string
}

interface CustomerLead {
  name: string
  phone: string
}

const SESSION_KEY = "chat_session_id"
const CUSTOMER_INFO_KEY = "chat_customer_info"

const SYMPTOM_OPTIONS = [
  { id: "tengkuk", label: "Tengkuk Kaku / Pegal" },
  { id: "pusing", label: "Pusing / Berdenyut" },
  { id: "kesemutan", label: "Sering Kesemutan / Kebas" },
  { id: "sendi", label: "Nyeri Sendi / Jempol Bengkak" },
  { id: "gula", label: "Sering Haus & Cepat Lapar" },
  { id: "tensi", label: "Riwayat Tensi Tinggi" },
]

const DURATION_OPTIONS = [
  { id: "under_3d", label: "Kurang dari 3 hari" },
  { id: "1_2w", label: "1 - 2 minggu" },
  { id: "over_1m", label: "Lebih dari 1 bulan" },
]

const LAB_OPTIONS = [
  { id: "kolesterol", label: "Kolesterol > 200" },
  { id: "tensi", label: "Tensi > 140/90" },
  { id: "asam_urat", label: "Asam Urat Tinggi" },
  { id: "belum_cek", label: "Belum pernah cek lab" },
]

const QUICK_PROMPTS = [
  { label: "Tengkuk Tegang", text: "Akhir-akhir ini tengkuk saya sering terasa kaku dan berat." },
  { label: "Nyeri Sendi", text: "Jempol kaki dan lutut saya sering bengkak dan ngilu." },
  { label: "Kesemutan", text: "Tangan dan kaki saya sering kesemutan dan ujung jari terasa dingin." },
  { label: "Gampang Lemas", text: "Badan saya gampang lemas dan sering haus akhir-akhir ini." },
  { label: "Sering Pusing", text: "Kepala saya sering pusing berdenyut dan tensi saya agak tinggi." },
]

const clock = (iso?: string) =>
  new Date(iso || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

const DEFAULT_WELCOME =
  "Halo, selamat datang di Apotek Herbal Medika! Senang sekali Anda mampir 🙏 Boleh saya tahu apa kabar Anda hari ini? Kalau ada keluhan kesehatan atau gejala yang sedang dirasakan, saya siap mendengarkan dan membantu dengan senang hati 😊"

// Render markdown ringan: ### heading, • bullet, **tebal**
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
            className={`font-normal text-stone-700 leading-relaxed [text-wrap:pretty] ${paragraph.startsWith("• ") ? "pl-2" : ""}`}
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
  }, [n, text, onDone, onTick])

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
  const [isTyping, setIsTyping] = useState(false)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>("ai")

  // Lead capture state
  const [customerLead, setCustomerLead] = useState<CustomerLead | null>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_INFO_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [leadNameInput, setLeadNameInput] = useState("")
  const [leadPhoneInput, setLeadPhoneInput] = useState("")

  // Interactive Symptom Assessment state
  const [isTriageOpen, setIsTriageOpen] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedDuration, setSelectedDuration] = useState<string>("")
  const [selectedLab, setSelectedLab] = useState<string>("")

  // Active welcome text from server
  const [serverWelcome, setServerWelcome] = useState<string>(DEFAULT_WELCOME)

  const { addToCart } = useCustomerCartStore()

  // Format dynamic welcome text
  const getWelcomeContent = useCallback(() => {
    if (customerLead?.name) {
      return serverWelcome.replace(/\{\{name\}\}/gi, customerLead.name)
    }
    return serverWelcome.replace(/Kak\s*\{\{name\}\},?\s*/gi, "").replace(/\{\{name\}\}/gi, "")
  }, [customerLead, serverWelcome])

  const welcomeMessage = useCallback((): ChatMessage => ({
    id: `welcome-${Date.now()}`,
    sender: "bot",
    text: getWelcomeContent(),
    timestamp: clock(),
  }), [getWelcomeContent])

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
  }, [messages, isOpen, isMinimized, isTyping, isTriageOpen, showOnboarding, scrollToBottom])

  // Fetch active welcome message from server
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/welcome-message-active")
        const json = await res.json()
        if (json.success && json.data?.content) {
          setServerWelcome(json.data.content)
        }
      } catch {
        // Fallback default
      }
    })()
  }, [])

  // Prompt onboarding if lead is not yet captured
  useEffect(() => {
    if (isOpen && !customerLead) {
      setShowOnboarding(true)
    }
  }, [isOpen, customerLead])

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
  }, [welcomeMessage])

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
              text: "Terima kasih sudah menunggu 🙏 Saya kembali mendampingi Anda ya. Silakan lanjutkan ceritanya.",
              timestamp: clock(),
            },
          ])
        }
        if (next !== status) setStatus(next)
      } catch {
        // koneksi sesaat putus
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

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault()
    const name = leadNameInput.trim()
    const phone = leadPhoneInput.trim()
    if (!name) return

    const lead: CustomerLead = { name, phone }
    setCustomerLead(lead)
    localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(lead))
    setShowOnboarding(false)

    // Sapa dengan hangat secara personal
    pushBot(
      `Terima kasih banyak, Kak ${name}! Senang bisa mendampingi Anda hari ini 🙏\n\nApa keluhan atau kondisi kesehatan yang sedang Anda rasakan? Kami siap mendengarkan.`,
      undefined,
      true
    )
  }

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    )
  }

  const handleSendSymptoms = () => {
    if (selectedSymptoms.length === 0) return

    const parts: string[] = []
    parts.push(`Saya merasakan keluhan: ${selectedSymptoms.join(", ")}.`)
    if (selectedDuration) {
      const durObj = DURATION_OPTIONS.find((d) => d.id === selectedDuration)
      if (durObj) parts.push(`Durasi keluhan: ${durObj.label}.`)
    }
    if (selectedLab) {
      const labObj = LAB_OPTIONS.find((l) => l.id === selectedLab)
      if (labObj) parts.push(`Hasil cek/kondisi: ${labObj.label}.`)
    }
    parts.push("Mohon rekomendasi herbal berizin resmi BPOM yang sesuai.")

    const text = parts.join(" ")
    setIsTriageOpen(false)
    handleSendMessage(text, selectedSymptoms)
  }

  const handleSendMessage = async (textToSend?: string, customSymptoms?: string[]) => {
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
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message,
          customerName: customerLead?.name || undefined,
          customerPhone: customerLead?.phone || undefined,
          symptoms: customSymptoms || (selectedSymptoms.length > 0 ? selectedSymptoms : undefined),
        }),
      })
      const json = await res.json()

      if (!json.success || !json.data) throw new Error(json.error || "Gagal memproses")
      const d = json.data

      if (d.sessionId && d.sessionId !== sessionIdRef.current) {
        sessionIdRef.current = d.sessionId
        localStorage.setItem(SESSION_KEY, d.sessionId)
      }
      if (d.status) setStatus(d.status)

      if (!d.reply) return

      const typingMs = Math.min(2800, 900 + String(d.reply).length * 12)
      const wait = Math.max(0, typingMs - (Date.now() - startedAt))
      await new Promise((r) => setTimeout(r, wait))

      pushBot(d.reply, d.recommendedProducts || [])
    } catch (err) {
      console.error("Consultation fetch error:", err)
      pushBot(
        "Maaf, koneksi saya sedang kurang stabil 🙏 Boleh coba kirim ulang pesan Anda sebentar lagi?",
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
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ sessionId: sid, action: "resume_ai" }),
      })
      setStatus("ai")
      pushBot("Baik, saya kembali mendampingi Anda ya 😊 Silakan lanjutkan ceritanya.")
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
    setSelectedSymptoms([])
    setSelectedDuration("")
    setSelectedLab("")
    setMessages([welcomeMessage()])
  }

  const handedOff = status === "waiting_admin" || status === "admin"

  return (
    <>
      {/* ── FLOATING TRIGGER BUTTON ── */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 animate-in fade-in zoom-in duration-300">
          <div className="relative group">
            <div className="hidden sm:flex absolute -top-10 right-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg pointer-events-none opacity-90 group-hover:opacity-100 transition">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Tanya Apoteker Herbal AI</span>
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
                  Asisten Apotek
                </p>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">Konsultasi Herbal 🌿</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── CHAT WINDOW ── */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out ${
            isMinimized
              ? "bottom-4 right-4 sm:right-6 w-72 rounded-2xl bg-white shadow-2xl border border-stone-200"
              : "inset-x-2 bottom-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[450px] max-h-[88vh] sm:max-h-[660px] h-[82vh] sm:h-[620px] rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col overflow-hidden ring-1 ring-black/5"
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
                <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                  {status === "admin" ? "Apoteker / Admin Apotek" : "Asisten Kesehatan Herbal"}
                  {customerLead?.name && (
                    <span className="text-[11px] font-normal text-emerald-200 bg-white/10 px-1.5 py-0.5 rounded-md">
                      Kak {customerLead.name}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-300" />
                  {status === "admin"
                    ? "Terhubung dengan admin"
                    : status === "waiting_admin"
                      ? "Menunggu respon admin..."
                      : isTyping
                        ? "sedang mengetik..."
                        : "Resmi BPOM & Halal"}
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
                {/* Onboarding Lead Capture Card (Tampil jika belum isi identitas) */}
                {showOnboarding && !customerLead && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs space-y-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>Perkenalan Singkat Konsultasi</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOnboarding(false)}
                        className="text-stone-400 hover:text-stone-600 p-0.5"
                        title="Lewati"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                      Untuk kenyamanan konsultasi, pencatatan riwayat kesehatan, dan kemudahan pengiriman rekomendasi resep personal, mohon perkenalkan diri Anda:
                    </p>
                    <form onSubmit={handleSaveLead} className="space-y-2">
                      <div>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="text"
                            required
                            value={leadNameInput}
                            onChange={(e) => setLeadNameInput(e.target.value)}
                            placeholder="Nama Lengkap / Panggilan"
                            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="tel"
                            value={leadPhoneInput}
                            onChange={(e) => setLeadPhoneInput(e.target.value)}
                            placeholder="No. WhatsApp Aktif (08xxx)"
                            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-3 rounded-xl transition shadow-xs text-xs active:scale-95"
                        >
                          Mulai Konsultasi Sehat
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOnboarding(false)}
                          className="text-stone-500 hover:text-stone-700 text-xs px-2 py-2"
                        >
                          Nanti saja
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                    {m.sender === "admin" && (
                      <span className="mb-1 px-1 text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                        <Headset className="h-3 w-3" /> Admin Apotek
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
                            Rekomendasi Terkurasi BPOM
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
                                      {p.sku} • {p.category}
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

              {/* ── MODUL 3: INTERACTIVE SYMPTOM ASSESSMENT DRAWER ── */}
              {isTriageOpen && (
                <div className="border-t border-emerald-200 bg-emerald-50/90 p-3.5 space-y-3 animate-in slide-in-from-bottom-2 duration-200 shrink-0 max-h-[260px] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-emerald-700" />
                      Pilih Gejala yang Dirasakan (Bisa &gt; 1)
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsTriageOpen(false)}
                      className="text-stone-400 hover:text-stone-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Checklist Buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {SYMPTOM_OPTIONS.map((sym) => {
                      const isChecked = selectedSymptoms.includes(sym.label)
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => toggleSymptom(sym.label)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left text-[11px] transition ${
                            isChecked
                              ? "bg-emerald-700 border-emerald-800 text-white font-semibold shadow-xs"
                              : "bg-white border-stone-200 text-stone-700 hover:border-emerald-300"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-white" />
                          ) : (
                            <Square className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                          )}
                          <span className="truncate">{sym.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Follow-up Drill-Down (Jika sudah ada gejala yang dicentang) */}
                  {selectedSymptoms.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200/80 space-y-2.5">
                      <div>
                        <p className="text-[10px] font-semibold text-stone-600 mb-1">Durasi Keluhan:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DURATION_OPTIONS.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setSelectedDuration(d.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition ${
                                selectedDuration === d.id
                                  ? "bg-teal-700 border-teal-800 text-white"
                                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold text-stone-600 mb-1">Riwayat Pemeriksaan Terakhir:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {LAB_OPTIONS.map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setSelectedLab(l.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition ${
                                selectedLab === l.id
                                  ? "bg-teal-700 border-teal-800 text-white"
                                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                              }`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendSymptoms}
                        className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Kirim Keluhan Terpilih (Tanpa Ketik)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Triage Trigger Pill & Quick Prompts Bar */}
              <div className="px-3 py-2 bg-stone-100/90 border-t border-stone-200/80 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTriageOpen(!isTriageOpen)}
                  className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0 ${
                    isTriageOpen
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Cek Gejala (Checklist)</span>
                  {isTriageOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </button>

                {messages.length <= 2 && !handedOff && (
                  <>
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
                  </>
                )}
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
                  Informasi edukasi, bukan pengganti saran medis dokter
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
