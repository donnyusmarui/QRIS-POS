import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import type { AiProvider } from "@/types"
import {
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Cpu,
  Save,
  Pencil,
  Trash2,
  Plus,
  Power,
  MessageSquare,
  Database,
  Search,
  RefreshCw,
  Check,
  ListChecks,
  User,
  HeartHandshake,
  Activity,
} from "lucide-react"

interface SavedModel {
  id: string
  provider: AiProvider
  modelName: string
  maskedApiKey: string
  hasKey: boolean
  baseUrl: string
  temperature: number
  systemPromptOverride: string
  isActive: boolean
}

interface WelcomeMessageItem {
  id: string
  title: string
  content: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SymptomOptionItem {
  id: string
  label: string
  category: string
  orderIndex: number
  isActive: boolean
  followUpQuestion?: string
  followUpOptions?: string[]
  createdAt?: string
  updatedAt?: string
}

interface PharmacistPersonaConfig {
  pharmacistName: string
  pharmacistTitle: string
  pharmacistAvatarUrl: string
  pharmacistStatusText: string
  leadNudgeEnabled: boolean
  leadNudgeTriggerMode: string
  leadNudgeMessageCount: number
  leadNudgeTimeMinutes: number
  leadNudgeCooldownMinutes: number
}

interface ProviderOption {
  id: AiProvider
  name: string
  badge: string
  models: string[]
  defaultModel: string
  defaultBaseUrl?: string
  description: string
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Official SDK / REST",
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash",
    description: "Sangat cepat, hemat token, dan direkomendasikan untuk apotek herbal real-time.",
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "v1/chat/completions",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    description: "Model standar industri dengan penalaran medis dan ekstraksi entitas yang akurat.",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    badge: "v1/messages",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    defaultModel: "claude-3-5-haiku-20241022",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    description: "Keamanan tinggi, empati klinis natural, dan instruksi guardrail yang sangat patuh.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    badge: "OpenAI-Compatible",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    description: "Model penalaran open-weights performa tinggi dengan biaya per token paling terjangkau.",
  },
  {
    id: "groq",
    name: "Groq LPU",
    badge: "Ultra Low Latency",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    defaultModel: "llama-3.3-70b-versatile",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    description: "Inference super cepat (>500 token/detik) untuk interaksi chatbot instan tanpa jeda.",
  },
  {
    id: "custom_ollama",
    name: "Ollama / Local LLM",
    badge: "Self-Hosted / Proxy",
    models: ["qwen2.5:7b", "llama3.2:3b", "meditron:7b", "mistral:7b"],
    defaultModel: "qwen2.5:7b",
    defaultBaseUrl: "http://localhost:11434/v1",
    description: "100% Offline & Private. Cocok untuk server lokal atau reverse-proxy internal klinik.",
  },
]

const SAMPLE_AVATARS = [
  {
    label: "Apoteker Wanita Berhijab",
    url: "https://images.unsplash.com/photo-1594824813583-1e5f8f9e7c5b?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Dokter / Konsultan Medis",
    url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Apoteker Pria Klinis",
    url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
  },
  {
    label: "Apoteker Ramah",
    url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
  },
]

export function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState<"models" | "welcome" | "symptoms" | "persona" | "rag">("models")

  // ── STATE: TAB 1 (MODELS) ──
  const [savedModels, setSavedModels] = useState<SavedModel[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [provider, setProvider] = useState<AiProvider>("gemini")
  const [modelName, setModelName] = useState("gemini-2.0-flash")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [temperature, setTemperature] = useState(0.4)
  const [systemPromptOverride, setSystemPromptOverride] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("")
  const [saveErrorMsg, setSaveErrorMsg] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  // ── STATE: TAB 2 (WELCOME MESSAGES) ──
  const [welcomeList, setWelcomeList] = useState<WelcomeMessageItem[]>([])
  const [isLoadingWelcome, setIsLoadingWelcome] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiWelcomeSuggestions, setAiWelcomeSuggestions] = useState<Array<{ title: string; content: string }>>([])
  const [editingWelcomeId, setEditingWelcomeId] = useState<string | null>(null)
  const [welcomeFormTitle, setWelcomeFormTitle] = useState("")
  const [welcomeFormContent, setWelcomeFormContent] = useState("")
  const [welcomeFormActive, setWelcomeFormActive] = useState(false)
  const [welcomeSuccess, setWelcomeSuccess] = useState("")
  const [welcomeError, setWelcomeError] = useState("")

  // ── STATE: TAB 3 (CHECKLIST GEJALA) ──
  const [symptomList, setSymptomList] = useState<SymptomOptionItem[]>([])
  const [isLoadingSymptoms, setIsLoadingSymptoms] = useState(false)
  const [symptomSuccess, setSymptomSuccess] = useState("")
  const [symptomError, setSymptomError] = useState("")
  const [editingSymptomId, setEditingSymptomId] = useState<string | null>(null)
  const [symptomLabel, setSymptomLabel] = useState("")
  const [symptomCategory, setSymptomCategory] = useState("umum")
  const [symptomOrder, setSymptomOrder] = useState(0)
  const [symptomActive, setSymptomActive] = useState(true)
  const [symptomFollowUpQ, setSymptomFollowUpQ] = useState("")
  const [symptomFollowUpOpts, setSymptomFollowUpOpts] = useState<string[]>([])
  const [newOptInput, setNewOptInput] = useState("")
  const [isSavingSymptom, setIsSavingSymptom] = useState(false)

  // ── STATE: TAB 4 (PERSONA & NUDGE) ──
  const [personaConfig, setPersonaConfig] = useState<PharmacistPersonaConfig>({
    pharmacistName: "Apt. Siti Rahma, S.Farm",
    pharmacistTitle: "Apoteker Pendamping Klinis",
    pharmacistAvatarUrl: "https://images.unsplash.com/photo-1594824813583-1e5f8f9e7c5b?auto=format&fit=crop&w=400&q=80",
    pharmacistStatusText: "Online • Siap Mendengarkan",
    leadNudgeEnabled: true,
    leadNudgeTriggerMode: "message_count",
    leadNudgeMessageCount: 3,
    leadNudgeTimeMinutes: 2,
    leadNudgeCooldownMinutes: 10,
  })
  const [isLoadingPersona, setIsLoadingPersona] = useState(false)
  const [isSavingPersona, setIsSavingPersona] = useState(false)
  const [personaSuccess, setPersonaSuccess] = useState("")
  const [personaError, setPersonaError] = useState("")

  // ── STATE: TAB 5 (CUSTOM RAG & VECTOR DB) ──
  const [isReindexing, setIsReindexing] = useState(false)
  const [reindexSuccess, setReindexSuccess] = useState("")
  const [reindexError, setReindexError] = useState("")
  const [ragQuery, setRagQuery] = useState("tengkuk tegang dan kolesterol")
  const [isSearchingRag, setIsSearchingRag] = useState(false)
  const [ragResults, setRagResults] = useState<any[]>([])
  const [ragTotalIndexed, setRagTotalIndexed] = useState<number | null>(null)

  // ── LOADERS ──
  const loadModels = async (): Promise<SavedModel[]> => {
    try {
      const res = await apiFetch<SavedModel[]>("ai-settings-list")
      if (res.data) {
        setSavedModels(res.data)
        return res.data
      }
      return []
    } catch (err: any) {
      console.warn("Gagal memuat daftar model, gunakan data default:", err)
      return []
    }
  }

  const fillForm = (m: SavedModel) => {
    setEditingId(m.id)
    setProvider(m.provider)
    setModelName(m.modelName)
    setApiKey(m.maskedApiKey || "")
    setBaseUrl(m.baseUrl || "")
    setTemperature(m.temperature ?? 0.4)
    setSystemPromptOverride(m.systemPromptOverride || "")
    setIsActive(m.isActive)
    setTestResult(null)
    setSaveErrorMsg("")
  }

  const resetForm = () => {
    setEditingId(null)
    const p = PROVIDERS[0]
    setProvider(p.id)
    setModelName(p.defaultModel)
    setApiKey("")
    setBaseUrl(p.defaultBaseUrl || "")
    setTemperature(0.4)
    setSystemPromptOverride("")
    setIsActive(savedModels.length === 0)
    setTestResult(null)
    setSaveErrorMsg("")
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      try {
        const list = await loadModels()
        const active = list.find((m) => m.isActive) || list[0]
        if (active) {
          setEditingId(active.id)
          fillForm(active)
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan AI:", err)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  // ── WELCOME MESSAGES CRUD ──
  const loadWelcomeMessages = async () => {
    setIsLoadingWelcome(true)
    try {
      const res = await apiFetch<WelcomeMessageItem[]>("welcome-message-manage")
      if (res.data) setWelcomeList(res.data)
    } catch (err: any) {
      console.error("Gagal memuat sapaan:", err)
    } finally {
      setIsLoadingWelcome(false)
    }
  }

  useEffect(() => {
    if (activeTab === "welcome") loadWelcomeMessages()
  }, [activeTab])

  const handleSaveWelcome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!welcomeFormTitle.trim() || !welcomeFormContent.trim()) return
    setWelcomeSuccess("")
    setWelcomeError("")
    try {
      await apiFetch("welcome-message-manage", {
        method: "POST",
        body: JSON.stringify({
          action: editingWelcomeId ? "update" : "create",
          id: editingWelcomeId || undefined,
          title: welcomeFormTitle.trim(),
          content: welcomeFormContent.trim(),
          isActive: welcomeFormActive,
        }),
      })
      setWelcomeSuccess(editingWelcomeId ? "Sapaan berhasil diperbarui." : "Sapaan baru berhasil ditambahkan.")
      setEditingWelcomeId(null)
      setWelcomeFormTitle("")
      setWelcomeFormContent("")
      setWelcomeFormActive(false)
      await loadWelcomeMessages()
      setTimeout(() => setWelcomeSuccess(""), 3000)
    } catch (err: any) {
      setWelcomeError(err.message || "Gagal menyimpan sapaan")
    }
  }

  const handleActivateWelcome = async (id: string) => {
    try {
      await apiFetch("welcome-message-manage", {
        method: "POST",
        body: JSON.stringify({ action: "activate", id }),
      })
      setWelcomeSuccess("Sapaan aktif berhasil diperbarui.")
      await loadWelcomeMessages()
      setTimeout(() => setWelcomeSuccess(""), 3000)
    } catch (err: any) {
      setWelcomeError(err.message || "Gagal mengaktifkan sapaan")
    }
  }

  const handleDeleteWelcome = async (id: string) => {
    if (!confirm("Hapus template sapaan ini?")) return
    try {
      await apiFetch("welcome-message-manage", {
        method: "POST",
        body: JSON.stringify({ action: "delete", id }),
      })
      setWelcomeSuccess("Sapaan berhasil dihapus.")
      await loadWelcomeMessages()
      setTimeout(() => setWelcomeSuccess(""), 3000)
    } catch (err: any) {
      setWelcomeError(err.message || "Gagal menghapus sapaan")
    }
  }

  const handleGenerateAiSuggestions = async () => {
    setIsGeneratingAi(true)
    setWelcomeError("")
    try {
      const res = await apiFetch<Array<{ title: string; content: string }>>("welcome-message-manage", {
        method: "POST",
        body: JSON.stringify({ action: "generate_ai" }),
      })
      if (res.data && Array.isArray(res.data)) {
        setAiWelcomeSuggestions(res.data)
      }
    } catch (err: any) {
      setWelcomeError(err.message || "Gagal meminta ide AI")
    } finally {
      setIsGeneratingAi(false)
    }
  }

  // ── SYMPTOM OPTIONS CRUD ──
  const loadSymptoms = async () => {
    setIsLoadingSymptoms(true)
    try {
      const res = await apiFetch<SymptomOptionItem[]>("symptom-options-manage")
      if (res.data) setSymptomList(res.data)
    } catch (err: any) {
      console.error("Gagal memuat opsi gejala:", err)
    } finally {
      setIsLoadingSymptoms(false)
    }
  }

  useEffect(() => {
    if (activeTab === "symptoms") loadSymptoms()
  }, [activeTab])

  const resetSymptomForm = () => {
    setEditingSymptomId(null)
    setSymptomLabel("")
    setSymptomCategory("umum")
    setSymptomOrder(symptomList.length + 1)
    setSymptomActive(true)
    setSymptomFollowUpQ("")
    setSymptomFollowUpOpts([])
    setNewOptInput("")
  }

  const handleSaveSymptom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symptomLabel.trim()) return
    setIsSavingSymptom(true)
    setSymptomSuccess("")
    setSymptomError("")
    try {
      await apiFetch("symptom-options-manage", {
        method: "POST",
        body: JSON.stringify({
          id: editingSymptomId || undefined,
          label: symptomLabel.trim(),
          category: symptomCategory,
          orderIndex: symptomOrder,
          isActive: symptomActive,
          followUpQuestion: symptomFollowUpQ.trim() || undefined,
          followUpOptions: symptomFollowUpOpts.length > 0 ? symptomFollowUpOpts : undefined,
        }),
      })
      setSymptomSuccess(editingSymptomId ? "Opsi gejala berhasil diperbarui!" : "Opsi gejala baru berhasil ditambahkan!")
      resetSymptomForm()
      await loadSymptoms()
      setTimeout(() => setSymptomSuccess(""), 3000)
    } catch (err: any) {
      setSymptomError(err.message || "Gagal menyimpan opsi gejala")
    } finally {
      setIsSavingSymptom(false)
    }
  }

  const handleDeleteSymptom = async (id: string) => {
    if (!confirm("Hapus opsi gejala ini dari sistem?")) return
    try {
      await apiFetch(`symptom-options-manage?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      setSymptomSuccess("Opsi gejala berhasil dihapus.")
      await loadSymptoms()
      setTimeout(() => setSymptomSuccess(""), 3000)
    } catch (err: any) {
      setSymptomError(err.message || "Gagal menghapus opsi gejala")
    }
  }

  const handleAddFollowUpOpt = () => {
    if (!newOptInput.trim()) return
    setSymptomFollowUpOpts([...symptomFollowUpOpts, newOptInput.trim()])
    setNewOptInput("")
  }

  const handleRemoveFollowUpOpt = (idx: number) => {
    setSymptomFollowUpOpts(symptomFollowUpOpts.filter((_, i) => i !== idx))
  }

  // ── PERSONA & NUDGE LOAD & SAVE ──
  const loadPersona = async () => {
    setIsLoadingPersona(true)
    try {
      const res = await fetch("/api/chatbot-config-get").then((r) => r.json())
      if (res.success && res.data) setPersonaConfig(res.data)
    } catch (err: any) {
      console.error("Gagal memuat persona config:", err)
    } finally {
      setIsLoadingPersona(false)
    }
  }

  useEffect(() => {
    if (activeTab === "persona") loadPersona()
  }, [activeTab])

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingPersona(true)
    setPersonaSuccess("")
    setPersonaError("")
    try {
      await apiFetch("chatbot-config-save", {
        method: "POST",
        body: JSON.stringify(personaConfig),
      })
      setPersonaSuccess("Pengaturan Persona & Soft Lead Nudge berhasil disimpan!")
      setTimeout(() => setPersonaSuccess(""), 3500)
    } catch (err: any) {
      setPersonaError(err.message || "Gagal menyimpan persona")
    } finally {
      setIsSavingPersona(false)
    }
  }

  // ── RAG REINDEX & SEARCH ──
  const handleReindexRag = async () => {
    setIsReindexing(true)
    setReindexSuccess("")
    setReindexError("")
    try {
      const res = await apiFetch<any>("rag-reindex", { method: "POST", body: JSON.stringify({}) })
      if (res.data) {
        setReindexSuccess(`Berhasil mengindeks ${res.data.indexedCount} produk ke Basis Vektor!`)
        setRagTotalIndexed(res.data.indexedCount)
      }
    } catch (err: any) {
      setReindexError(err.message || "Gagal mengindeks basis vektor")
    } finally {
      setIsReindexing(false)
    }
  }

  const handleTestRagSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ragQuery.trim()) return
    setIsSearchingRag(true)
    try {
      const res = await apiFetch<any>("rag-search", {
        method: "POST",
        body: JSON.stringify({ query: ragQuery.trim(), limit: 4 }),
      })
      if (res.data) {
        setRagResults(res.data.results || [])
        setRagTotalIndexed(res.data.totalIndexed)
      }
    } catch (err: any) {
      console.error("RAG search error:", err)
    } finally {
      setIsSearchingRag(false)
    }
  }

  // ── MODEL SETTINGS ACTIONS ──
  const handleProviderChange = (newP: AiProvider) => {
    setProvider(newP)
    const opt = PROVIDERS.find((p) => p.id === newP)
    if (opt) {
      setModelName(opt.defaultModel)
      if (opt.defaultBaseUrl) setBaseUrl(opt.defaultBaseUrl)
    }
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const payload: any = { provider, modelName, baseUrl, temperature }
      if (apiKey && !apiKey.includes("••••")) payload.apiKey = apiKey
      else if (editingId) payload.modelId = editingId
      const res = await apiFetch<any>("ai-settings-test", { method: "POST", body: JSON.stringify(payload) })
      if (res.data) setTestResult(res.data)
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Gagal menghubungi server verifikasi AI" })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccessMsg("")
    setSaveErrorMsg("")
    try {
      const payload: any = {
        id: editingId || undefined,
        provider,
        modelName,
        baseUrl,
        temperature,
        systemPromptOverride,
        isActive,
      }
      if (apiKey && !apiKey.includes("••••")) {
        payload.apiKey = apiKey
      }
      const res = await apiFetch<{ id: string }>("ai-settings-save", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      setSaveSuccessMsg(editingId ? "Perubahan model berhasil disimpan!" : "Model baru berhasil ditambahkan!")
      const list = await loadModels()
      const savedId = res.data?.id
      if (savedId) {
        setEditingId(savedId)
        const saved = list.find((m) => m.id === savedId)
        if (saved) fillForm(saved)
      }
      setTimeout(() => setSaveSuccessMsg(""), 3500)
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Gagal menyimpan konfigurasi.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleActivateModel = async (id: string) => {
    setBusyId(id)
    try {
      await apiFetch("ai-settings-activate", { method: "POST", body: JSON.stringify({ id }) })
      const list = await loadModels()
      const active = list.find((m) => m.id === id)
      if (active) fillForm(active)
      setSaveSuccessMsg("Model aktif berhasil diubah.")
      setTimeout(() => setSaveSuccessMsg(""), 3000)
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Gagal mengaktifkan model")
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteModel = async (id: string) => {
    if (!confirm("Hapus model ini dari daftar?")) return
    setBusyId(id)
    try {
      await apiFetch("ai-settings-delete", { method: "POST", body: JSON.stringify({ id }) })
      if (editingId === id) resetForm()
      await loadModels()
      setSaveSuccessMsg("Model berhasil dihapus.")
      setTimeout(() => setSaveSuccessMsg(""), 3000)
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Gagal menghapus model")
    } finally {
      setBusyId(null)
    }
  }

  const activeSavedModel = savedModels.find((m) => m.isActive)
  const currentProviderConfig = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0]

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Bot className="h-6 w-6 text-emerald-700" />
              Pusat Pengaturan AI &amp; Chatbot
            </h1>
            {activeSavedModel && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Aktif: {activeSavedModel.modelName}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Kelola gateway multi-model, pesan sapaan apotek, checklist gejala interaktif, persona konsultan, dan basis vektor (RAG).
          </p>
        </div>

        {/* 5-Tab Switcher */}
        <div className="bg-stone-100 p-1 rounded-2xl flex items-center gap-1 border border-stone-200 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab("models")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "models"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Model Gateway
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("welcome")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "welcome"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Sapaan Chatbot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("symptoms")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "symptoms"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Checklist Gejala
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("persona")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "persona"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Persona &amp; Nudge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rag")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "rag"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Custom RAG / Vektor
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 3: CHECKLIST GEJALA (MODUL 2)                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "symptoms" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {symptomSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{symptomSuccess}</span>
            </div>
          )}
          {symptomError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{symptomError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Tambah/Edit Opsi Gejala */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-emerald-700" />
                  {editingSymptomId ? "Edit Opsi Gejala" : "Tambah Opsi Gejala Baru"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tombol chip yang tampil di kuis interaktif customer chatbot.
                </p>
              </div>

              <form onSubmit={handleSaveSymptom} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Label Gejala *</label>
                  <input
                    type="text"
                    required
                    value={symptomLabel}
                    onChange={(e) => setSymptomLabel(e.target.value)}
                    placeholder="Contoh: Tengkuk Kaku / Leher Tegang"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Kategori Klinis</label>
                    <select
                      value={symptomCategory}
                      onChange={(e) => setSymptomCategory(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-800 focus:outline-emerald-600"
                    >
                      <option value="kolesterol">Kolesterol</option>
                      <option value="hipertensi">Hipertensi</option>
                      <option value="asam_urat">Asam Urat</option>
                      <option value="diabetes">Diabetes</option>
                      <option value="umum">Umum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Urutan Tampil</label>
                    <input
                      type="number"
                      value={symptomOrder}
                      onChange={(e) => setSymptomOrder(Number(e.target.value))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Pertanyaan Drill-Down (Opsional)</label>
                  <input
                    type="text"
                    value={symptomFollowUpQ}
                    onChange={(e) => setSymptomFollowUpQ(e.target.value)}
                    placeholder="Contoh: Berapa lama tengkuk terasa kaku?"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Pilihan Radio Button Drill-Down</label>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      value={newOptInput}
                      onChange={(e) => setNewOptInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFollowUpOpt(); } }}
                      placeholder="Ketik opsi &amp; tekan Tambah..."
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddFollowUpOpt}
                      className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 font-bold text-stone-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {symptomFollowUpOpts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {symptomFollowUpOpts.map((opt, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                          <span>{opt}</span>
                          <button type="button" onClick={() => handleRemoveFollowUpOpt(idx)} className="hover:text-red-600 cursor-pointer font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 italic">Belum ada pilihan radio button.</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="symActive"
                    checked={symptomActive}
                    onChange={(e) => setSymptomActive(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="symActive" className="text-stone-700 font-medium">
                    Aktifkan opsi ini di chatbot customer
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="submit"
                    disabled={isSavingSymptom}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSavingSymptom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>{editingSymptomId ? "Simpan Perubahan" : "Tambah Opsi"}</span>
                  </button>
                  {editingSymptomId && (
                    <button
                      type="button"
                      onClick={resetSymptomForm}
                      className="py-2 px-3 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Daftar Chip Gejala Tersimpan */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-700" />
                    Daftar Chip Gejala Aktif ({symptomList.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pelanggan dapat memilih lebih dari 1 gejala untuk kuis penilaian terarah tanpa mengetik.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetSymptomForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Baru
                </button>
              </div>

              {isLoadingSymptoms ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                  <span>Memuat daftar opsi gejala...</span>
                </div>
              ) : symptomList.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-6 text-center">Belum ada opsi gejala terdaftar.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {symptomList.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition text-xs space-y-2 flex flex-col justify-between ${
                        item.isActive ? "border-emerald-200 bg-emerald-50/30" : "border-stone-200 bg-stone-50/50 opacity-60"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-stone-900">{item.label}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600">
                            {item.category}
                          </span>
                        </div>
                        {item.followUpQuestion && (
                          <p className="text-stone-600 text-[11px] mt-1 italic">
                            &ldquo;{item.followUpQuestion}&rdquo;
                          </p>
                        )}
                        {item.followUpOptions && item.followUpOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.followUpOptions.map((opt, oIdx) => (
                              <span key={oIdx} className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 font-mono">Urutan #{item.orderIndex}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSymptomId(item.id)
                              setSymptomLabel(item.label)
                              setSymptomCategory(item.category)
                              setSymptomOrder(item.orderIndex)
                              setSymptomActive(item.isActive)
                              setSymptomFollowUpQ(item.followUpQuestion || "")
                              setSymptomFollowUpOpts(item.followUpOptions || [])
                            }}
                            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSymptom(item.id)}
                            className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 4: PERSONA & LEAD NUDGE (MODUL 1 & 4)                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "persona" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {personaSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{personaSuccess}</span>
            </div>
          )}
          {personaError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{personaError}</span>
            </div>
          )}

          {isLoadingPersona ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
              <span>Memuat pengaturan persona apoteker...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Persona & Nudge */}
              <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Persona Apoteker */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-700" />
                    Profil &amp; Persona Apoteker Pendamping
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Tampilkan nama dan foto apoteker profesional untuk membangun rasa percaya (*trust*) pelanggan.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Nama Lengkap &amp; Gelar</label>
                      <input
                        type="text"
                        value={personaConfig.pharmacistName}
                        onChange={(e) => setPersonaConfig({ ...personaConfig, pharmacistName: e.target.value })}
                        placeholder="Contoh: Apt. Siti Rahma, S.Farm"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Jabatan / Role</label>
                      <input
                        type="text"
                        value={personaConfig.pharmacistTitle}
                        onChange={(e) => setPersonaConfig({ ...personaConfig, pharmacistTitle: e.target.value })}
                        placeholder="Contoh: Apoteker Pendamping Klinis"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Status Teks Online</label>
                    <input
                      type="text"
                      value={personaConfig.pharmacistStatusText}
                      onChange={(e) => setPersonaConfig({ ...personaConfig, pharmacistStatusText: e.target.value })}
                      placeholder="Contoh: Online • Siap Mendengarkan"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">URL Foto Profil Apoteker</label>
                    <input
                      type="text"
                      value={personaConfig.pharmacistAvatarUrl}
                      onChange={(e) => setPersonaConfig({ ...personaConfig, pharmacistAvatarUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white mb-2"
                    />

                    {/* Preset Avatars */}
                    <div className="flex items-center gap-2 overflow-x-auto pt-1">
                      <span className="text-[11px] text-stone-500 shrink-0">Pilih cepat:</span>
                      {SAMPLE_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPersonaConfig({ ...personaConfig, pharmacistAvatarUrl: av.url })}
                          className={`h-9 w-9 rounded-xl overflow-hidden border transition shrink-0 cursor-pointer ${
                            personaConfig.pharmacistAvatarUrl === av.url ? "border-emerald-600 ring-2 ring-emerald-500" : "border-stone-200 opacity-70 hover:opacity-100"
                          }`}
                          title={av.label}
                        >
                          <img src={av.url} alt={av.label} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Pengaturan Lead Nudge */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-emerald-700" />
                    Dynamic Soft Lead-Capture Nudge
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Pengingat kontak ramah berorientasi keuntungan pasien (*Patient Value Proposition*).
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <div>
                      <p className="font-bold text-stone-900">Aktifkan Soft Lead Nudge</p>
                      <p className="text-[11px] text-stone-500">Tampilkan popup penawaran simpan resep ke WhatsApp.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={personaConfig.leadNudgeEnabled}
                        onChange={(e) => setPersonaConfig({ ...personaConfig, leadNudgeEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Mode Pemicu</label>
                      <select
                        value={personaConfig.leadNudgeTriggerMode}
                        onChange={(e) => setPersonaConfig({ ...personaConfig, leadNudgeTriggerMode: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-800 focus:outline-emerald-600"
                      >
                        <option value="message_count">Jumlah Pesan</option>
                        <option value="time_minutes">Durasi Waktu</option>
                        <option value="both">Keduanya (Mana yang Lebih Dulu)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Pemicu Pesan (kali)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={personaConfig.leadNudgeMessageCount}
                        onChange={(e) => setPersonaConfig({ ...personaConfig, leadNudgeMessageCount: Number(e.target.value) })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Pemicu Waktu (menit)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={personaConfig.leadNudgeTimeMinutes}
                        onChange={(e) => setPersonaConfig({ ...personaConfig, leadNudgeTimeMinutes: Number(e.target.value) })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Cooldown Interval (menit jika ditolak/ditutup)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={personaConfig.leadNudgeCooldownMinutes}
                      onChange={(e) => setPersonaConfig({ ...personaConfig, leadNudgeCooldownMinutes: Number(e.target.value) })}
                      className="w-32 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingPersona}
                    onClick={handleSavePersona}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSavingPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Simpan Pengaturan Persona &amp; Nudge</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3 sticky top-6">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Pratinjau Live Widget Chatbot
                </h4>
                <p className="text-[11px] text-stone-500">
                  Berikut tampilan nyata persona dan header yang dilihat oleh customer.
                </p>

                {/* Mock Chat Header */}
                <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-md">
                  <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 p-3 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-white/20 shrink-0">
                        {personaConfig.pharmacistAvatarUrl ? (
                          <img src={personaConfig.pharmacistAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Bot className="h-5 w-5 text-white m-2" />
                        )}
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-800" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">{personaConfig.pharmacistName}</p>
                        <p className="text-[10px] text-emerald-200 truncate">{personaConfig.pharmacistStatusText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mock Chat Bubble */}
                  <div className="p-3 bg-stone-50 space-y-2 text-xs">
                    <div className="flex items-start gap-1.5">
                      <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 mt-0.5 bg-emerald-100">
                        {personaConfig.pharmacistAvatarUrl ? (
                          <img src={personaConfig.pharmacistAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Bot className="h-3 w-3 text-emerald-700 m-1" />
                        )}
                      </div>
                      <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-none p-2.5 text-[11px] text-stone-800 leading-relaxed shadow-xs max-w-[85%]">
                        Halo Kak, selamat datang di Apotek Herbal Medika 🙏 Boleh ceritakan bagaimana kondisi kesehatan Anda hari ini?
                      </div>
                    </div>

                    {/* Mock Nudge Preview */}
                    <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-[10px] space-y-1">
                      <p className="font-bold text-amber-950 flex items-center gap-1">
                        <HeartHandshake className="h-3 w-3 text-emerald-700" />
                        Ingin Rangkuman Resep Ini Dikirimkan?
                      </p>
                      <p className="text-stone-600 text-[10px] leading-snug">
                        Simpan riwayat konsultasi ke WhatsApp tanpa biaya.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SAPAAN PEMBUKA CHATBOT                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "welcome" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {welcomeSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{welcomeSuccess}</span>
            </div>
          )}
          {welcomeError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{welcomeError}</span>
            </div>
          )}

          {/* AI Generator Banner */}
          <div className="bg-linear-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Rekomendasi Sapaan Cerdas Berbasis AI
                </h3>
                <p className="text-xs text-emerald-100 mt-1 max-w-xl">
                  Gunakan model AI aktif Anda untuk meracik variasi pesan sapaan apotek yang hangat, empatik, dan persuasif tanpa terkesan memaksa jualan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAiSuggestions}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs hover:bg-amber-300 transition shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Meracik Ide...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Minta Ide dari AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated AI Suggestions Grid */}
            {aiWelcomeSuggestions.length > 0 && (
              <div className="pt-3 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiWelcomeSuggestions.map((sug, idx) => (
                  <div key={idx} className="bg-white/10 rounded-2xl p-3 text-xs space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-amber-300">{sug.title}</p>
                      <p className="text-white/90 text-[11px] leading-relaxed mt-1 line-clamp-4">{sug.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWelcomeFormTitle(sug.title)
                        setWelcomeFormContent(sug.content)
                        setWelcomeFormActive(true)
                      }}
                      className="text-[11px] font-bold text-amber-300 hover:text-white underline text-left cursor-pointer"
                    >
                      Gunakan Ide Ini →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form & List Welcome Message */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-700" />
                  {editingWelcomeId ? "Edit Sapaan" : "Buat Sapaan Baru"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Gunakan placeholder <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;name&#125;&#125;</code> untuk memanggil nama pelanggan otomatis.
                </p>
              </div>

              <form onSubmit={handleSaveWelcome} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Judul / Skenario</label>
                  <input
                    type="text"
                    required
                    value={welcomeFormTitle}
                    onChange={(e) => setWelcomeFormTitle(e.target.value)}
                    placeholder="Contoh: Sapaan Ramah Pagi Hari"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Isi Pesan Sapaan</label>
                  <textarea
                    required
                    rows={5}
                    value={welcomeFormContent}
                    onChange={(e) => setWelcomeFormContent(e.target.value)}
                    placeholder="Halo Kak {{name}}, selamat datang di Apotek Herbal Medika..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-emerald-600 focus:bg-white leading-relaxed resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="welcomeActive"
                    checked={welcomeFormActive}
                    onChange={(e) => setWelcomeFormActive(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="welcomeActive" className="text-stone-700 font-medium">
                    Jadikan sapaan aktif saat ini
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{editingWelcomeId ? "Simpan Perubahan" : "Tambah Sapaan"}</span>
                  </button>
                  {editingWelcomeId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWelcomeId(null)
                        setWelcomeFormTitle("")
                        setWelcomeFormContent("")
                        setWelcomeFormActive(false)
                      }}
                      className="py-2 px-3 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-700" />
                  Koleksi Sapaan Pembuka Tersimpan ({welcomeList.length})
                </h3>
              </div>

              {isLoadingWelcome ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                  <span>Memuat daftar sapaan...</span>
                </div>
              ) : welcomeList.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-6 text-center">Belum ada template sapaan pembuka.</p>
              ) : (
                <div className="space-y-3">
                  {welcomeList.map((wm) => (
                    <div
                      key={wm.id}
                      className={`p-4 rounded-2xl border transition text-xs space-y-2.5 ${
                        wm.isActive ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500/20" : "border-stone-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{wm.title}</span>
                          {wm.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              <Check className="h-3 w-3" />
                              Sedang Aktif
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivateWelcome(wm.id)}
                              className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                            >
                              Gunakan Sapaan Ini
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWelcomeId(wm.id)
                              setWelcomeFormTitle(wm.title)
                              setWelcomeFormContent(wm.content)
                              setWelcomeFormActive(wm.isActive)
                            }}
                            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWelcome(wm.id)}
                            className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">{wm.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 5: CUSTOM RAG / VECTOR KNOWLEDGE BASE (MODUL 6)            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "rag" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {reindexSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{reindexSuccess}</span>
            </div>
          )}
          {reindexError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{reindexError}</span>
            </div>
          )}

          {/* RAG Knowledge Base Status Banner */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-700" />
                    Basis Vektor Katalog Herbal BPOM
                  </h3>
                  {ragTotalIndexed !== null && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {ragTotalIndexed} Produk Terindeks
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-xl">
                  Sistem mengekstrak nama, khasiat klinis, indikasi patologis, dan aturan pakai dari 30 produk herbal resmi BPOM menjadi representasi vektor berdimensi tinggi untuk pencarian semantik (Semantic Grounding).
                </p>
              </div>

              <button
                type="button"
                onClick={handleReindexRag}
                disabled={isReindexing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isReindexing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengindeks Vektor...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Re-index Vector Knowledge Base</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Semantic Search Tester Playground */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-emerald-700" />
                Uji Pencarian Semantik Vektor (Playground)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Masukkan keluhan pasien dalam bahasa sehari-hari untuk menguji produk yang paling relevan berdasarkan kemiripan kosinus (*Cosine Similarity*).
              </p>
            </div>

            <form onSubmit={handleTestRagSearch} className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Contoh: tengkuk kaku, kolesterol tinggi, jempol bengkak..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-800 focus:outline-emerald-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={isSearchingRag || !ragQuery.trim()}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSearchingRag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>Uji Vektor</span>
              </button>
            </form>

            {/* Results Grid */}
            {ragResults.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-stone-700">Hasil Kemiripan Vektor Teratas:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ragResults.map((r, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/30 text-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-stone-900 text-xs">
                          {r.metadata?.name || r.product?.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                          Score: {(r.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-2">{r.textChunk}</p>
                      <div className="pt-1 text-[10px] font-semibold text-emerald-800 flex justify-between">
                        <span>{r.metadata?.sku || r.product?.sku}</span>
                        <span>Rp {Number(r.metadata?.price || r.product?.price || 0).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MODEL AI GATEWAY (MULTI-MODEL CRUD)                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "models" && (
        <>
          {/* Panel Model Tersimpan */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-700" />
                  Model Tersimpan di Database
                </h2>
                <p className="text-xs text-stone-500">
                  Model dengan tanda centang hijau adalah yang saat ini aktif melayani chatbot pelanggan.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Model Baru
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-stone-500 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                <span>Memuat daftar model tersimpan...</span>
              </div>
            ) : savedModels.length === 0 ? (
              <p className="text-xs text-stone-500 italic">Belum ada model tersimpan di database.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedModels.map((m) => {
                  const isCurrentEditing = editingId === m.id
                  const isBusy = busyId === m.id
                  return (
                    <div
                      key={m.id}
                      className={`relative rounded-2xl p-4 border transition ${
                        m.isActive
                          ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500/20"
                          : isCurrentEditing
                            ? "border-stone-400 bg-stone-50"
                            : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-stone-900 truncate">
                              {m.modelName || m.provider}
                            </span>
                            {m.isActive && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                <Power className="h-2.5 w-2.5" />
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                            {m.provider}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => fillForm(m)}
                            disabled={isBusy}
                            className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModel(m.id)}
                            disabled={isBusy}
                            className="rounded-lg p-1 text-stone-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-100 pt-2">
                        <span className="flex items-center gap-1">
                          API Key: {m.hasKey ? <span className="font-mono text-stone-700">{m.maskedApiKey}</span> : <span className="text-amber-600">Env Default</span>}
                        </span>
                        {!m.isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivateModel(m.id)}
                            disabled={isBusy}
                            className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                          >
                            {isBusy ? "Mengaktifkan..." : "Aktifkan"}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Form Konfigurasi Model */}
          <form onSubmit={handleSaveModel} className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Save className="h-4 w-4 text-emerald-700" />
                    {editingId ? "Edit Konfigurasi Model" : "Tambah Model AI Baru"}
                  </h2>
                  <p className="text-xs text-stone-500">
                    Pilih provider LLM, masukkan API key, dan atur parameter temperatur.
                  </p>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Pilih Provider AI</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {PROVIDERS.map((p) => {
                    const isSelected = provider === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderChange(p.id)}
                        className={`rounded-2xl p-3 text-left border transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500/20"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs text-stone-900">{p.name}</p>
                          <span className="mt-1 inline-block text-[9px] font-semibold text-stone-500">{p.badge}</span>
                        </div>
                        {isSelected && <span className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">Dipilih</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Model Name & Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nama Model</label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Contoh: gemini-2.0-flash"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-emerald-600 focus:bg-white"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] text-stone-400">Preset:</span>
                    {currentProviderConfig.models.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModelName(m)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          modelName === m ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-bold" : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={editingId ? "Biarkan jika tidak ingin mengubah key" : "Masukkan API Key"}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-3 pr-9 py-2 text-xs text-stone-800 font-mono focus:outline-emerald-600 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-500">API Key disimpan terenkripsi di Neon DB.</p>
                </div>
              </div>

              {/* Base URL & Temperature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Base URL (Opsional / Ollama / Proxy)</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-700">Temperature (Akurasi Medis)</label>
                    <span className="text-xs font-mono font-bold text-emerald-800">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-emerald-700"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0.0 (Presisi &amp; Faktual)</span>
                    <span>0.4 (Rekomendasi Medis)</span>
                    <span>1.0 (Kreatif)</span>
                  </div>
                </div>
              </div>

              {/* System Prompt Override */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Instruksi Tambahan (System Prompt Override)</label>
                <textarea
                  rows={3}
                  value={systemPromptOverride}
                  onChange={(e) => setSystemPromptOverride(e.target.value)}
                  placeholder="Instruksi spesifik apotek Anda..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-emerald-600 focus:bg-white resize-none"
                />
              </div>

              {/* Is Active Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveModel"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveModel" className="text-xs text-stone-700 font-medium">
                  Jadikan model aktif utama untuk konsultasi chatbot
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-700" /> : <Zap className="h-4 w-4 text-amber-500" />}
                  <span>Uji Koneksi AI</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs active:scale-98 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingId ? "Simpan Perubahan" : "Tambah Model"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Result Banner */}
            {testResult && (
              <div
                className={`rounded-2xl p-4 text-xs font-medium border animate-in slide-in-from-top-2 duration-200 flex items-start gap-3 ${
                  testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testResult.ok ? "Verifikasi AI Berhasil!" : "Verifikasi AI Gagal"}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Save Success Banner */}
            {saveSuccessMsg && (
              <div className="rounded-2xl p-4 text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Save Error Banner */}
            {saveErrorMsg && (
              <div className="rounded-2xl p-4 text-xs font-bold border border-red-200 bg-red-50 text-red-900 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  )
}
