import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, MapPin, Layers, Info, CheckCircle2 } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'
import { evaluateSpectrumRecommendation, RollInput, MapSlot } from '@/SPECTRUM/SpectrumRecommendationEngine'

interface OptionItem {
  id: number
  location?: string
  status?: number
  code?: string
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

  // Build 12x4 slot grid
  const fullMapSlots: MapSlot[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, colIdx) =>
      Array.from({ length: 4 }, (_, tierIdx) => {
        const code = `E17-${String(colIdx + 1).padStart(2, '0')}-${tierIdx + 1}`
        const match = locations.find(l => (l.location || (l as any).code) === code)
        return {
          id: match ? match.id : (colIdx * 4 + tierIdx + 1),
          code,
          status: match ? (match.status ?? 0) : 0,
        }
      })
    ).flat()
  }, [locations])

  // Run slot evaluation
  const aiResult = useMemo(() => {
    if (!roll) return null
    return evaluateSpectrumRecommendation(
      roll,
      fullMapSlots,
      mode === 'move' ? 'MOVE' : 'ASSIGN',
      currentLocationId,
      [1, 2, 3] // Learned operator preference bays
    )
  }, [roll, fullMapSlots, mode, currentLocationId])

  // Automatically select the recommended slot on initial open
  useEffect(() => {
    if (isOpen && aiResult?.recommendedSlot) {
      setSelectedLocationId(String(aiResult.recommendedSlot.id))
      setSelectedSlotCode(aiResult.recommendedSlot.code)
    }
  }, [isOpen, aiResult])

  if (!isOpen || !roll) return null

  // Structural Stacking Constraint: Tier N can only be filled if Tier N-1 below is occupied
  function isTierSelectable(col: number, tier: number): boolean {
    if (tier === 1) return true
    const slotBelowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
    const slotBelow = fullMapSlots.find(s => s.code === slotBelowCode)
    const isBelowFilled = slotBelow
      ? (slotBelow.status !== 0 || String(selectedLocationId) === String(slotBelow.id))
      : false
    return isBelowFilled
  }

  const handleApplyRecommendation = (candidate?: any) => {
    const target = candidate || aiResult?.recommendedSlot
    if (target) {
      setSelectedLocationId(String(target.id))
      setSelectedSlotCode(target.code)
      SystemUI.toast({
        message: `Memilih Slot: ${target.code}`,
        type: 'info',
        duration: 2000
      })
    }
  }

  const handleConfirm = () => {
    if (!selectedLocationId) {
      SystemUI.toast({ message: 'Silakan pilih slot lokasi yang tersedia.', type: 'error' })
      return
    }

    const recommendedId = aiResult?.recommendedSlot ? String(aiResult.recommendedSlot.id) : null
    onConfirm(selectedLocationId, recommendedId, mode === 'move' ? 'MOVE' : 'ASSIGN')
  }

  const recommendedCode = aiResult?.recommendedSlot?.code || ''

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 animate-fade-in">
      <div className="card w-full max-w-4xl p-4 sm:p-6 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto border border-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {mode === 'move' ? 'Pindah Lokasi Roll (Relokasi)' : 'Pilih Slot Lokasi Warehouse'}
                </h3>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Warehouse E17
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'move'
                  ? `Lokasi saat ini: ${currentLocationCode || roll.location || '—'} ➔ Pilih slot lokasi baru`
                  : 'Tentukan slot penyimpanan roll di denah gudang'}
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

        {/* Simplified Recommendation Banner */}
        {aiResult && aiResult.recommendedSlot && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 sm:p-4 space-y-2.5 text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                      Rekomendasi Slot
                    </span>
                    <span className="bg-white border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
                      Terbaik
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-extrabold text-blue-950 font-mono">
                      {recommendedCode}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      (Kolom {String(aiResult.recommendedSlot.col).padStart(2, '0')}, Tier {aiResult.recommendedSlot.tier})
                    </span>
                  </div>
                </div>
              </div>

              {/* Select Recommendation Button */}
              <button
                type="button"
                onClick={() => handleApplyRecommendation()}
                className={`btn btn-sm px-3.5 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSlotCode === recommendedCode
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {selectedSlotCode === recommendedCode ? (
                  <>
                    <Check size={14} /> <span>Slot Dipilih ✓</span>
                  </>
                ) : (
                  <span>Gunakan Rekomendasi</span>
                )}
              </button>
            </div>

            {/* Simple Reasoning List */}
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

            {/* Alternative Candidate Slot Pills */}
            {aiResult.topCandidates.length > 1 && (
              <div className="pt-1.5 border-t border-blue-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 font-medium mr-1">Alternatif Lain:</span>
                {aiResult.topCandidates.map((c, index) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleApplyRecommendation(c)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border transition-colors cursor-pointer ${
                      selectedSlotCode === c.code
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {c.code}
                  </button>
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
            {roll.jop && (
              <div>
                <span className="text-slate-400 font-medium">JOP:</span>
                <span className="font-mono text-slate-700 font-semibold ml-1">{roll.jop}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Slot Terpilih:</span>
            {selectedSlotCode ? (
              <span className="font-mono font-extrabold text-blue-700 bg-blue-100 border border-blue-300 px-3 py-1 rounded-lg text-xs shadow-xs">
                {selectedSlotCode}
              </span>
            ) : (
              <span className="italic text-slate-400">Belum dipilih</span>
            )}
          </div>
        </div>

        {/* Interactive Warehouse Grid (12 Columns x 4 Tiers) */}
        <div className="card overflow-x-auto p-3 sm:p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl">
          <div className="flex flex-col gap-2 min-w-[760px]">
            {/* Column Headers 01 - 12 */}
            <div className="grid grid-cols-12 gap-2 text-center text-[11px] font-extrabold text-slate-500">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(col => (
                <div key={col} className="bg-slate-200/60 rounded py-0.5">
                  Bay {String(col).padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Tier Rows 1 - 4 */}
            {[1, 2, 3, 4].map(tier => (
              <div key={tier} className="grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }, (_, colIdx) => {
                  const col = colIdx + 1
                  const code = `E17-${String(col).padStart(2, '0')}-${tier}`
                  const slot = fullMapSlots.find(s => s.code === code) || { id: 0, code, status: 0 }
                  const isCurrent = currentLocationCode === code
                  const isSelected = String(selectedLocationId) === String(slot.id)
                  const isOccupied = slot.status !== 0 && !isCurrent
                  const isSelectable = !isOccupied && isTierSelectable(col, tier)
                  const isRecommended = recommendedCode === code

                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={!isSelectable}
                      onClick={() => {
                        if (!isSelectable && !isOccupied) {
                          const belowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
                          SystemUI.toast({
                            message: `Tidak bisa memilih ${code}. Slot ${belowCode} di bawahnya harus terisi lebih dulu.`,
                            type: 'warning',
                            duration: 3500
                          })
                          return
                        }
                        setSelectedLocationId(String(slot.id))
                        setSelectedSlotCode(code)
                      }}
                      className={`relative flex flex-col items-center justify-center py-2.5 px-0.5 min-h-[44px] rounded-xl text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap leading-none ${
                        isSelected
                          ? 'bg-blue-600 border-2 border-blue-700 text-white ring-2 ring-blue-500 ring-offset-1 scale-105 z-20 shadow-md font-extrabold cursor-pointer'
                          : isRecommended
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-900 shadow-sm hover:scale-105 z-10 cursor-pointer font-extrabold'
                          : isOccupied
                          ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                          : !isSelectable
                          ? 'bg-slate-100 border border-dashed border-slate-300 text-slate-400 cursor-not-allowed opacity-50'
                          : 'bg-white border border-slate-300 text-slate-800 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 cursor-pointer shadow-xs'
                      }`}
                      title={!isSelectable && !isOccupied ? `Isi tier di bawahnya dulu: E17-${String(col).padStart(2, '0')}-${tier - 1}` : code}
                    >
                      {isRecommended && (
                        <span className="absolute -top-1.5 -right-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                          Saran
                        </span>
                      )}
                      <span className="whitespace-nowrap tracking-tighter">{code}</span>
                      <span className="text-[8px] font-normal opacity-70 mt-0.5">T{tier}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-white border border-slate-300" />
              <span className="text-slate-600 text-[11px]">Kosong (Tersedia)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-500" />
              <span className="text-blue-700 font-bold text-[11px]">Rekomendasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-600 border border-blue-700" />
              <span className="text-slate-800 font-bold text-[11px]">Slot Terpilih</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-300 border border-slate-400" />
              <span className="text-slate-500 text-[11px]">Terisi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-100 border border-dashed border-slate-300" />
              <span className="text-slate-400 text-[11px]">Isi Tier Bawah Dulu</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn btn-secondary text-xs px-4 py-2 cursor-pointer font-medium"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs px-5 py-2 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 shadow-sm"
              disabled={!selectedLocationId}
              onClick={handleConfirm}
            >
              {mode === 'move' ? 'Konfirmasi Pindah Slot' : 'Konfirmasi Pilih Slot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
