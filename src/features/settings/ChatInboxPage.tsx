import { useState, useEffect, useRef, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import type { Product } from "@/types"
import {
  MessageSquare,
  Send,
  RotateCcw,
  Bot,
  User,
  Headset,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  MessageCircle,
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  FileText,
  Activity,
} from "lucide-react"

export type LeadStatus = "hot_lead" | "general_inquiry" | "waiting_admin" | "archived"

interface ChatSessionSummary {
  id: string
  status: "ai" | "waiting_admin" | "admin" | "closed"
  stage: string
  handoffReason?: string | null
  customerName: string
  customerPhone?: string | null
  leadStatus: LeadStatus
  adminNotes?: string
  isArchived: boolean
  symptoms: string[]
  createdAt: string
  updatedAt: string
  lastMessage: string
  lastSender: string
}

interface ChatDetailMessage {
  id: string
  sender: "customer" | "bot" | "admin"
  content: string
  products?: Product[]
  createdAt: string
}

interface ChatSessionDetail {
  session: {
    id: string
    status: "ai" | "waiting_admin" | "admin" | "closed"
    stage: string
    handoffReason?: string | null
    customerName?: string | null
    customerPhone?: string | null
    leadStatus?: LeadStatus | null
    adminNotes?: string | null
    isArchived?: boolean
    symptomsJson?: string | null
    createdAt: string
    updatedAt: string
  }
  messages: ChatDetailMessage[]
}

const clock = (iso?: string) =>
  new Date(iso || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

const dateDisplay = (iso?: string) => {
  if (!iso) return ""
  const dt = new Date(iso)
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

const LEAD_BADGES: Record<LeadStatus, { label: string; bg: string; text: string; border: string }> = {
  hot_lead: {
    label: "🔥 Potensi Beli (Hot Lead)",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  general_inquiry: {
    label: "💬 Tanya Jawab Umum",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  waiting_admin: {
    label: "👨‍⚕️ Butuh Admin / CS",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  archived: {
    label: "📦 Diarsipkan / Selesai",
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-200",
  },
}

export function ChatInboxPage() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null)
  const [replyText, setReplyText] = useState("")
  const [adminNotesText, setAdminNotesText] = useState("")
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [actionError, setActionError] = useState<string>("")
  const [actionSuccess, setActionSuccess] = useState<string>("")

  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [filterLeadStatus, setFilterLeadStatus] = useState<string>("all")
  const [filterDate, setFilterDate] = useState<string>("")
  const [filterMonth, setFilterMonth] = useState<string>("")
  const [filterTimeSlot, setFilterTimeSlot] = useState<string>("all")
  const [showArchived, setShowArchived] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Load session list with active filters
  const loadSessions = async (silent = false) => {
    if (!silent) setIsLoadingList(true)
    try {
      const q = new URLSearchParams()
      if (searchQuery) q.set("search", searchQuery)
      if (filterLeadStatus !== "all") q.set("leadStatus", filterLeadStatus)
      if (filterDate) q.set("date", filterDate)
      if (filterMonth) q.set("month", filterMonth)
      if (filterTimeSlot !== "all") q.set("timeSlot", filterTimeSlot)
      q.set("archived", showArchived ? "true" : "false")

      const res = await apiFetch<ChatSessionSummary[]>(`chat-admin?${q.toString()}`)
      if (res.data) {
        setSessions(res.data)
        if (!selectedId && res.data.length > 0) {
          const waiting = res.data.find((s) => s.status === "waiting_admin")
          setSelectedId(waiting ? waiting.id : res.data[0].id)
        }
      }
    } catch (err: any) {
      console.error("Gagal memuat sesi chat:", err)
    } finally {
      if (!silent) setIsLoadingList(false)
    }
  }

  // Load specific session detail
  const loadDetail = async (id: string, silent = false) => {
    if (!silent) setIsLoadingDetail(true)
    try {
      const res = await apiFetch<ChatSessionDetail>(`chat-admin?id=${encodeURIComponent(id)}`)
      if (res.data) {
        setActiveSession(res.data)
        if (!silent) {
          setAdminNotesText(res.data.session.adminNotes || "")
        }
      }
    } catch (err: any) {
      console.error("Gagal memuat percakapan:", err)
    } finally {
      if (!silent) setIsLoadingDetail(false)
    }
  }

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterLeadStatus, filterDate, filterMonth, filterTimeSlot, showArchived])

  // Auto poll list every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      loadSessions(true)
    }, 6000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterLeadStatus, filterDate, filterMonth, filterTimeSlot, showArchived, selectedId])

  // Load detail whenever selectedId changes
  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId)
    }
  }, [selectedId])

  // Auto poll active conversation every 3.5s
  useEffect(() => {
    if (!selectedId) return
    const timer = setInterval(() => {
      loadDetail(selectedId, true)
    }, 3500)
    return () => clearInterval(timer)
  }, [selectedId])

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages, scrollToBottom])

  // Handle reply submit
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !replyText.trim() || isSending) return
    setIsSending(true)
    setActionError("")
    setActionSuccess("")
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedId,
          action: "reply",
          message: replyText.trim(),
        }),
      })
      setReplyText("")
      setActionSuccess("Balasan berhasil dikirim.")
      await loadDetail(selectedId, true)
      await loadSessions(true)
    } catch (err: any) {
      setActionError(err.message || "Gagal mengirim balasan")
    } finally {
      setIsSending(false)
    }
  }

  // Handle handoff back to AI
  const handleReturnToAi = async () => {
    if (!selectedId || isSending) return
    setIsSending(true)
    setActionError("")
    setActionSuccess("")
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, action: "return_to_ai" }),
      })
      setActionSuccess("Percakapan dikembalikan ke AI.")
      await loadDetail(selectedId, true)
      await loadSessions(true)
    } catch (err: any) {
      setActionError(err.message || "Gagal mengembalikan sesi ke AI")
    } finally {
      setIsSending(false)
    }
  }

  // Handle update lead status
  const handleUpdateLeadStatus = async (status: LeadStatus) => {
    if (!selectedId) return
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, action: "update_lead", leadStatus: status }),
      })
      setActionSuccess(`Status prospek diubah ke ${LEAD_BADGES[status].label}`)
      await loadDetail(selectedId, true)
      await loadSessions(true)
    } catch (err: any) {
      setActionError(err.message || "Gagal memperbarui status prospek")
    }
  }

  // Handle save admin notes
  const handleSaveNotes = async () => {
    if (!selectedId || isSavingNotes) return
    setIsSavingNotes(true)
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, action: "update_notes", adminNotes: adminNotesText }),
      })
      setActionSuccess("Catatan admin berhasil disimpan.")
      await loadDetail(selectedId, true)
      await loadSessions(true)
    } catch (err: any) {
      setActionError(err.message || "Gagal menyimpan catatan")
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Handle toggle archive
  const handleToggleArchive = async () => {
    if (!selectedId) return
    const currentArchived = activeSession?.session.isArchived || false
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, action: "toggle_archive", isArchived: !currentArchived }),
      })
      setActionSuccess(currentArchived ? "Sesi diaktifkan kembali." : "Sesi berhasil diarsipkan.")
      await loadDetail(selectedId, true)
      await loadSessions(true)
    } catch (err: any) {
      setActionError(err.message || "Gagal mengubah status arsip")
    }
  }

  // Handle delete session
  const handleDeleteSession = async () => {
    if (!selectedId) return
    if (!window.confirm("Apakah Anda yakin ingin menghapus sesi percakapan ini secara permanen?")) return
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, action: "delete" }),
      })
      setSelectedId(null)
      setActiveSession(null)
      setActionSuccess("Sesi berhasil dihapus.")
      await loadSessions(false)
    } catch (err: any) {
      setActionError(err.message || "Gagal menghapus sesi")
    }
  }

  const activeCustomer = activeSession?.session
  const cleanPhone = (activeCustomer?.customerPhone || "").replace(/^0/, "62").replace(/\D/g, "")
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Halo Kak ${activeCustomer?.customerName || ""}, kami dari Apotek Herbal Medika menindaklanjuti konsultasi kesehatan Anda terkait resep herbal BPOM...`
      )}`
    : null

  let activeSymptoms: string[] = []
  if (activeCustomer?.symptomsJson) {
    try {
      activeSymptoms = JSON.parse(activeCustomer.symptomsJson)
    } catch {
      activeSymptoms = []
    }
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Headset className="h-6 w-6 text-emerald-700" />
              Inbox Chat &amp; CRM Prospek
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {sessions.length} Sesi
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Kelola konsultasi pelanggan, tindak lanjut WhatsApp, segmentasi prospek, dan pengawasan asisten AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Tab Aktif vs Arsip */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !showArchived ? "bg-white text-emerald-800 shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                showArchived ? "bg-white text-emerald-800 shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              Arsip
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadSessions(false)}
            disabled={isLoadingList}
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-xs"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoadingList ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, WhatsApp, keluhan..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-emerald-600"
            />
          </div>

          {/* Filter Status Prospek */}
          <div className="relative">
            <select
              value={filterLeadStatus}
              onChange={(e) => setFilterLeadStatus(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:bg-white focus:outline-emerald-600 cursor-pointer"
            >
              <option value="all">Semua Status Prospek</option>
              <option value="hot_lead">🔥 Potensi Beli (Hot Lead)</option>
              <option value="general_inquiry">💬 Hanya Bertanya</option>
              <option value="waiting_admin">👨‍⚕️ Butuh Admin / CS</option>
            </select>
          </div>

          {/* Filter Tanggal */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value)
                if (e.target.value) setFilterMonth("")
              }}
              title="Filter Tanggal Spesifik"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:bg-white focus:outline-emerald-600 cursor-pointer"
            />
          </div>

          {/* Filter Bulan */}
          <div className="relative flex items-center">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value)
                if (e.target.value) setFilterDate("")
              }}
              title="Filter Bulan"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:bg-white focus:outline-emerald-600 cursor-pointer"
            />
          </div>

          {/* Filter Jam / Slot Waktu */}
          <div className="relative">
            <select
              value={filterTimeSlot}
              onChange={(e) => setFilterTimeSlot(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:bg-white focus:outline-emerald-600 cursor-pointer"
            >
              <option value="all">Semua Jam (24 Jam)</option>
              <option value="morning">🌅 Pagi (06:00 - 11:59)</option>
              <option value="afternoon">☀️ Siang (12:00 - 17:59)</option>
              <option value="evening">🌙 Malam (18:00 - 23:59)</option>
              <option value="night">🌌 Dini Hari (00:00 - 05:59)</option>
            </select>
          </div>
        </div>

        {(searchQuery || filterLeadStatus !== "all" || filterDate || filterMonth || filterTimeSlot !== "all") && (
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
            <span>Menampilkan hasil terfilter</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setFilterLeadStatus("all")
                setFilterDate("")
                setFilterMonth("")
                setFilterTimeSlot("all")
              }}
              className="text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── NOTIFICATIONS ── */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}
      {actionError && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError("")} className="text-red-600 hover:text-red-800">
            &times;
          </button>
        </div>
      )}

      {/* ── MAIN 2-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[680px]">
        {/* KOLOM KIRI: DAFTAR SESI */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-700" />
              Daftar Konsultasi
            </span>
            <span className="text-[11px] text-stone-500 font-medium">{sessions.length} sesi</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {isLoadingList && sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-stone-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-xs">Memuat daftar konsultasi...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-stone-300" />
                <p className="text-xs font-medium text-stone-600">Tidak ada sesi percakapan</p>
                <p className="text-[11px]">Sesi konsultasi baru akan otomatis muncul di sini.</p>
              </div>
            ) : (
              sessions.map((s) => {
                const isSelected = selectedId === s.id
                const badge = LEAD_BADGES[s.leadStatus || "general_inquiry"] || LEAD_BADGES.general_inquiry

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 hover:bg-stone-50 cursor-pointer ${
                      isSelected ? "bg-emerald-50/70 border-l-4 border-l-emerald-600" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {s.customerName || "Tamu Apotek"}
                        </span>
                        {s.status === "waiting_admin" && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">{clock(s.updatedAt)}</span>
                    </div>

                    {/* WhatsApp & Gejala */}
                    {s.customerPhone && (
                      <div className="text-[10px] text-stone-500 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5 text-emerald-600" />
                        <span>{s.customerPhone}</span>
                      </div>
                    )}

                    {/* Badge Prospek */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                      {s.status === "waiting_admin" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">
                          Perlu Tanggapan
                        </span>
                      )}
                    </div>

                    {/* Cuplikan Pesan Terakhir */}
                    <p className="text-[11px] text-stone-600 line-clamp-1">
                      {s.lastSender === "admin" && <span className="font-semibold text-emerald-700">Anda: </span>}
                      {s.lastMessage || "(Belum ada pesan)"}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* KOLOM KANAN: DETAIL PERCAKAPAN & CRM CARD */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          {activeSession ? (
            <>
              {/* Header Sesi Aktif */}
              <div className="p-4 border-b border-stone-200 bg-linear-to-r from-stone-50 to-emerald-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-stone-900 truncate">
                        {activeCustomer?.customerName || "Tamu Apotek"}
                      </h2>
                      {activeCustomer?.customerPhone && (
                        <span className="text-xs text-stone-500 font-medium">
                          ({activeCustomer.customerPhone})
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          LEAD_BADGES[activeCustomer?.leadStatus || "general_inquiry"]?.bg
                        } ${LEAD_BADGES[activeCustomer?.leadStatus || "general_inquiry"]?.text} ${
                          LEAD_BADGES[activeCustomer?.leadStatus || "general_inquiry"]?.border
                        }`}
                      >
                        {LEAD_BADGES[activeCustomer?.leadStatus || "general_inquiry"]?.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Mulai: {dateDisplay(activeCustomer?.createdAt)} pukul {clock(activeCustomer?.createdAt)}
                    </p>
                  </div>
                </div>

                {/* WhatsApp & Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95"
                      title="Follow up pesan langsung via WhatsApp Web / App"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Follow Up WA
                    </a>
                  )}

                  {activeCustomer?.status !== "ai" && (
                    <button
                      type="button"
                      onClick={handleReturnToAi}
                      disabled={isSending}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition"
                      title="Serahkan kembali percakapan ke asisten AI"
                    >
                      <Bot className="h-3.5 w-3.5 text-emerald-700" />
                      Serahkan ke AI
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
                    title={activeCustomer?.isArchived ? "Buka dari arsip" : "Arsipkan sesi"}
                  >
                    {activeCustomer?.isArchived ? (
                      <ArchiveRestore className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteSession}
                    className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition"
                    title="Hapus sesi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* CRM Bar: Segmentasi Status Prospek & Gejala Terdata */}
              <div className="px-4 py-2 bg-stone-100/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-stone-600">Ubah Status Prospek:</span>
                  <div className="flex items-center gap-1">
                    {(["hot_lead", "general_inquiry", "waiting_admin", "archived"] as LeadStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateLeadStatus(st)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                          activeCustomer?.leadStatus === st
                            ? "bg-white text-stone-900 border-stone-400 shadow-xs"
                            : "bg-transparent text-stone-500 border-transparent hover:bg-white/60"
                        }`}
                      >
                        {st === "hot_lead"
                          ? "🔥 Hot Lead"
                          : st === "general_inquiry"
                            ? "💬 Tanya-tanya"
                            : st === "waiting_admin"
                              ? "👨‍⚕️ Butuh Admin"
                              : "📦 Arsip"}
                      </button>
                    ))}
                  </div>
                </div>

                {activeSymptoms.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-stone-600">
                    <Activity className="h-3 w-3 text-emerald-700" />
                    <span className="font-semibold">Gejala:</span>
                    <span>{activeSymptoms.join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Chat Stream Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50">
                {isLoadingDetail && activeSession.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-stone-400">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  activeSession.messages.map((m) => {
                    const isCustomer = m.sender === "customer"
                    const isAdmin = m.sender === "admin"

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
                      >
                        <div className="flex items-center gap-1 mb-1 px-1">
                          <span className="text-[10px] font-bold text-stone-500">
                            {isCustomer
                              ? activeCustomer?.customerName || "Pelanggan"
                              : isAdmin
                                ? "Admin (Anda)"
                                : "Asisten AI"}
                          </span>
                          <span className="text-[9px] text-stone-400">• {clock(m.createdAt)}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                            isCustomer
                              ? "bg-white text-stone-800 border border-stone-200 rounded-tl-none"
                              : isAdmin
                                ? "bg-emerald-700 text-white rounded-tr-none"
                                : "bg-teal-50 text-stone-800 border border-teal-200 rounded-tr-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>

                          {/* Produk Rekomendasi di pesan AI */}
                          {m.products && m.products.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-teal-200/70 space-y-1.5">
                              <p className="text-[10px] font-bold text-teal-900 uppercase">
                                Produk Direkomendasikan:
                              </p>
                              {m.products.map((p) => (
                                <div
                                  key={p.id}
                                  className="text-[11px] bg-white/80 p-1.5 rounded-lg border border-teal-100 flex items-center justify-between"
                                >
                                  <span className="font-semibold text-stone-800 truncate">{p.name}</span>
                                  <span className="text-emerald-700 font-bold ml-2">Rp {Number(p.price).toLocaleString("id-ID")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Form Balasan Admin & Catatan Pasien */}
              <div className="p-3 bg-white border-t border-stone-200 space-y-2 shrink-0">
                {/* Admin Notes Accordion */}
                <details className="text-xs group">
                  <summary className="cursor-pointer font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 select-none">
                    <FileText className="h-3.5 w-3.5 text-stone-500" />
                    <span>Catatan Khusus Pasien (Internal Apotek)</span>
                  </summary>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={adminNotesText}
                      onChange={(e) => setAdminNotesText(e.target.value)}
                      placeholder="Contoh: Pasien ada riwayat alergi parasetamol, follow-up hari Kamis..."
                      className="flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-800 focus:bg-white focus:outline-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-3 py-1.5 bg-stone-800 text-white rounded-xl text-xs font-semibold hover:bg-stone-900 transition"
                    >
                      {isSavingNotes ? "Menyimpan..." : "Simpan Catatan"}
                    </button>
                  </div>
                </details>

                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tulis pesan balasan langsung ke pelanggan..."
                    disabled={isSending}
                    className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition shadow-xs active:scale-95"
                    title="Kirim Balasan"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-8 space-y-2">
              <Headset className="h-12 w-12 text-stone-300" />
              <p className="text-sm font-semibold text-stone-700">Pilih sesi percakapan</p>
              <p className="text-xs text-stone-500 text-center max-w-sm">
                Klik salah satu sesi di sebelah kiri untuk melihat transkrip percakapan, riwayat keluhan, dan membalas pelanggan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
