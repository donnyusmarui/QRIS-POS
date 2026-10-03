import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import type { AiProvider } from "@/types"
import {
  Bot,
  Key,
  Sliders,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Cpu,
  Globe,
  Save,
  HelpCircle,
  Pencil,
  Trash2,
  Plus,
  Power,
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
    description: "Inference enterprise mikroservis NVIDIA NIM terakselerasi GPU berkecepatan tinggi.",
  },
  {
    id: "custom_ollama",
    name: "Ollama / Local LLM",
    badge: "Offline / On-Prem",
    models: ["llama3", "mistral", "qwen2.5:7b", "custom"],
    defaultModel: "mistral",
    defaultBaseUrl: "http://localhost:11434/v1",
    description: "Jalankan model AI di server lokal mandiri tanpa biaya langganan API cloud.",
  },
  {
    id: "custom",
    name: "Custom OpenAI Compatible",
    badge: "Universal Endpoint",
    models: ["custom"],
    defaultModel: "",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    description: "Hubungkan ke endpoint OpenAI-compatible kustom manapun (OpenRouter, Together, LM Studio).",
  },
]

export function AiSettingsPage() {
  const [provider, setProvider] = useState<AiProvider>("gemini")
  const [modelName, setModelName] = useState<string>("gemini-2.0-flash")
  const [apiKey, setApiKey] = useState<string>("")
  const [maskedApiKey, setMaskedApiKey] = useState<string>("")
  const [hasKey, setHasKey] = useState<boolean>(false)
  const [baseUrl, setBaseUrl] = useState<string>("")
  const [temperature, setTemperature] = useState<number>(0.4)
  const [systemPromptOverride, setSystemPromptOverride] = useState<string>("")
  const [showKey, setShowKey] = useState<boolean>(false)

  // Status state
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    message: string
    latencyMs?: number
  } | null>(null)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("")
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>("")

  // Daftar model tersimpan + mode form (null = tambah baru, id = edit)
  const [models, setModels] = useState<SavedModel[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fillForm = (m: SavedModel) => {
    setProvider(m.provider)
    setModelName(m.modelName)
    setApiKey("")
    setMaskedApiKey(m.maskedApiKey)
    setHasKey(m.hasKey)
    setBaseUrl(m.baseUrl)
    setTemperature(m.temperature)
    setSystemPromptOverride(m.systemPromptOverride)
    setTestResult(null)
    setSaveErrorMsg("")
  }

  const resetForm = () => {
    setEditingId(null)
    setProvider("gemini")
    setModelName("gemini-2.0-flash")
    setApiKey("")
    setMaskedApiKey("")
    setHasKey(false)
    setBaseUrl("")
    setTemperature(0.4)
    setSystemPromptOverride("")
    setTestResult(null)
    setSaveErrorMsg("")
  }

  const loadModels = async (): Promise<SavedModel[]> => {
    const res = await apiFetch<SavedModel[]>("ai-settings-list")
    const list = res.data || []
    setModels(list)
    return list
  }

  // Muat daftar model; form langsung berisi model yang sedang aktif
  useEffect(() => {
    async function init() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Handle provider switch
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
    setSaveErrorMsg("")
  }

  // Handle Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    setSaveErrorMsg("")
    try {
      const res = await apiFetch<{
        ok: boolean
        latencyMs: number
        provider: string
        model: string
        message: string
      }>("ai-settings-test", {
        method: "POST",
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          provider,
          modelName,
          apiKey: apiKey || (hasKey ? maskedApiKey : ""),
          baseUrl,
        }),
      })

      if (res.data) {
        setTestResult(res.data)
      } else {
        setTestResult({
          ok: false,
          message: res.error || "Gagal melakukan uji koneksi.",
        })
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || "Koneksi gagal atau waktu habis.",
      })
    } finally {
      setIsTesting(false)
    }
  }

  // Handle Save (tambah baru bila editingId null, edit bila terisi)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccessMsg("")
    setSaveErrorMsg("")
    try {
      const isNew = editingId === null
      const res = await apiFetch<{ id: string }>("ai-settings-save", {
        method: "POST",
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          provider,
          modelName: modelName.trim(),
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          temperature,
          systemPromptOverride: systemPromptOverride.trim(),
        }),
      })

      if (res.success) {
        const list = await loadModels()
        const savedId = res.data?.id || editingId
        const saved = list.find((m) => m.id === savedId)
        if (saved) {
          setEditingId(saved.id)
          fillForm(saved)
        }
        setSaveSuccessMsg(isNew ? "Model baru berhasil ditambahkan!" : "Perubahan model berhasil disimpan!")
        setTimeout(() => setSaveSuccessMsg(""), 4000)
      } else {
        setSaveErrorMsg(res.error || "Gagal menyimpan konfigurasi.")
      }
    } catch (err: any) {
      setSaveErrorMsg(err?.message || "Gagal menyimpan konfigurasi.")
    } finally {
      setIsSaving(false)
    }
  }

  const selectedProviderConfig = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0]

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFECE6] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Bot className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Konfigurasi Multi-Model AI Gateway
            </h1>
          </div>
          <p className="mt-1.5 text-xs text-stone-600 leading-relaxed [text-wrap:pretty]">
            Kelola API key dan tentukan model kecerdasan buatan aktif untuk Chatbot Konsultasi Herbal Medika publik.
          </p>
        </div>

        {/* Active Badge */}
        {(() => {
          const active = models.find((m) => m.isActive)
          const name = PROVIDERS.find((p) => p.id === active?.provider)?.name
          return (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-2 text-xs font-semibold text-emerald-800 shrink-0">
              <span className={`flex h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`} />
              <span>{active ? `Model Aktif: ${name || active.provider} (${active.modelName})` : "Belum ada model aktif"}</span>
            </div>
          )
        })()}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* ── DAFTAR MODEL TERSIMPAN ── */}
          <div className="rounded-3xl border border-[#EFECE6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-700" />
                  Model Tersimpan ({models.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Hanya satu model yang aktif melayani chatbot. Edit, hapus, atau tambah model kapan saja.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="press-tactile min-h-[44px] inline-flex items-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Model</span>
              </button>
            </div>

            {models.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-xs text-stone-500">
                Belum ada model tersimpan. Isi form di bawah lalu klik Simpan untuk menambahkan model pertama.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {models.map((m) => {
                  const isEditing = editingId === m.id
                  const busy = busyId === m.id
                  return (
                    <li
                      key={m.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border p-3.5 transition ${
                        isEditing ? "border-emerald-600 bg-emerald-50/40" : "border-stone-200 bg-stone-50/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-stone-900 truncate">
                            {PROVIDERS.find((p) => p.id === m.provider)?.name || m.provider}
                          </span>
                          {m.isActive && (
                            <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white">Aktif</span>
                          )}
                          {isEditing && (
                            <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">Sedang diedit</span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-stone-600 truncate mt-0.5">{m.modelName}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Key: {m.hasKey ? m.maskedApiKey : "belum diisi"}
                          {m.baseUrl ? ` • ${m.baseUrl}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!m.isActive && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleActivate(m.id)}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 transition"
                            title="Jadikan model aktif"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                            <span className="hidden sm:inline">Aktifkan</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id)
                            fillForm(m)
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                          title="Edit model"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(m)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                          title="Hapus model"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="text-[11px] font-semibold text-emerald-800">
              {editingId ? "Mode: mengedit model terpilih — ubah form di bawah lalu Simpan." : "Mode: menambah model baru — isi form di bawah lalu Simpan."}
            </p>
          </div>

          {/* ── STEP 1: PILIH PROVIDER AI ── */}
          <div className="rounded-3xl border border-[#EFECE6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-700" />
                  1. Pilih Provider Kecerdasan Buatan (AI Engine)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tersedia integrasi cloud API resmi maupun server lokal (Ollama).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {PROVIDERS.map((prov) => {
                const isSelected = provider === prov.id
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleProviderSelect(prov)}
                    className={`text-left p-4 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600/30 shadow-xs"
                        : "border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-xs text-stone-900">
                          {prov.name}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-emerald-700 text-white"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {prov.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed line-clamp-2">
                        {prov.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-500">
                      <span>Default: {prov.defaultModel}</span>
                      {isSelected && (
                        <span className="font-bold text-emerald-700 flex items-center gap-0.5">
                          Dipilih ✓
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── STEP 2: MODEL SELECTION & API CREDENTIALS ── */}
          <div className="rounded-3xl border border-[#EFECE6] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-700" />
              2. Kredensial &amp; Konfigurasi Model
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Model Name Preset / Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Nama Model ({selectedProviderConfig.name})
                </label>
                <div className="flex gap-2">
                  {selectedProviderConfig.models.filter((m) => m !== "custom").length > 0 && (
                    <select
                      value={selectedProviderConfig.models.includes(modelName) ? modelName : "custom"}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          if (selectedProviderConfig.models.includes(modelName)) {
                            setModelName("")
                          }
                        } else {
                          setModelName(e.target.value)
                        }
                      }}
                      className="rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:bg-white focus:border-emerald-600 focus:outline-hidden transition shrink-0 max-w-[200px]"
                    >
                      {selectedProviderConfig.models
                        .filter((m) => m !== "custom")
                        .map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      <option value="custom">Model Kustom Lainnya...</option>
                    </select>
                  )}

                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder={
                      provider === "nvidia"
                        ? "cth: meta/llama-3.3-70b-instruct"
                        : "Ketik nama model (cth: gpt-4o, mistral, dll)"
                    }
                    className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Pilih preset cepat atau ketik identifier model spesifik dari penyedia AI.
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    API Secret Key
                  </label>
                  {hasKey && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Tersimpan: {maskedApiKey}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      hasKey
                        ? "Kosongkan jika tidak ingin mengubah key lama"
                        : "Masukkan API key (cth: AIzaSy... / sk-...)"
                    }
                    className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 pr-10 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    title={showKey ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  Key disimpan dengan aman di Neon PostgreSQL dan ditransmisikan hanya via Netlify Function terlindungi.
                </p>
              </div>
            </div>

            {/* Base URL (Optional / Ollama / Proxy) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-stone-500" />
                Custom Endpoint / Base URL (Opsional)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Contoh: https://api.openai.com/v1 atau http://localhost:11434/v1"
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
              />
              <p className="text-[11px] text-stone-500">
                Gunakan jika Anda menggunakan reverse proxy, Cloudflare AI Gateway, atau Ollama di jaringan lokal.
              </p>
            </div>
          </div>

          {/* ── STEP 3: ADVANCED PARAMETERS & SYSTEM PROMPT ── */}
          <div className="rounded-3xl border border-[#EFECE6] bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-700" />
              3. Parameter Generatif &amp; Guardrail Medis
            </h2>

            <div className="space-y-4">
              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 uppercase tracking-wider">
                    Kreativitas / Temperature: <span className="tabular-nums font-bold text-emerald-800">{temperature}</span>
                  </span>
                  <span className="text-stone-500 text-[11px]">
                    (0.2 Presisi Ketat — 0.8 Eksploratif)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700 h-2 bg-stone-200 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-stone-500">
                  Rekomendasi nilai <b>0.30 - 0.45</b> untuk konsultasi kesehatan dan resep herbal agar respon akurat secara patologis dan tidak berhalusinasi.
                </p>
              </div>

              {/* System Prompt Override */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Instruksi Sistem Tambahan (*System Prompt Override*)
                </label>
                <textarea
                  rows={3}
                  value={systemPromptOverride}
                  onChange={(e) => setSystemPromptOverride(e.target.value)}
                  placeholder="Ketik instruksi khusus (misal: 'Sapa pelanggan dengan sebutan Sahabat Herbal dan selalu sarankan minum air hangat')."
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 p-3 text-xs text-stone-900 leading-relaxed placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                />
              </div>
            </div>
          </div>

          {/* ── TEST CONNECTION & SAVE ACTIONS ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="press-tactile flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 disabled:opacity-50 transition"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                    <span>Menguji Koneksi...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-emerald-700" />
                    <span>Uji Koneksi AI (*Test Ping*)</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="press-tactile flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF5A2B] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:bg-[#E5481B] active:scale-95 disabled:opacity-50 transition"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
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

            {/* Info Notice */}
            <p className="text-[11px] text-stone-500 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-stone-400" />
              Sistem otomatis beralih ke Mesin Heuristik Klinis jika API Key belum disetel.
            </p>
          </div>

          {/* ── TEST RESULT BANNER ── */}
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
              <div className="flex-1">
                <p className="font-bold">
                  {testResult.ok ? "Verifikasi AI Berhasil!" : "Verifikasi AI Gagal"}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {testResult.message}
                </p>
                {testResult.latencyMs && (
                  <p className="mt-1 text-[10px] font-mono text-emerald-700">
                    Waktu Respon (Latensi): {testResult.latencyMs} ms
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── SAVE SUCCESS BANNER ── */}
          {saveSuccessMsg && (
            <div className="rounded-2xl p-4 text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* ── SAVE ERROR BANNER ── */}
          {saveErrorMsg && (
            <div className="rounded-2xl p-4 text-xs font-bold border border-red-200 bg-red-50 text-red-900 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
