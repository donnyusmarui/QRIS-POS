import { useState } from "react"
import {
  Store,
  RotateCcw,
  CheckCircle2,
  X,
  Utensils,
  Pill,
  Shirt,
  Wrench,
  Sliders,
  Check,
  User,
  Sparkles,
  ShoppingBag,
  Bot,
} from "lucide-react"
import {
  useStoreProfileStore,
  CATEGORY_PRESETS,
  type BusinessCategory,
} from "@/lib/store-profile"

export function StoreProfilePage() {
  const {
    storeName,
    tagline,
    businessCategory,
    terminology,
    applyCategoryPreset,
    updateStoreProfile,
    updateTerminology,
    resetToDefault,
  } = useStoreProfileStore()

  const [profileSuccessMsg, setProfileSuccessMsg] = useState("")

  const activePreset = CATEGORY_PRESETS[businessCategory] || CATEGORY_PRESETS.retail

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Compartment */}
      <div className="border-b border-stone-200/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <span>Pengaturan</span>
              <span>/</span>
              <span className="text-emerald-800 font-bold">Profil &amp; Niche Toko</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-2.5">
              <Store className="h-6 w-6 text-emerald-700" />
              Profil Toko &amp; Multi-Niche SaaS
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Industri: {activePreset.label}
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-xs sm:text-sm text-stone-600 max-w-3xl leading-relaxed">
          Sesuaikan identitas toko, alihkan model bisnis dalam 1 klik (Retail, F&amp;B, Apotek, Fashion, Jasa), dan atur kamus istilah antarmuka agar sesuai dengan brand Anda.
        </p>
      </div>

      {/* Notification Banner */}
      {profileSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{profileSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setProfileSuccessMsg("")}
            className="text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Section 1: Preset Switcher (1-Click Switcher) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              Preset Kategori Industri Bisnis (1-Click Switcher)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Pilih model bisnis Anda. Seluruh label katalog, tombol transaksi, persona bot AI, dan teks greeting akan langsung beradaptasi secara otomatis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetToDefault()
              setProfileSuccessMsg("Pengaturan profil toko berhasil dikembalikan ke standar Retail Umum!")
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Standar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {(Object.keys(CATEGORY_PRESETS) as BusinessCategory[]).map((catKey) => {
            const preset = CATEGORY_PRESETS[catKey]
            const isSelected = businessCategory === catKey
            return (
              <div
                key={catKey}
                onClick={() => {
                  applyCategoryPreset(catKey)
                  setProfileSuccessMsg(`Preset berhasil diubah ke: ${preset.label}! Seluruh modul antarmuka kini sinkron.`)
                }}
                className={`press-tactile relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600"
                    : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/70"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected ? "bg-emerald-700 text-white shadow-xs" : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {catKey === "fnb" && <Utensils className="h-4 w-4" />}
                      {catKey === "pharmacy_herbal" && <Pill className="h-4 w-4" />}
                      {catKey === "fashion" && <Shirt className="h-4 w-4" />}
                      {catKey === "services" && <Wrench className="h-4 w-4" />}
                      {catKey === "custom" && <Sliders className="h-4 w-4" />}
                      {catKey === "retail" && <Store className="h-4 w-4" />}
                    </span>
                    {isSelected && (
                      <span className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-2xs">
                        <Check className="h-3 w-3 stroke-[3]" /> Aktif
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-stone-900">{preset.label}</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">{preset.description}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100/80 flex items-center justify-between text-[10px] text-stone-400">
                  <span className="font-medium">Tombol: {preset.terminology.buyButtonText}</span>
                  <span className="font-semibold text-emerald-700">Terapkan</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 2: Store Information & Terminology Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Store Profile */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-700" />
              Identitas Usaha &amp; Merchant
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Informasi ini muncul di portal pelanggan, struk pembayaran, dan standee QR kasir.
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Nama Toko / Bisnis *</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => updateStoreProfile({ storeName: e.target.value })}
                placeholder="Contoh: Toko Berkah Retail"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Slogan / Tagline Usaha</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => updateStoreProfile({ tagline: e.target.value })}
                placeholder="Contoh: Belanja Cepat, Hemat & Terpercaya"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-[11px] text-stone-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Store className="h-3.5 w-3.5 text-emerald-700" />
                <span>Status White-Label Multi-Tenant:</span>
              </div>
              <p>
                Kategori aktif: <span className="font-bold text-emerald-700">{activePreset.label}</span>.
                Pengaturan disimpan otomatis secara lokal di peramban perangkat kasir ini via Zustand persistensi.
              </p>
            </div>

            {/* Live Interactive UI Preview */}
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-[11px] font-bold text-stone-700 mb-2">
                Pratinjau Langsung Komponen Pelanggan:
              </label>
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">{terminology.catalogHeading}</span>
                  <span className="text-[10px] text-stone-500">Live Preview</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>{terminology.buyButtonText}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-xl border border-emerald-600/40 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800">
                    <Bot className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{terminology.aiButtonText}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Terminology Dictionary */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-700" />
              Kamus Istilah UI &amp; Tombol Transaksi
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Kustomisasi kata spesifik yang tampil pada antarmuka kasir dan portal mandiri pelanggan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Judul Katalog</label>
              <input
                type="text"
                value={terminology.catalogHeading}
                onChange={(e) => updateTerminology({ catalogHeading: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Teks Tombol Beli / CTA</label>
              <input
                type="text"
                value={terminology.buyButtonText}
                onChange={(e) => updateTerminology({ buyButtonText: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Nama Persona Asisten AI</label>
              <input
                type="text"
                value={terminology.aiPersonaTitle}
                onChange={(e) => updateTerminology({ aiPersonaTitle: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Tombol Chatbot AI</label>
              <input
                type="text"
                value={terminology.aiButtonText}
                onChange={(e) => updateTerminology({ aiButtonText: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-stone-700 font-semibold mb-1">Placeholder Kotak Pencarian</label>
              <input
                type="text"
                value={terminology.searchPlaceholder}
                onChange={(e) => updateTerminology({ searchPlaceholder: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Teks Keranjang Kosong</label>
              <input
                type="text"
                value={terminology.cartEmptyText}
                onChange={(e) => updateTerminology({ cartEmptyText: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Judul Rincian Struk</label>
              <input
                type="text"
                value={terminology.itemReceiptTitle}
                onChange={(e) => updateTerminology({ itemReceiptTitle: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
