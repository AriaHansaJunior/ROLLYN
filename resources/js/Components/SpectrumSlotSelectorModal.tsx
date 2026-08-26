import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, MapPin, Layers, Info, CheckCircle2, Search, MoveRight } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'
import { evaluateSpectrumRecommendation, RollInput, MapSlot } from '@/SPECTRUM/SpectrumRecommendationEngine'

interface OptionItem {
  id: number
  location?: string
  status?: number
  code?: string
  stack_count?: string | null
  rolls?: { no: number; no_roll: string; weight?: number; grade?: any; jop?: any }[]
}

interface SpectrumSlotSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedLocationId: string, recommendedLocationId: string | null, actionType: 'ASSIGN' | 'MOVE') => void
  roll: RollInput | null
  locations: OptionItem[]
  mode?: 'assign' | 'move'
  currentLocationId?: string | number
  currentLocationCode?: string
}

interface RackConfig {
  rack: string
  cols: { col: number; maxRow: number }[]
  special?: string
  specialColSpan?: number
  specialRowStart?: number
  specialRowSpan?: number
}

const RACK_CONFIGS: RackConfig[] = [
  { rack: 'A17', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A16', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'LOADING DOCK 1', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'A15', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A14', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'LOADING DOCK 2', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'A13', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A12', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A11', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A10', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A9', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A8', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A7', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A6', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A5', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'A4', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 12 }], special: 'DOOR', specialColSpan: 3, specialRowStart: 1, specialRowSpan: 12 },
  { rack: 'A3', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'A2', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'A1', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
]

export default function SpectrumSlotSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  roll,
  locations = [],
  mode = 'assign',
  currentLocationId,
  currentLocationCode
}: SpectrumSlotSelectorModalProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedSlotCode, setSelectedSlotCode] = useState<string>('')
  const [activeRackFilter, setActiveRackFilter] = useState<string>('ALL')
  const [searchSlot, setSearchSlot] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Map of all locations from database keyed by location code
  const dbLocationMap = useMemo(() => {
    const map = new Map<string, OptionItem>()
    locations.forEach(loc => {
      const code = loc.location || loc.code || ''
      if (code) {
        map.set(code, loc)
      }
    })
    return map
  }, [locations])

  // Build all slots list with occupancy tracking
  const allDatabaseSlots: MapSlot[] = useMemo(() => {
    return locations.map(l => {
      const rolls = l.rolls || []
      const isFull = rolls.length >= 4
      return {
        id: l.id,
        code: l.location || l.code || '',
        status: isFull ? 2 : 0,
        grade: rolls[0]?.grade?.grade,
        weight: rolls[0]?.weight,
      }
    })
  }, [locations])

  // Run AI recommendation on all available Kolom A slots
  const aiResult = useMemo(() => {
    if (!roll) return null
    return evaluateSpectrumRecommendation(
      roll,
      allDatabaseSlots,
      mode === 'move' ? 'MOVE' : 'ASSIGN',
      currentLocationId
    )
  }, [roll, allDatabaseSlots, mode, currentLocationId])

  // Automatically select current location or recommendation on open
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false)
      if (currentLocationId) {
        setSelectedLocationId(String(currentLocationId))
        setSelectedSlotCode(currentLocationCode || '')
      } else if (aiResult?.recommendedSlot && aiResult.recommendedSlot.id > 0) {
        setSelectedLocationId(String(aiResult.recommendedSlot.id))
        setSelectedSlotCode(aiResult.recommendedSlot.code)
      }
    }
  }, [isOpen, currentLocationId, currentLocationCode, aiResult])

  if (!isOpen || !roll) return null

  const selectedSlotLoc = selectedSlotCode ? dbLocationMap.get(selectedSlotCode) : null
  const selectedSlotRolls = selectedSlotLoc?.rolls || []

  const handleSelectSlot = (code: string) => {
    const loc = dbLocationMap.get(code)
    if (!loc || !loc.id) {
      SystemUI.toast({
        message: `Slot ${code} belum terdaftar di database.`,
        type: 'warning',
        duration: 3000
      })
      return
    }

    const rollsInSlot = loc.rolls || []
    if (rollsInSlot.length >= 4) {
      SystemUI.toast({
        message: `Slot ${code} sudah penuh (4/4 roll). Silakan pilih slot lain.`,
        type: 'warning',
        duration: 3000
      })
      return
    }

    setSelectedLocationId(String(loc.id))
    setSelectedSlotCode(code)
  }

  const handleSlotDoubleClick = (code: string) => {
    const loc = dbLocationMap.get(code)
    if (!loc || !loc.id) return
    const rollsInSlot = loc.rolls || []
    if (rollsInSlot.length >= 4) return

    setSelectedLocationId(String(loc.id))
    setSelectedSlotCode(code)
    setIsSubmitting(true)
    const recommendedId = aiResult?.recommendedSlot ? String(aiResult.recommendedSlot.id) : null
    onConfirm(String(loc.id), recommendedId, mode === 'move' ? 'MOVE' : 'ASSIGN')
  }

  const handleApplyAndConfirmRecommendation = (candidate?: any) => {
    const target = candidate || aiResult?.recommendedSlot
    if (target && target.id > 0) {
      setSelectedLocationId(String(target.id))
      setSelectedSlotCode(target.code)
      setIsSubmitting(true)
      onConfirm(String(target.id), String(target.id), mode === 'move' ? 'MOVE' : 'ASSIGN')
    }
  }

  const handleConfirm = () => {
    if (!selectedLocationId || selectedLocationId === '0') {
      SystemUI.toast({ message: 'Silakan pilih slot lokasi yang valid.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    const recommendedId = aiResult?.recommendedSlot ? String(aiResult.recommendedSlot.id) : null
    onConfirm(selectedLocationId, recommendedId, mode === 'move' ? 'MOVE' : 'ASSIGN')
  }

  const recommendedCode = aiResult?.recommendedSlot?.code || ''

  // Filtered Racks for Kolom A
  const filteredRacks = RACK_CONFIGS.filter(r => {
    if (activeRackFilter !== 'ALL' && r.rack !== activeRackFilter) return false
    if (searchSlot.trim()) {
      const q = searchSlot.trim().toUpperCase()
      return r.rack.toUpperCase().includes(q) || r.cols.some(c => `${r.rack}-${c.col}`.includes(q))
    }
    return true
  })

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="card w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-100 overflow-hidden">
        
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex justify-between items-start shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {mode === 'move' ? 'Pindah Lokasi Roll (Relokasi)' : 'Pilih Slot Lokasi Warehouse'}
                </h3>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Warehouse Kolom A (420 Slots)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap slot dapat menampung hingga <strong>4 roll</strong> bertumpuk di database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Recommendation Banner */}
          {aiResult && aiResult.recommendedSlot && aiResult.recommendedSlot.id > 0 && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 sm:p-4 space-y-2.5 text-slate-800 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                        Rekomendasi Slot Terbaik
                      </span>
                      <span className="bg-white border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
                        SPECTRUM Live
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-extrabold text-blue-950 font-mono">
                        {recommendedCode}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        (Warehouse Kolom A, Rack {aiResult.recommendedSlot.rack})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1-Click Apply and Confirm Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleApplyAndConfirmRecommendation()}
                  className="btn btn-sm px-4 py-2 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  <Check size={15} />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Gunakan & Simpan Slot Rekomendasi'}</span>
                </button>
              </div>

              {/* Reasoning */}
              {aiResult.reasonings.length > 0 && (
                <div className="pt-2 border-t border-blue-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {aiResult.reasonings.map((reason, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{reason}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roll Data & Selected Slot Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-slate-400 font-medium">Roll ID:</span>
                <span className="font-bold text-blue-700 font-mono text-sm ml-1.5">{roll.id || roll.no_roll}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Grade:</span>
                <span className="font-semibold text-slate-800 ml-1">{roll.grade || '—'} ({roll.gsm || 150} g/m²)</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Berat:</span>
                <span className="font-mono text-slate-800 font-bold ml-1">{roll.weight || 0} kg</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Slot Terpilih:</span>
              {selectedSlotCode ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-blue-700 bg-blue-100 border border-blue-300 px-3 py-1 rounded-lg text-xs shadow-xs">
                    {selectedSlotCode} (DB ID: {selectedLocationId})
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-md">
                    {selectedSlotRolls.length === 0 
                      ? 'Kosong (Tumpukan 1/4)' 
                      : `Sudah ada ${selectedSlotRolls.length} roll → Tumpukan ke-${selectedSlotRolls.length + 1}`}
                  </span>
                </div>
              ) : (
                <span className="italic text-slate-400">Belum dipilih</span>
              )}
            </div>
          </div>

          {/* Rack Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Rack / Slot (mis. A17, A1-2-1)..."
                  value={searchSlot}
                  onChange={e => setSearchSlot(e.target.value)}
                  className="form-input text-xs pl-8 py-1 rounded-lg w-56"
                />
              </div>

              <select
                value={activeRackFilter}
                onChange={e => setActiveRackFilter(e.target.value)}
                className="form-select text-xs py-1 rounded-lg font-medium"
              >
                <option value="ALL">Semua Rack (A17 - A1)</option>
                {RACK_CONFIGS.filter(r => !r.special || r.cols.some(c => c.maxRow > 0)).map(r => (
                  <option key={r.rack} value={r.rack}>Rack {r.rack}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <span>Geser kanan →</span>
              <MoveRight size={12} />
            </div>
          </div>

          {/* KOLOM A GRID */}
          <div className="card overflow-x-auto p-3.5 sm:p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl">
            <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
              {filteredRacks.map(config => {
                const { rack, cols, special, specialColSpan, specialRowStart, specialRowSpan } = config
                const rackMaxRows = Math.max(
                  ...cols.map(c => c.maxRow),
                  (specialRowStart && specialRowSpan) ? specialRowStart + specialRowSpan - 1 : 0
                )
                if (rackMaxRows === 0) return null

                return (
                  <div key={rack} className="flex-shrink-0 w-[200px]">
                    <div className="text-center font-bold text-slate-700 bg-slate-100 py-1.5 rounded-t-lg mb-1 text-xs border border-slate-200">
                      Rack {rack}
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-1.5 text-center text-[9px] font-bold text-slate-400">
                      {cols.map(c => (
                        <div key={`${rack}-${c.col}-hdr`}>{c.col}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-1 relative">
                      {Array.from({ length: rackMaxRows }, (_, rowIdx) => {
                        const row = rowIdx + 1
                        return cols.map(c => {
                          const code = `${rack}-${c.col}-${row}`

                          if (special && specialRowStart && specialRowSpan && specialColSpan) {
                            if (c.col === cols[0].col && row === specialRowStart) {
                              return (
                                <div
                                  key={`${rack}-special`}
                                  style={{
                                    gridColumn: `span ${specialColSpan}`,
                                    gridRow: `span ${specialRowSpan}`,
                                  }}
                                  className={`flex items-center justify-center font-bold text-[10px] tracking-wider rounded-md ${
                                    special === 'DOOR'
                                      ? 'bg-slate-100 border border-dashed border-slate-300 text-slate-400'
                                      : 'bg-slate-200 border border-slate-300 text-slate-500'
                                  }`}
                                >
                                  {special}
                                </div>
                              )
                            }
                            if (row >= specialRowStart && row < specialRowStart + specialRowSpan) {
                              if (special === 'DOOR') {
                                const colIndex = cols.findIndex(x => x.col === c.col)
                                if (colIndex < specialColSpan) return null
                              } else {
                                return null
                              }
                            }
                          }

                          if (row > c.maxRow) {
                            return <div key={code} className="w-full aspect-square" />
                          }

                          const loc = dbLocationMap.get(code)
                          const isExists = Boolean(loc && loc.id)
                          const rollsInSlot = loc?.rolls || []
                          const rollsCount = rollsInSlot.length
                          const isFull = rollsCount >= 4
                          const isSelected = selectedSlotCode === code
                          const isRecommended = recommendedCode === code

                          // Visual style based on occupancy
                          let bgStyle = 'bg-white border border-slate-300 text-slate-800 hover:border-blue-500 hover:bg-blue-50'
                          if (rollsCount > 0 && !isFull) {
                            bgStyle = 'bg-slate-700 border-2 border-slate-800 text-white'
                          } else if (isFull) {
                            bgStyle = 'bg-slate-900 border-2 border-slate-950 text-white opacity-90'
                          }

                          return (
                            <button
                              key={code}
                              type="button"
                              disabled={!isExists || isFull}
                              onClick={() => handleSelectSlot(code)}
                              onDoubleClick={() => handleSlotDoubleClick(code)}
                              className={`relative flex flex-col items-center justify-center aspect-square rounded text-[9px] font-bold transition-all ${
                                isSelected
                                  ? 'bg-blue-600 border-2 border-blue-700 text-white ring-2 ring-blue-500 scale-105 z-10 shadow-sm font-extrabold cursor-pointer'
                                  : isRecommended
                                  ? 'bg-blue-50 border-2 border-blue-500 text-blue-900 shadow-sm hover:scale-105 z-10 cursor-pointer font-extrabold'
                                  : isFull
                                  ? 'cursor-not-allowed opacity-60'
                                  : !isExists
                                  ? 'bg-slate-100 border border-dashed border-slate-200 text-slate-300 cursor-not-allowed'
                                  : `${bgStyle} cursor-pointer shadow-xs`
                              }`}
                              title={isFull ? `Slot ${code} sudah penuh (4/4 roll)` : `Klik untuk memilih, double-click untuk langsung simpan slot ${code}`}
                            >
                              {isRecommended && (
                                <span className="absolute -top-1 -right-0.5 bg-blue-600 text-white text-[7px] font-bold px-1 rounded-full">
                                  ★
                                </span>
                              )}
                              <span className="leading-none">{code.replace(`${rack}-`, '')}</span>
                              {rollsCount > 0 && (
                                <span className={`text-[7px] font-black px-1 py-0.2 rounded leading-none mt-0.5 ${
                                  isFull ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'
                                }`}>
                                  {rollsCount}/4
                                </span>
                              )}
                            </button>
                          )
                        })
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ALWAYS-VISIBLE STICKY FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-white border border-slate-300" />
              <span className="text-slate-600 text-[11px]">Kosong (0/4)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-700 border border-slate-800" />
              <span className="text-slate-700 font-bold text-[11px]">Terisi 1-3/4 (Bisa Ditumpuk)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-900 border border-slate-950" />
              <span className="text-slate-500 text-[11px]">Penuh (4/4)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-600 border border-blue-700" />
              <span className="text-blue-700 font-bold text-[11px]">Slot Terpilih</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="btn btn-secondary text-xs px-4 py-2 cursor-pointer font-medium"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!selectedLocationId || selectedLocationId === '0' || isSubmitting}
              onClick={handleConfirm}
              className="btn btn-primary text-xs px-6 py-2.5 cursor-pointer font-extrabold disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-1.5 text-white"
            >
              <Check size={15} />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : selectedSlotCode
                  ? `Konfirmasi Tempatkan ke Slot ${selectedSlotCode}`
                  : 'Konfirmasi Pilih Slot'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
