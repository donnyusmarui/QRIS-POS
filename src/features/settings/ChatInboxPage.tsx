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
  ShieldAlert,
  Package,
} from "lucide-react"

interface ChatSessionSummary {
  id: string
  status: "ai" | "waiting_admin" | "admin" | "closed"
  handoffReason?: string | null
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
    handoffReason?: string | null
    createdAt: string
    updatedAt: string
  }
  messages: ChatDetailMessage[]
}

const clock = (iso?: string) =>
  new Date(iso || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

export function ChatInboxPage() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [filter, setFilter] = useState<"all" | "waiting" | "admin" | "closed">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [actionError, setActionError] = useState<string>("")
  const [actionSuccess, setActionSuccess] = useState<string>("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Load session list
  const loadSessions = async (silent = false) => {
    if (!silent) setIsLoadingList(true)
    try {
      const res = await apiFetch<ChatSessionSummary[]>("chat-admin")
      if (res.data) {
        setSessions(res.data)
        // If nothing selected yet and list has items, select first item needing attention
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
      }
    } catch (err: any) {
      console.error("Gagal memuat percakapan:", err)
    } finally {
      if (!silent) setIsLoadingDetail(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto poll list every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      loadSessions(true)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

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
      await loadDetail(selectedId, true)
      await loadSessions(true)
      setActionSuccess("Balasan terkirim ke pelanggan!")
      setTimeout(() => setActionSuccess(""), 3000)
    } catch (err: any) {
      setActionError(err?.message || "Gagal mengirim balasan")
    } finally {
      setIsSending(false)
    }
  }

  // Handle return to AI
  const handleReturnToAi = async () => {
    if (!selectedId || isSending) return
    setIsSending(true)
    setActionError("")
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedId,
          action: "return_to_ai",
        }),
      })
      await loadDetail(selectedId, true)
      await loadSessions(true)
      setActionSuccess("Sesi dikembalikan ke Asisten AI")
      setTimeout(() => setActionSuccess(""), 3000)
    } catch (err: any) {
      setActionError(err?.message || "Gagal mengembalikan ke AI")
    } finally {
      setIsSending(false)
    }
  }

  // Handle close session
  const handleCloseSession = async () => {
    if (!selectedId || isSending) return
    if (!window.confirm("Tandai sesi ini sebagai selesai?")) return
    setIsSending(true)
    setActionError("")
    try {
      await apiFetch("chat-admin", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedId,
          action: "close",
        }),
      })
      await loadDetail(selectedId, true)
      await loadSessions(true)
      setActionSuccess("Sesi ditandai selesai")
      setTimeout(() => setActionSuccess(""), 3000)
    } catch (err: any) {
      setActionError(err?.message || "Gagal menutup sesi")
    } finally {
      setIsSending(false)
    }
  }

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (filter === "waiting") return s.status === "waiting_admin"
    if (filter === "admin") return s.status === "admin"
    if (filter === "closed") return s.status === "closed"
    return true
  })

  const waitingCount = sessions.filter((s) => s.status === "waiting_admin").length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFECE6] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <MessageSquare className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Inbox Konsultasi &amp; Human-in-the-Loop
            </h1>
          </div>
          <p className="mt-1.5 text-xs text-stone-600 leading-relaxed [text-wrap:pretty]">
            Pantau interaksi konsultasi herbal pelanggan dan ambil alih percakapan bila ada pertanyaan khusus atau gejala kritis.
          </p>
        </div>

        {waitingCount > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs font-semibold text-amber-900 shrink-0 animate-pulse">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span>{waitingCount} Sesi Menunggu Respon Admin</span>
          </div>
        )}
      </div>

      {/* ── MAIN WORKSPACE: 2 COLUMNS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-250px)] min-h-[600px]">
        {/* LEFT COLUMN: SESSION LIST (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-[#EFECE6] bg-white flex flex-col overflow-hidden shadow-xs">
          {/* Filter Bar */}
          <div className="p-3 border-b border-stone-200/80 bg-stone-50/70 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">Daftar Sesi</span>
              <button
                type="button"
                onClick={() => loadSessions()}
                disabled={isLoadingList}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition"
                title="Segarkan data"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoadingList ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 ${
                  filter === "all"
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                Semua ({sessions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("waiting")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 ${
                  filter === "waiting"
                    ? "bg-amber-600 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                Perlu Respon {waitingCount > 0 && `(${waitingCount})`}
              </button>
              <button
                type="button"
                onClick={() => setFilter("admin")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 ${
                  filter === "admin"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                Ditangani
              </button>
              <button
                type="button"
                onClick={() => setFilter("closed")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 ${
                  filter === "closed"
                    ? "bg-stone-700 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                Selesai
              </button>
            </div>
          </div>

          {/* Session List Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {isLoadingList && sessions.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Tidak ada sesi dalam kategori ini.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = selectedId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50/60 border-l-4 border-l-emerald-600"
                        : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-stone-500 truncate">
                        #{s.id.slice(-8)}
                      </span>
                      <span className="text-[10px] text-stone-400 tabular-nums">
                        {clock(s.updatedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-stone-800 line-clamp-2 leading-relaxed">
                      {s.lastMessage || "Percakapan baru dimulai..."}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {s.status === "waiting_admin" && (
                        <span className="rounded-md bg-amber-100 text-amber-800 border border-amber-300/80 px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                          Butuh Admin
                        </span>
                      )}
                      {s.status === "admin" && (
                        <span className="rounded-md bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[9px] font-bold">
                          Staf Menangani
                        </span>
                      )}
                      {s.status === "ai" && (
                        <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1">
                          <Bot className="h-2.5 w-2.5" /> AI
                        </span>
                      )}
                      {s.status === "closed" && (
                        <span className="rounded-md bg-stone-200 text-stone-700 px-1.5 py-0.5 text-[9px] font-bold">
                          Selesai
                        </span>
                      )}

                      {s.handoffReason && (
                        <span className="text-[9px] text-amber-700 italic truncate max-w-[140px]">
                          {s.handoffReason}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT CONVERSATION (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-[#EFECE6] bg-white flex flex-col overflow-hidden shadow-xs">
          {!selectedId || !activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <MessageSquare className="h-12 w-12 text-stone-300 mb-3" />
              <p className="text-sm font-bold text-stone-700">Pilih sesi untuk melihat percakapan</p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Anda dapat membaca seluruh riwayat konsultasi pelanggan dan memberikan jawaban langsung.
              </p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-3.5 border-b border-stone-200/80 bg-stone-50/80 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-stone-900 truncate">
                        Sesi Konsultasi #{activeSession.session.id.slice(-8)}
                      </h3>
                      {activeSession.session.status === "waiting_admin" && (
                        <span className="rounded-md bg-amber-500 text-white px-2 py-0.5 text-[9px] font-bold">
                          Menunggu Bantuan Staf
                        </span>
                      )}
                      {activeSession.session.status === "admin" && (
                        <span className="rounded-md bg-blue-600 text-white px-2 py-0.5 text-[9px] font-bold">
                          Ditangani Staf
                        </span>
                      )}
                      {activeSession.session.status === "ai" && (
                        <span className="rounded-md bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold">
                          Asisten AI Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">
                      Mulai: {clock(activeSession.session.createdAt)}
                      {activeSession.session.handoffReason
                        ? ` • Alasan: ${activeSession.session.handoffReason}`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeSession.session.status !== "ai" && (
                    <button
                      type="button"
                      onClick={handleReturnToAi}
                      disabled={isSending}
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition"
                      title="Kembalikan penanganan ke AI"
                    >
                      Kembalikan ke AI
                    </button>
                  )}
                  {activeSession.session.status !== "closed" && (
                    <button
                      type="button"
                      onClick={handleCloseSession}
                      disabled={isSending}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-100 disabled:opacity-50 transition"
                      title="Tandai selesai"
                    >
                      Tutup Sesi
                    </button>
                  )}
                </div>
              </div>

              {/* Handoff Reason Banner if applicable */}
              {activeSession.session.handoffReason && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center gap-2 shrink-0">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Pemicu Bantuan Staf:</strong> {activeSession.session.handoffReason}
                  </span>
                </div>
              )}

              {/* Message Transcript */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/40">
                {isLoadingDetail && activeSession.messages.length === 0 ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  activeSession.messages.map((m) => {
                    const isCustomer = m.sender === "customer"
                    const isAdmin = m.sender === "admin"
                    const isBot = m.sender === "bot"

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-stone-400">
                          {isCustomer && (
                            <span className="font-semibold text-emerald-800 flex items-center gap-1">
                              <User className="h-3 w-3" /> Pelanggan
                            </span>
                          )}
                          {isAdmin && (
                            <span className="font-semibold text-amber-700 flex items-center gap-1">
                              <Headset className="h-3 w-3" /> Staf / Admin
                            </span>
                          )}
                          {isBot && (
                            <span className="font-semibold text-stone-600 flex items-center gap-1">
                              <Bot className="h-3 w-3 text-emerald-600" /> Asisten AI
                            </span>
                          )}
                          <span className="tabular-nums">• {clock(m.createdAt)}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                            isCustomer
                              ? "bg-white text-stone-900 border border-stone-200/80 rounded-tl-none"
                              : isAdmin
                              ? "bg-amber-100/90 text-amber-950 border border-amber-200 rounded-tr-none"
                              : "bg-emerald-50/70 text-emerald-950 border border-emerald-200/70 rounded-tr-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>

                          {m.products && m.products.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-emerald-200/60 space-y-1.5">
                              <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                <Package className="h-3 w-3" /> Produk Direkomendasikan:
                              </span>
                              {m.products.map((p) => (
                                <div
                                  key={p.id}
                                  className="text-[11px] bg-white/80 rounded-lg p-1.5 border border-emerald-100 flex items-center justify-between gap-2"
                                >
                                  <span className="font-semibold text-stone-900 truncate">
                                    {p.name} ({p.sku})
                                  </span>
                                  <span className="text-emerald-700 font-bold tabular-nums shrink-0">
                                    Rp {Number(p.price).toLocaleString("id-ID")}
                                  </span>
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

              {/* Action feedback banner */}
              {actionSuccess && (
                <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="bg-red-50 border-t border-red-200 px-4 py-2 text-xs text-red-800 font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Admin Reply Box */}
              <div className="p-3.5 border-t border-stone-200/80 bg-white shrink-0">
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ketik balasan Anda kepada pelanggan..."
                    disabled={isSending || activeSession.session.status === "closed"}
                    className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                  />
                  <button
                    type="submit"
                    disabled={
                      !replyText.trim() || isSending || activeSession.session.status === "closed"
                    }
                    className="press-tactile min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-700 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 disabled:opacity-50 transition"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Kirim Balasan</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="mt-1 text-[10px] text-stone-400">
                  Balasan yang dikirim staf otomatis mengalihkan status sesi ke "Ditangani Staf".
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
