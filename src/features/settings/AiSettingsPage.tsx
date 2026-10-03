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
  FileText,
  Check,
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
    badge: "Direkomendasikan",
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash",
    description: "Model multimodal ultra-cepat Google dengan latensi rendah dan pemahaman medis tajam.",
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "Populer",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    description: "Keluarga model GPT OpenAI dengan penalaran instruksi tinggi untuk e-commerce.",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    badge: "Presisi Tinggi",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    defaultModel: "claude-3-5-sonnet-20241022",
    description: "Nuansa bahasa natural terbaik dengan kepatuhan etika dan guardrail farmasi ketat.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    badge: "Hemat Biaya",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    description: "Model open-weights berkinerja tinggi dengan tarif API sangat ekonomis.",
  },
  {
    id: "groq",
    name: "Groq LPU",
    badge: "Ultra Cepat",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    defaultModel: "llama-3.3-70b-versatile",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    description: "Mesin inferensi LPU berkecepatan 500+ token/detik untuk respon chat seketika.",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    badge: "Enterprise GPU",
    models: [
      "meta/llama-3.3-70b-instruct",
      "meta/llama-3.1-8b-instruct",
      "deepseek-ai/deepseek-r1",
      "mistralai/mixtral-8x7b-instruct-v0.1",
    ],
    defaultModel: "meta/llama-3.3-70b-instruct",
    defaultBaseUrl: "https://integrate.api.nvidia.com/v1",
    description: "Akselerasi microservice AI kelas enterprise di atas infrastruktur GPU NVIDIA.",
  },
  {
    id: "custom_ollama",
    name: "Ollama (Lokal)",
    badge: "100% Offline",
    models: ["llama3.2", "mistral", "qwen2.5:7b", "deepseek-r1:8b"],
    defaultModel: "llama3.2",
    defaultBaseUrl: "http://localhost:11434/v1",
    description: "Jalankan model open source di komputer/server lokal tanpa mengirim data ke cloud.",
  },
  {
    id: "custom",
    name: "Kustom / Lainnya",
    badge: "Fleksibel",
    models: [],
    defaultModel: "",
    defaultBaseUrl: "",
    description: "Gunakan endpoint OpenAI-compatible apa pun (vLLM, LM Studio, LiteLLM, dll.).",
  },
]

export function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState<"models" | "welcome" | "rag">("models")

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

  // ── STATE: TAB 3 (CUSTOM RAG & VECTOR DB) ──
  const [isReindexing, setIsReindexing] = useState(false)
  const [reindexSuccess, setReindexSuccess] = useState("")
  const [reindexError, setReindexError] = useState("")
  const [ragQuery, setRagQuery] = useState("tengkuk tegang dan kolesterol")
  const [isSearchingRag, setIsSearchingRag] = useState(false)
  const [ragResults, setRagResults] = useState<any[]>([])

  // Load models on init
  const loadModels = async (): Promise<SavedModel[]> => {
    const res = await apiFetch<SavedModel[]>("ai-settings-list")
    if (res.data) {
      setSavedModels(res.data)
      return res.data
    }
    return []
  }

  const fillForm = (m: SavedModel) => {
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
    setBaseUrl("")
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
        setSaveErrorMsg(err instanceof Error ? err.message : "Gagal memuat pengaturan AI")
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
    if (activeTab === "welcome") {
      loadWelcomeMessages()
    }
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
    if (!window.confirm("Hapus pesan sapaan ini?")) return
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
      if (res.data) {
        setAiWelcomeSuggestions(res.data)
      }
    } catch (err: any) {
      setWelcomeError(err.message || "Gagal meminta rekomendasi AI")
    } finally {
      setIsGeneratingAi(false)
    }
  }

  // ── RAG REINDEX & SEARCH ──
  const handleReindexRag = async () => {
    setIsReindexing(true)
    setReindexSuccess("")
    setReindexError("")
    try {
      const res = await apiFetch<any>("rag-reindex", { method: "POST" })
      if (res.data) {
        setReindexSuccess(
          `Sukses mengindeks ${res.data.indexedCount} produk (${res.data.vectorDimensions} dimensi via ${res.data.embeddingProvider})!`
        )
      }
    } catch (err: any) {
      setReindexError(err.message || "Gagal melakukan re-index vektor")
    } finally {
      setIsReindexing(false)
    }
  }

  const handleTestRagSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ragQuery.trim()) return
    setIsSearchingRag(true)
    try {
      const res = await fetch("/api/rag-search", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ query: ragQuery.trim(), topK: 3 }),
      })
      const json = await res.json()
      if (json.success && json.data?.results) {
        setRagResults(json.data.results)
      }
    } catch (err: any) {
      console.error("RAG search test error:", err)
    } finally {
      setIsSearchingRag(false)
    }
  }

  // Handle Model Activation
  const handleActivate = async (id: string) => {
    setBusyId(id)
    setSaveErrorMsg("")
    try {
      await apiFetch("ai-settings-activate", { method: "POST", body: JSON.stringify({ id }) })
      await loadModels()
      setSaveSuccessMsg("Model aktif berhasil diganti.")
      setTimeout(() => setSaveSuccessMsg(""), 3000)
    } catch (err: any) {
      setSaveErrorMsg(err?.message || "Gagal mengaktifkan model.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (m: SavedModel) => {
    if (!window.confirm(`Hapus model ${m.modelName}? Tindakan ini tidak dapat dibatalkan.`)) return
    setBusyId(m.id)
    setSaveErrorMsg("")
    try {
      await apiFetch(`ai-settings-delete?id=${encodeURIComponent(m.id)}`, { method: "DELETE" })
      const list = await loadModels()
      if (editingId === m.id) {
        const next = list.find((x) => x.isActive) || list[0]
        if (next) {
          setEditingId(next.id)
          fillForm(next)
        } else {
          resetForm()
        }
      }
      setSaveSuccessMsg("Model berhasil dihapus.")
      setTimeout(() => setSaveSuccessMsg(""), 3000)
    } catch (err: any) {
      setSaveErrorMsg(err?.message || "Gagal menghapus model.")
    } finally {
      setBusyId(null)
    }
  }

  const handleProviderSelect = (prov: ProviderOption) => {
    setProvider(prov.id)
    if (prov.id === "custom") {
      setModelName("")
    } else {
      setModelName(prov.defaultModel)
    }
    if (prov.defaultBaseUrl) {
      setBaseUrl(prov.defaultBaseUrl)
    } else {
      setBaseUrl("")
    }
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    setSaveErrorMsg("")
    try {
      const res = await apiFetch<{ ok: boolean; message: string; latencyMs?: number }>("ai-settings-test", {
        method: "POST",
        body: JSON.stringify({
          id: editingId || undefined,
          provider,
          modelName,
          apiKey,
          baseUrl,
        }),
      })
      if (res.data) setTestResult(res.data)
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || "Gagal melakukan uji koneksi.",
      })
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
      const payload: Record<string, any> = {
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
            Konfigurasikan gateway AI multi-model, kustomisasi pesan sapaan apotek, dan kelola basis data vektor (RAG).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-stone-100 p-1 rounded-2xl flex items-center gap-1 border border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab("models")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
            onClick={() => setActiveTab("rag")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
      {/* TAB 2: SAPAAN PEMBUKA CHATBOT (MODUL 4)                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "welcome" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Notifications */}
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
                      className="w-full mt-2 py-1.5 px-2 bg-white text-emerald-950 font-bold rounded-lg text-[10px] hover:bg-emerald-50 transition"
                    >
                      Gunakan Sapaan Ini
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Tambah/Edit Sapaan */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" />
                {editingWelcomeId ? "Edit Pesan Sapaan" : "Buat Sapaan Baru"}
              </h3>

              <form onSubmit={handleSaveWelcome} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Judul / Label Sapaan</label>
                  <input
                    type="text"
                    required
                    value={welcomeFormTitle}
                    onChange={(e) => setWelcomeFormTitle(e.target.value)}
                    placeholder="Contoh: Sapaan Apoteker Hangat"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Konten Sapaan (Gunakan <code className="text-emerald-700">{"{{name}}"}</code> untuk nama pasien)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={welcomeFormContent}
                    onChange={(e) => setWelcomeFormContent(e.target.value)}
                    placeholder="Halo Kak {{name}}, selamat datang di Apotek Herbal Medika! Bagaimana kondisi kesehatan Anda hari ini? Kami siap mendengarkan..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="welcomeActive"
                    checked={welcomeFormActive}
                    onChange={(e) => setWelcomeFormActive(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="welcomeActive" className="text-xs font-medium text-stone-700 cursor-pointer">
                    Jadikan Sapaan Aktif di Chatbot Publik
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    {editingWelcomeId ? "Simpan Perubahan" : "Tambah Sapaan"}
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
                      className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Daftar Sapaan Tersimpan */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900">Koleksi Pesan Sapaan ({welcomeList.length})</h3>
                <span className="text-[11px] text-stone-500">1 pesan aktif digunakan di widget</span>
              </div>

              {isLoadingWelcome ? (
                <div className="p-8 flex justify-center items-center text-stone-400">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : welcomeList.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">Belum ada sapaan tersimpan.</div>
              ) : (
                <div className="space-y-3">
                  {welcomeList.map((wm) => (
                    <div
                      key={wm.id}
                      className={`p-3.5 rounded-2xl border transition space-y-2 ${
                        wm.isActive
                          ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-white border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900">{wm.title}</span>
                          {wm.isActive ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Aktif
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivateWelcome(wm.id)}
                              className="text-[10px] font-semibold text-emerald-700 hover:underline"
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
                            className="p-1 text-stone-400 hover:text-stone-700"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWelcome(wm.id)}
                            className="p-1 text-stone-400 hover:text-red-600"
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
      {/* TAB 3: CUSTOM RAG / VECTOR KNOWLEDGE BASE (MODUL 6)            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "rag" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Notifications */}
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
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-700" />
                  Basis Vektor Katalog Herbal BPOM
                </h3>
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
                    <span>Sedang Mengindeks Vektor...</span>
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

          {/* Semantic Search Tester (Playground) */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-teal-700" />
                Uji Pencarian Vektor Semantik (RAG Playground)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Ketik keluhan atau kata kunci medis bebas untuk melihat Top-3 produk herbal yang paling relevan secara semantik berdasarkan Cosine Similarity.
              </p>
            </div>

            <form onSubmit={handleTestRagSearch} className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Contoh: leher pegal dan kolesterol tinggi, jempol kaki ngilu asam urat..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600"
              />
              <button
                type="submit"
                disabled={isSearchingRag || !ragQuery.trim()}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                {isSearchingRag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>Cari Semantik</span>
              </button>
            </form>

            {ragResults.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold text-stone-700">Top-3 Produk Paling Cocok (Grounding Context):</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ragResults.map((r, idx) => (
                    <div key={idx} className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-950 truncate">{r.metadata?.name || r.product?.name}</span>
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-teal-700 text-white">
                          {(r.score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-3 leading-relaxed">
                        {r.product?.description || r.textChunk}
                      </p>
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
      {/* TAB 1: MODEL AI GATEWAY (EXISTING MULTI-MODEL CRUD)            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "models" && (
        <>
          {/* ── PANEL MODEL TERSIMPAN ── */}
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
                          <p className="text-[11px] text-stone-500 font-medium capitalize mt-0.5">
                            Penyedia: {m.provider}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 text-[11px] text-stone-600 space-y-0.5">
                        <p className="truncate font-mono text-[10px] text-stone-500">
                          Kunci API: {m.hasKey ? m.maskedApiKey : "(belum ada)"}
                        </p>
                        {m.baseUrl && (
                          <p className="truncate text-[10px] text-stone-400 font-mono">
                            URL: {m.baseUrl}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id)
                            fillForm(m)
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 hover:text-emerald-700"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>

                        <div className="flex items-center gap-1.5">
                          {!m.isActive && (
                            <button
                              type="button"
                              onClick={() => handleActivate(m.id)}
                              disabled={isBusy}
                              className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 text-[10px] font-bold transition shadow-xs disabled:opacity-50"
                            >
                              {isBusy ? "Mengaktifkan..." : "Aktifkan"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            disabled={isBusy}
                            className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Hapus model"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── FORM EDIT / TAMBAH MODEL ── */}
          <form onSubmit={handleSaveModel} className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    {editingId ? "Edit Konfigurasi Model" : "Tambah Model AI Baru"}
                  </h2>
                  <p className="text-xs text-stone-500">
                    Atur kunci otentikasi, model inferensi, dan instruksi penyesuaian klinis.
                  </p>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-3">
                  Pilih Penyedia AI
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PROVIDERS.map((prov) => {
                    const isSelected = provider === prov.id
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => handleProviderSelect(prov)}
                        className={`text-left rounded-2xl p-3.5 border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500/20"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <span className="font-bold text-xs text-stone-900">{prov.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600">
                            {prov.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 leading-snug line-clamp-2">
                          {prov.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Model & Endpoint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Model
                  </label>
                  {currentProviderConfig.models.length > 0 ? (
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600"
                    >
                      {currentProviderConfig.models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Contoh: llama3.3:latest atau mistral"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600 font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Base URL / Endpoint Kustom (Opsional)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={currentProviderConfig.defaultBaseUrl || "https://..."}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kunci API (API Key)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Masukkan kunci API resmi..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-3 pr-10 py-2 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2 text-stone-400 hover:text-stone-600"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    Suhu Responsif (Temperature): {temperature}
                  </label>
                  <span className="text-[10px] text-stone-500">
                    {temperature <= 0.4 ? "Akurasi Medis Terkontrol" : "Lebih Kreatif"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              {/* System Prompt Override */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Instruksi Tambahan (System Prompt Override)
                </label>
                <textarea
                  rows={3}
                  value={systemPromptOverride}
                  onChange={(e) => setSystemPromptOverride(e.target.value)}
                  placeholder="Instruksi tambahan khusus untuk asisten AI apotek Anda..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modelIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="modelIsActive" className="text-xs font-semibold text-stone-800 cursor-pointer">
                  Jadikan Model Aktif Saat Ini
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition active:scale-95"
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-700" /> : <Zap className="h-4 w-4 text-amber-500" />}
                  <span>Uji Koneksi AI</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs active:scale-98"
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
                  testResult.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
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
