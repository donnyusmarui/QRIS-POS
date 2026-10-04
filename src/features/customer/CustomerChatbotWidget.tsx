import { useState, useRef, useEffect, useCallback } from "react"
import { useCustomerCartStore } from "@/stores/customer-cart-store"
import type { Product } from "@/types"
import {
  X,
  Send,
  Leaf,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Bot,
  ChevronDown,
  Headset,
  CheckSquare,
  Square,
  Activity,
  User,
  Phone,
  HeartHandshake,
  Clock,
  ArrowRight,
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

interface PharmacistConfig {
  pharmacistName: string
  pharmacistTitle: string
  pharmacistAvatarUrl: string
  pharmacistStatusText: string
  leadNudgeEnabled: boolean
  leadNudgeTriggerMode: string
  leadNudgeMessageCount: number
  leadNudgeTimeMinutes: number
  leadNudgeCooldownMinutes: number
  widgetButtonText: string
  widgetPosition: "bottom_right" | "bottom_left"
  widgetOffsetY: number
  widgetOffsetX: number
}

interface SymptomOptionItem {
  id: string
  label: string
  category: string
  orderIndex: number
  isActive: boolean
  followUpQuestion?: string
  followUpOptions?: string[]
}

const SESSION_KEY = "chat_session_id"
const CUSTOMER_INFO_KEY = "chat_customer_info"
const NUDGE_DISMISS_KEY = "lead_nudge_dismissed_until"

const DEFAULT_PHARMACIST_CONFIG: PharmacistConfig = {
  pharmacistName: "Apt. Siti Rahma, S.Farm",
  pharmacistTitle: "Apoteker Pendamping Klinis",
  pharmacistAvatarUrl: "https://images.unsplash.com/photo-1594824813583-1e5f8f9e7c5b?auto=format&fit=crop&w=400&q=80",
  pharmacistStatusText: "Online • Siap Mendengarkan",
  leadNudgeEnabled: true,
  leadNudgeTriggerMode: "message_count",
  leadNudgeMessageCount: 3,
  leadNudgeTimeMinutes: 2,
  leadNudgeCooldownMinutes: 10,
  widgetButtonText: "Konsultasi Apoteker",
  widgetPosition: "bottom_right",
  widgetOffsetY: 90,
  widgetOffsetX: 24,
}

const DEFAULT_SYMPTOMS: SymptomOptionItem[] = [
  {
    id: "sym_01",
    label: "Tengkuk Kaku / Leher Tegang",
    category: "kolesterol",
    orderIndex: 1,
    isActive: true,
    followUpQuestion: "Berapa lama keluhan tengkuk kaku ini Anda rasakan?",
    followUpOptions: ["Kurang dari 3 hari", "1 - 2 minggu", "Lebih dari 1 bulan", "Tensi terakhir > 140/90"],
  },
  {
    id: "sym_02",
    label: "Pusing / Kepala Berdenyut",
    category: "hipertensi",
    orderIndex: 2,
    isActive: true,
    followUpQuestion: "Kapan pusing atau kepala berdenyut paling sering muncul?",
    followUpOptions: ["Saat bangun tidur", "Saat lelah atau stres", "Sore menjelang malam", "Disertai pandangan kabur"],
  },
  {
    id: "sym_03",
    label: "Sering Kesemutan / Kebas",
    category: "umum",
    orderIndex: 3,
    isActive: true,
    followUpQuestion: "Di bagian tubuh mana kesemutan paling dominan dirasakan?",
    followUpOptions: ["Ujung jari tangan", "Telapak kaki / tumit", "Separuh badan kiri/kanan", "Hanya saat duduk bersila"],
  },
  {
    id: "sym_04",
    label: "Nyeri Sendi / Jempol Bengkak",
    category: "asam_urat",
    orderIndex: 4,
    isActive: true,
    followUpQuestion: "Bagaimana karakteristik nyeri sendi yang Anda rasakan?",
    followUpOptions: ["Jempol kaki bengkak & merah", "Lutut ngilu / berbunyi", "Asam urat terakhir > 7.0 mg/dL", "Belum pernah cek lab"],
  },
  {
    id: "sym_05",
    label: "Sering Haus & Cepat Lapar",
    category: "diabetes",
    orderIndex: 5,
    isActive: true,
    followUpQuestion: "Apakah sudah pernah melakukan pengecekan gula darah?",
    followUpOptions: ["Gula darah puasa > 126 mg/dL", "Gula darah sewaktu > 200 mg/dL", "Ada riwayat diabetes keluarga", "Belum pernah cek lab"],
  },
  {
    id: "sym_06",
    label: "Dada Berat / Nafas Pendek",
    category: "kolesterol",
    orderIndex: 6,
    isActive: true,
    followUpQuestion: "Kapan dada terasa berat atau nafas terasa pendek?",
    followUpOptions: ["Saat jalan cepat / naik tangga", "Saat berbaring / istirahat", "Disertai keringat dingin", "Disertai jantung berdebar"],
  },
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
          <p key={pIdx} className="leading-relaxed">
            {parts.map((part, idx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={idx} className="font-semibold text-stone-900">
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return <span key={idx}>{part}</span>
            })}
          </p>
        )
      })}
    </div>
  )
}

function TypedText({ text, onDone, onTick }: { text: string; onDone: () => void; onTick: () => void }) {
  const [n, setN] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (n >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true
        onDone()
      }
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

export interface CustomerChatbotWidgetProps {
  formatRupiah: (n: number) => string
  isCartOpen?: boolean
  productToConsult?: Product | null
  customPromptOverride?: string
  onClearConsultProduct?: () => void
}

export function CustomerChatbotWidget({
  formatRupiah,
  isCartOpen = false,
  productToConsult = null,
  customPromptOverride,
  onClearConsultProduct,
}: CustomerChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>("ai")

  // Pharmacist persona & config
  const [config, setConfig] = useState<PharmacistConfig>(DEFAULT_PHARMACIST_CONFIG)

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
  const [showSoftNudge, setShowSoftNudge] = useState(false)
  const [leadNameInput, setLeadNameInput] = useState("")
  const [leadPhoneInput, setLeadPhoneInput] = useState("")
  const [nudgeNameInput, setNudgeNameInput] = useState("")
  const [nudgePhoneInput, setNudgePhoneInput] = useState("")

  // Interactive Symptom Assessment state
  const [symptomList, setSymptomList] = useState<SymptomOptionItem[]>(DEFAULT_SYMPTOMS)
  const [isTriageOpen, setIsTriageOpen] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>("")

  // Active welcome text from server
  const [serverWelcome, setServerWelcome] = useState<string>(DEFAULT_WELCOME)

  const { addToCart } = useCustomerCartStore()
  const chatOpenTimeRef = useRef<number>(Date.now())

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
  }, [messages, isOpen, isMinimized, isTyping, isTriageOpen, showOnboarding, showSoftNudge, scrollToBottom])

  // Fetch active welcome message, symptoms list, and chatbot persona config
  useEffect(() => {
    ;(async () => {
      try {
        const [wRes, cRes, sRes] = await Promise.allSettled([
          fetch("/api/welcome-message-active").then((r) => r.json()),
          fetch("/api/chatbot-config-get").then((r) => r.json()),
          fetch("/api/symptom-options-list").then((r) => r.json()),
        ])

        if (wRes.status === "fulfilled" && wRes.value?.success && wRes.value.data?.content) {
          setServerWelcome(wRes.value.data.content)
        }
        if (cRes.status === "fulfilled" && cRes.value?.success && cRes.value.data) {
          setConfig(cRes.value.data)
        }
        if (sRes.status === "fulfilled" && sRes.value?.success && Array.isArray(sRes.value.data) && sRes.value.data.length > 0) {
          setSymptomList(sRes.value.data)
        }
      } catch {
        // Fallback default
      }
    })()
  }, [])

  // Timer check for Time-based Soft Nudge trigger
  useEffect(() => {
    if (!isOpen || customerLead || !config.leadNudgeEnabled) return

    const timer = setInterval(() => {
      const mode = config.leadNudgeTriggerMode
      if (mode === "time_minutes" || mode === "both") {
        const elapsedMinutes = (Date.now() - chatOpenTimeRef.current) / 60000
        if (elapsedMinutes >= config.leadNudgeTimeMinutes) {
          const dismissedUntil = sessionStorage.getItem(NUDGE_DISMISS_KEY)
          if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
            setShowSoftNudge(true)
          }
        }
      }
    }, 15000)

    return () => clearInterval(timer)
  }, [isOpen, customerLead, config])

  // Function to evaluate message-based soft nudge
  const checkMessageCountNudge = useCallback((newUserMsgCount: number) => {
    if (customerLead || !config.leadNudgeEnabled) return
    const mode = config.leadNudgeTriggerMode
    if (mode === "message_count" || mode === "both") {
      if (newUserMsgCount >= config.leadNudgeMessageCount) {
        const dismissedUntil = sessionStorage.getItem(NUDGE_DISMISS_KEY)
        if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
          setShowSoftNudge(true)
        }
      }
    }
  }, [customerLead, config])

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
        if (!json.success || !Array.isArray(json.data?.messages)) return

        const loaded: ChatMessage[] = json.data.messages.map((m: PollMessage) => ({
          id: m.id,
          sender: m.sender === "customer" ? "user" : m.sender === "admin" ? "admin" : "bot",
          text: m.content,
          products: m.products,
          timestamp: clock(m.createdAt),
          animate: false,
        }))
        if (loaded.length > 0) {
          setMessages(loaded)
          loaded
            .filter((m) => m.sender === "admin")
            .forEach((m) => seenAdminIds.current.add(m.id))
        }
        if (json.data.status) setStatus(json.data.status)
      } catch {
        // Abaikan kegagalan jaringan awal
      }
    })()
  }, [])

  // Polling pesan baru dari admin
  useEffect(() => {
    if (!isOpen || status === "closed") return
    const sid = sessionIdRef.current
    if (!sid) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/chat-poll?sessionId=${encodeURIComponent(sid)}`)
        if (!res.ok) return
        const json = await res.json()
        if (!json.success || !Array.isArray(json.data?.messages)) return

        const freshAdmin = (json.data.messages as PollMessage[]).filter(
          (m) => m.sender === "admin" && !seenAdminIds.current.has(m.id),
        )

        if (freshAdmin.length > 0) {
          freshAdmin.forEach((m) => seenAdminIds.current.add(m.id))
          setMessages((prev) => [
            ...prev,
            ...freshAdmin.map<ChatMessage>((m) => ({
              id: m.id,
              sender: "admin",
              text: m.content,
              timestamp: clock(m.createdAt),
            })),
          ])
        }

        const next: SessionStatus = json.data.status
        if (next === "ai" && status !== "ai") {
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

    pushBot(
      `Terima kasih banyak, Kak ${name}! Senang bisa mendampingi Anda hari ini 🙏\n\nApa keluhan atau kondisi kesehatan yang sedang Anda rasakan? Kami siap mendengarkan.`,
      undefined,
      true,
    )
  }

  const handleSaveNudge = (e: React.FormEvent) => {
    e.preventDefault()
    const name = (nudgeNameInput || customerLead?.name || "").trim()
    const phone = nudgePhoneInput.trim()
    if (!name || !phone) return

    const lead: CustomerLead = { name, phone }
    setCustomerLead(lead)
    localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(lead))
    setShowSoftNudge(false)

    // Notify user via bot
    pushBot(
      `Terima kasih Kak ${name}! Riwayat konsultasi & rekomendasi resep herbal Anda telah kami amankan untuk pengiriman via WhatsApp (${phone}) 🌿 Mari kita lanjutkan ikhtiar sehat ini.`,
      undefined,
      true,
    )
  }

  const handleDismissNudge = () => {
    setShowSoftNudge(false)
    const cooldownMs = config.leadNudgeCooldownMinutes * 60 * 1000
    sessionStorage.setItem(NUDGE_DISMISS_KEY, String(Date.now() + cooldownMs))
  }

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    )
  }

  // Get active drill-down question and options from selected symptoms
  const activeSymptomWithFollowUp = symptomList.find(
    (s) => selectedSymptoms.includes(s.label) && s.followUpQuestion && s.followUpOptions && s.followUpOptions.length > 0,
  )

  const handleSendSymptoms = () => {
    if (selectedSymptoms.length === 0) return

    const parts: string[] = []
    parts.push(`Saya merasakan keluhan: ${selectedSymptoms.join(", ")}.`)
    if (selectedFollowUp) {
      parts.push(`Catatan kondisi: ${selectedFollowUp}.`)
    }
    parts.push("Mohon arahan dan edukasi seputar keluhan ini.")

    const text = parts.join(" ")
    setIsTriageOpen(false)
    setSelectedFollowUp("")
    handleSendMessage(text, selectedSymptoms)
  }

  const handleSendMessage = async (
    textToSend?: string,
    customSymptoms?: string[],
    targetProduct?: Product | null
  ) => {
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

    // Calculate user message count for nudge trigger
    const currentUserMsgs = messages.filter((m) => m.sender === "user").length + 1
    checkMessageCountNudge(currentUserMsgs)

    const activeProd = targetProduct !== undefined ? targetProduct : productToConsult

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
          source: activeProd ? "product" : "rag_main",
          productId: activeProd?.id,
          productName: activeProd?.name,
          productSku: activeProd?.sku,
          productCategory: activeProd?.category,
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

      const typingMs = Math.min(2600, 800 + String(d.reply).length * 10)
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
      pushBot("Baik, saya kembali mendampingi konsultasi Anda 🙏 Ada keluhan lain yang ingin ditanyakan?")
    } catch {
      // Abaikan
    }
  }

  const resetChat = () => {
    if (confirm("Mulai sesi konsultasi baru? Riwayat chat sebelumnya akan dibersihkan.")) {
      localStorage.removeItem(SESSION_KEY)
      sessionIdRef.current = null
      seenAdminIds.current.clear()
      setStatus("ai")
      setSelectedSymptoms([])
      setSelectedFollowUp("")
      setMessages([welcomeMessage()])
      chatOpenTimeRef.current = Date.now()
    }
  }

  const handleAddToCartFromBot = (product: Product) => {
    addToCart(product)
    setAddedProductId(product.id)
    setTimeout(() => setAddedProductId(null), 2000)
  }

  const handedOff = status === "waiting_admin" || status === "admin"

  // ── TRIGGER KONSULTASI PRODUK SPESIFIK ──
  useEffect(() => {
    if (productToConsult) {
      setIsOpen(true)
      setIsMinimized(false)
      chatOpenTimeRef.current = Date.now()
      const defaultPrompt = `Halo ${config.pharmacistName || "Apoteker"}, saya ingin konsultasi mengenai herbal *${productToConsult.name}* (SKU: ${productToConsult.sku}). Apakah herbal ini cocok untuk keluhan saya dan bagaimana dosis serta anjuran pemakaiannya?`
      const prompt = customPromptOverride
        ? customPromptOverride.replace(/{product}/gi, productToConsult.name)
        : defaultPrompt
      handleSendMessage(prompt, undefined, productToConsult)
      if (onClearConsultProduct) onClearConsultProduct()
    }
  }, [productToConsult, customPromptOverride, config.pharmacistName])

  useEffect(() => {
    const handleConsultEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ product: Product; prompt?: string }>
      const p = customEvent.detail?.product
      if (!p) return

      setIsOpen(true)
      setIsMinimized(false)
      chatOpenTimeRef.current = Date.now()
      const defaultPrompt = `Halo ${config.pharmacistName || "Apoteker"}, saya ingin konsultasi mengenai herbal *${p.name}* (SKU: ${p.sku}). Apakah herbal ini cocok untuk keluhan saya dan bagaimana dosis serta anjuran pemakaiannya?`
      const prompt = customEvent.detail?.prompt
        ? customEvent.detail.prompt.replace(/{product}/gi, p.name)
        : defaultPrompt
      handleSendMessage(prompt, undefined, p)
    }

    window.addEventListener("open-herbal-consultation", handleConsultEvent)
    return () => window.removeEventListener("open-herbal-consultation", handleConsultEvent)
  }, [config.pharmacistName])

  const isLeft = config.widgetPosition === "bottom_left"
  const bottomOffset = config.widgetOffsetY ?? 90
  const sideOffset = config.widgetOffsetX ?? 24

  return (
    <aside
      aria-label="Widget Konsultasi Herbal & Resep"
      className={`relative z-40 transition-opacity duration-200 ${
        isCartOpen ? "invisible pointer-events-none opacity-0" : "visible opacity-100"
      }`}
    >
      {/* ── FLOATING TRIGGER BUTTON ── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
            chatOpenTimeRef.current = Date.now()
            if (!customerLead) setShowOnboarding(true)
          }}
          style={{
            bottom: `${bottomOffset}px`,
            [isLeft ? "left" : "right"]: `${sideOffset}px`,
          }}
          className="fixed z-40 flex items-center gap-2.5 rounded-full bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 px-4 py-3.5 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ring-2 ring-emerald-600/30 group cursor-pointer"
          aria-label={config.widgetButtonText || "Konsultasi Apoteker"}
        >
          <div className="relative">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/20 ring-1 ring-white/40 flex items-center justify-center">
              {config.pharmacistAvatarUrl ? (
                <img src={config.pharmacistAvatarUrl} alt={config.pharmacistName} className="h-full w-full object-cover" />
              ) : (
                <Leaf className="h-5 w-5 text-emerald-100" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-800" />
          </div>
          <div className="text-left hidden sm:block pr-1">
            <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>{config.widgetButtonText || "Konsultasi Apoteker"}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </p>
            <p className="text-[10px] text-emerald-200">{config.pharmacistName}</p>
          </div>
        </button>
      )}

      {/* ── CHAT WINDOW CONTAINER ── */}
      {isOpen && (
        <div
          role="region"
          aria-label="Jendela Chatbot Herbal"
          style={
            isMinimized
              ? {
                  bottom: `${bottomOffset}px`,
                  [isLeft ? "left" : "right"]: `${sideOffset}px`,
                }
              : undefined
          }
          className={`fixed z-40 transition-all duration-300 ${
            isMinimized
              ? "w-80 rounded-2xl bg-white shadow-xl border border-stone-200 overflow-hidden"
              : `inset-x-2 bottom-2 sm:inset-x-auto ${
                  isLeft ? "sm:left-6" : "sm:right-6"
                } sm:bottom-6 sm:w-[460px] max-h-[90vh] sm:max-h-[680px] h-[85vh] sm:h-[640px] rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col overflow-hidden ring-1 ring-black/5`
          }`}
        >
          {/* Header */}
          <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 p-3.5 sm:p-4 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white overflow-hidden shrink-0 ring-1 ring-white/30">
                {config.pharmacistAvatarUrl ? (
                  <img src={config.pharmacistAvatarUrl} alt={config.pharmacistName} className="h-full w-full object-cover" />
                ) : (
                  <Leaf className="h-5 w-5 text-emerald-200" />
                )}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-800" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5 truncate">
                  <span className="truncate">{status === "admin" ? "Admin Apotek (Live)" : config.pharmacistName}</span>
                  {customerLead?.name && (
                    <span className="text-[10px] font-normal text-emerald-200 bg-white/15 px-1.5 py-0.5 rounded-md shrink-0">
                      Kak {customerLead.name}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1 truncate">
                  <ShieldCheck className="h-3 w-3 text-emerald-300 shrink-0" />
                  <span className="truncate">
                    {status === "admin"
                      ? "Terhubung dengan admin"
                      : status === "waiting_admin"
                        ? "Menunggu respon admin..."
                        : isTyping
                          ? "sedang meracik jawaban..."
                          : config.pharmacistStatusText}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-100 shrink-0">
              <button
                type="button"
                onClick={resetChat}
                title="Mulai percakapan baru"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Perbesar" : "Kecilkan"}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <ChevronDown className={`h-4 w-4 transform transition-transform ${isMinimized ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
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
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                  >
                    Lanjut dengan AI
                  </button>
                </div>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/60 relative">
                {/* ── MODUL 1: SOFT LEAD-CAPTURE NUDGE BANNER ── */}
                {showSoftNudge && !customerLead && (
                  <div className="rounded-2xl border border-amber-300 bg-linear-to-b from-amber-50 to-orange-50/60 p-4 text-xs space-y-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300 sticky top-0 z-20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-amber-950 font-bold">
                        <HeartHandshake className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span className="leading-snug">Ingin Rangkuman Resep Herbal Ini Dikirimkan ke Anda?</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDismissNudge}
                        className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer shrink-0"
                        title="Tutup"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      Simpan riwayat konsultasi Anda agar kami dapat mengirimkan salinan rekomendasi herbal, dosis aman, dan panduan pola makan personal langsung ke WhatsApp Anda tanpa biaya.
                    </p>
                    <form onSubmit={handleSaveNudge} className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="text"
                            required
                            value={nudgeNameInput}
                            onChange={(e) => setNudgeNameInput(e.target.value)}
                            placeholder="Nama Anda"
                            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="tel"
                            required
                            value={nudgePhoneInput}
                            onChange={(e) => setNudgePhoneInput(e.target.value)}
                            placeholder="No. WhatsApp (08xxx)"
                            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-xl transition shadow-xs text-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Simpan Rekap Konsultasi Saya</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDismissNudge}
                          className="text-stone-600 hover:text-stone-800 text-xs px-2 py-2 cursor-pointer font-medium"
                        >
                          Nanti Saja
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Onboarding Lead Capture Card (Tampil di awal jika belum ada identitas) */}
                {showOnboarding && !customerLead && !showSoftNudge && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs space-y-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>Perkenalan Singkat Konsultasi</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOnboarding(false)}
                        className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                        title="Lewati"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      Untuk kenyamanan konsultasi, pencatatan riwayat kesehatan, dan kemudahan pengiriman rekomendasi resep personal, mohon perkenalkan diri Anda:
                    </p>
                    <form onSubmit={handleSaveLead} className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="text"
                            required
                            value={leadNameInput}
                            onChange={(e) => setLeadNameInput(e.target.value)}
                            placeholder="Nama Lengkap / Panggilan"
                            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="tel"
                            value={leadPhoneInput}
                            onChange={(e) => setLeadPhoneInput(e.target.value)}
                            placeholder="No. WhatsApp (opsional)"
                            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-3 rounded-xl transition shadow-xs text-xs active:scale-95 cursor-pointer"
                        >
                          Mulai Konsultasi Sehat
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOnboarding(false)}
                          className="text-stone-500 hover:text-stone-700 text-xs px-2 py-2 cursor-pointer"
                        >
                          Nanti saja
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Render Messages */}
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                    {/* Header nama pengirim bot / admin */}
                    {m.sender === "bot" && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <div className="h-4 w-4 rounded-full overflow-hidden bg-emerald-100 shrink-0">
                          {config.pharmacistAvatarUrl ? (
                            <img src={config.pharmacistAvatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Bot className="h-3 w-3 text-emerald-700 m-0.5" />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-800">
                          {config.pharmacistName}
                        </span>
                      </div>
                    )}
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
                                    className={`shrink-0 min-h-[36px] rounded-lg px-3 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                                      isAdded
                                        ? "bg-emerald-600 text-white"
                                        : "bg-[#FF5A2B] text-white hover:bg-[#E5481B] active:scale-95 shadow-xs"
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="h-3 w-3" />
                                        <span>Masuk</span>
                                      </>
                                    ) : (
                                      <span>+ Beli</span>
                                    )}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="mt-1 px-1 text-[9px] text-stone-400">{m.timestamp}</span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full overflow-hidden bg-emerald-100 shrink-0">
                      {config.pharmacistAvatarUrl ? (
                        <img src={config.pharmacistAvatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-emerald-700 m-1" />
                      )}
                    </div>
                    <div
                      className="rounded-2xl rounded-bl-none bg-white px-3.5 py-3 shadow-xs border border-stone-200 flex items-center gap-1.5"
                      role="status"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── INTERACTIVE SYMPTOM ASSESSMENT DRAWER (MODUL 2 & 3) ── */}
              {isTriageOpen && (
                <div className="border-t border-emerald-100 bg-emerald-50/90 p-3.5 text-xs space-y-3 max-h-64 overflow-y-auto shrink-0 shadow-inner">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-emerald-700" />
                      Pilih Gejala yang Dirasakan (Bisa &gt; 1):
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsTriageOpen(false)}
                      className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Multi-Select Symptom Chips */}
                  <div className="grid grid-cols-2 gap-2">
                    {symptomList.map((item) => {
                      const active = selectedSymptoms.includes(item.label)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleSymptom(item.label)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl border text-left text-[11px] transition cursor-pointer ${
                            active
                              ? "border-emerald-600 bg-emerald-100/90 text-emerald-900 font-bold shadow-xs"
                              : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300"
                          }`}
                        >
                          {active ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="line-clamp-1">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Dynamic Follow-Up Single-Choice Radio */}
                  {selectedSymptoms.length > 0 && activeSymptomWithFollowUp && (
                    <div className="space-y-1.5 pt-2 border-t border-emerald-200/60 animate-in fade-in duration-200">
                      <p className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-700" />
                        {activeSymptomWithFollowUp.followUpQuestion}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSymptomWithFollowUp.followUpOptions?.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => setSelectedFollowUp(opt)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                              selectedFollowUp === opt
                                ? "bg-emerald-700 text-white border-emerald-700"
                                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tombol Kirim Keluhan */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={selectedSymptoms.length === 0}
                      onClick={handleSendSymptoms}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-xl transition shadow-xs text-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Kirim Keluhan Terpilih ({selectedSymptoms.length})</span>
                      <Send className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSymptoms([])
                        setSelectedFollowUp("")
                        setIsTriageOpen(false)
                      }}
                      className="text-stone-500 hover:text-stone-700 text-xs px-2 py-1.5 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Prompts Bar */}
              {!isTriageOpen && (
                <div className="px-3.5 py-2 border-t border-stone-100 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTriageOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0 transition active:scale-95 cursor-pointer border border-emerald-300"
                  >
                    <Activity className="h-3 w-3 text-emerald-700" />
                    <span>Cek Gejala Interaktif</span>
                  </button>
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(p.text)}
                      className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium shrink-0 transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 border-t border-stone-200 bg-white flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ketik keluhan atau pertanyaan Anda di sini..."
                  className="flex-1 bg-stone-100 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-emerald-600 focus:bg-white transition"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white p-2.5 rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
                  title="Kirim Pesan"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
