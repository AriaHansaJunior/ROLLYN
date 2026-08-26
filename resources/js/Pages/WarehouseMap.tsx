import { useState, useEffect, useMemo } from 'react'
import { X, Package, MoveRight, Layers, Eye, MapPin, Calendar, AlertCircle, PlusCircle, CheckCircle2 } from 'lucide-react'
import { Link, router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

type SlotStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface LocationItem {
  id: number
  location: string
  status: number
  stack_count?: string | null
  rolls?: { no: number; no_roll: string; weight?: number; grade?: any; jop?: any }[]
}

interface UnslottedRoll {
  id: string
  raw_id: number
  no_roll: string
  grade: string
  gsm: number
  weight: number
  date: string
  jop: string
}

interface SlotRoll {
  id: number
  number: string
  weight?: number
  grade?: string
  gsm?: number
}

interface Slot {
  id: number
  code: string
  status: SlotStatus
  stackCount?: string | null
  rollId?: number
  rollNumber?: string
  weight?: number
  grade?: string
  gsm?: number
  width?: number
  rollsList: SlotRoll[]
}

interface Props {
  locations?: LocationItem[]
  unslottedRolls?: UnslottedRoll[]
}

const statusConfig: Record<number, { label: string; bgClass: string; dot: string }> = {
  0: { label: 'Free Space (0/4)', bgClass: 'bg-white border-2 border-gray-300 text-gray-800', dot: '#ffffff' },
  1: { label: 'Slot Planning', bgClass: 'bg-gray-200 border-2 border-gray-300 text-gray-800', dot: '#e5e7eb' },
  2: { label: 'Slotted', bgClass: 'bg-gray-500 border-2 border-gray-600 text-white', dot: '#6b7280' },
  3: { label: 'Shipment Plan', bgClass: 'bg-green-600 border-2 border-green-700 text-white', dot: '#16a34a' },
  4: { label: 'Non-PO', bgClass: 'bg-red-600 border-2 border-red-700 text-white', dot: '#dc2626' },
  5: { label: 'Move to Another Warehouse', bgClass: 'bg-yellow-400 border-2 border-yellow-500 text-gray-900', dot: '#facc15' },
  6: { label: 'HOLD', bgClass: 'bg-blue-500 border-2 border-blue-600 text-white', dot: '#3b82f6' },
}

const stackCountOptions = ['✓', '2', '3', '4'];

// Define each rack's structure: which sub-columns exist and how many rows each sub-column has
interface RackConfig {
  rack: string
  cols: { col: number; maxRow: number }[]
  special?: string
  specialColSpan?: number
  specialRowStart?: number
  specialRowSpan?: number
}

const RACK_CONFIGS: RackConfig[] = [
  // A17: 4 × 6
  { rack: 'A17', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A16: LOADING DOCK 1 — 4 × 6
  { rack: 'A16', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'LOADING DOCK 1', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  // A15: 4 × 6
  { rack: 'A15', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A14: LOADING DOCK 2 — 4 × 6
  { rack: 'A14', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'LOADING DOCK 2', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  // A13: 4 × 6
  { rack: 'A13', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A12: 4 × 6
  { rack: 'A12', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A11: 4 × 6
  { rack: 'A11', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A10: 4 × 6
  { rack: 'A10', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A9: 4 × 6
  { rack: 'A9', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A8: 4 × 6
  { rack: 'A8', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A7: 4 × 6
  { rack: 'A7', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A6: 4 × 6
  { rack: 'A6', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A5: 4 × 6
  { rack: 'A5', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A4: 1 × 12 (col 1) + DOOR 3 × 12 (cols 4,3,2)
  { rack: 'A4', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 12 }], special: 'DOOR', specialColSpan: 3, specialRowStart: 1, specialRowSpan: 12 },
  // A3: 4 × 12
  { rack: 'A3', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  // A2: 4 × 12
  { rack: 'A2', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  // A1: 4 × 12
  { rack: 'A1', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
];

export default function WarehouseMap({ locations = [], unslottedRolls = [] }: Props) {
  const [selectedSlotCodes, setSelectedSlotCodes] = useState<string[]>([])
  const [editStatus, setEditStatus] = useState<number>(0)
  const [editStackCount, setEditStackCount] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [multiSelectMode, setMultiSelectMode] = useState(false)

  const [selectRowsOn, setSelectRowsOn] = useState(false)
  const [selectColOn, setSelectColOn] = useState(false)
  const [selectBlockOn, setSelectBlockOn] = useState(false)

  // Direct roll assignment from sidebar
  const [selectedUnslottedRollId, setSelectedUnslottedRollId] = useState<string>('')
  const [isAssigningFromSidebar, setIsAssigningFromSidebar] = useState(false)

  function toggleMode(mode: 'row' | 'col' | 'block') {
    let newModeState = false
    if (mode === 'row') { setSelectRowsOn(p => !p); newModeState = !selectRowsOn }
    if (mode === 'col') { setSelectColOn(p => !p); newModeState = !selectColOn }
    if (mode === 'block') { setSelectBlockOn(p => !p); newModeState = !selectBlockOn }

    if (newModeState) {
      setMultiSelectMode(true)
    }
  }

  const [assignMode, setAssignMode] = useState(false)
  const [assignRollId, setAssignRollId] = useState<string | null>(null)
  const [assignRollNo, setAssignRollNo] = useState<string | null>(null)
  const [showAssignPopup, setShowAssignPopup] = useState(false)
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null)
  const [assignForm, setAssignForm] = useState({
    rollNumber: '',
    entryDate: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rollId = params.get('assign_roll')
    const rollNo = params.get('roll_no')
    if (rollId) {
      const decodedRollNo = rollNo ? decodeURIComponent(rollNo) : rollId
      setAssignMode(true)
      setAssignRollId(rollId)
      setAssignRollNo(decodedRollNo)
      setAssignForm({
        rollNumber: decodedRollNo,
        entryDate: new Date().toISOString().slice(0, 10),
      })
    }
  }, [])

  // Build a lookup map for quick slot access
  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>()
    locations.forEach(loc => {
      const rolls = loc.rolls || []
      const primaryRoll = rolls.length > 0 ? rolls[0] : null
      map.set(loc.location, {
        id: loc.id,
        code: loc.location,
        status: (loc.status >= 0 && loc.status <= 6 ? loc.status : 0) as SlotStatus,
        stackCount: loc.stack_count || (rolls.length > 0 ? (rolls.length === 1 ? '✓' : String(rolls.length)) : null),
        rollId: primaryRoll?.no,
        rollNumber: primaryRoll?.no_roll,
        weight: primaryRoll?.weight,
        grade: primaryRoll?.grade?.grade,
        gsm: primaryRoll?.jop?.gsm?.gsm,
        width: primaryRoll?.jop?.rollsWidth?.width,
        rollsList: rolls.map(r => ({
          id: r.no,
          number: r.no_roll,
          weight: r.weight,
          grade: r.grade?.grade,
          gsm: r.jop?.gsm?.gsm
        })),
      })
    })
    return map
  }, [locations])

  // Derived summaries
  const { totalRolls, totalWeight, specs, totalSlots } = useMemo(() => {
    let rollsCount = 0
    let weightSum = 0
    let slotsCount = 0
    const grdSet = new Set<string>()
    const gsmSet = new Set<number>()
    const rwSet = new Set<number>()

    slotMap.forEach(slot => {
      if (slot.code.startsWith('A')) {
        slotsCount++
        slot.rollsList.forEach(r => {
          rollsCount++
          weightSum += r.weight || 0
          if (r.grade) grdSet.add(r.grade)
          if (r.gsm) gsmSet.add(r.gsm)
        })
      }
    })

    return {
      totalRolls: rollsCount,
      totalWeight: weightSum,
      totalSlots: slotsCount,
      specs: {
        grd: Array.from(grdSet).join(', '),
        gsm: Array.from(gsmSet).join(', '),
        rw: Array.from(rwSet).join(', ')
      }
    }
  }, [slotMap])

  const selectedSlots = useMemo(() => selectedSlotCodes.map(c => slotMap.get(c)).filter(Boolean) as Slot[], [selectedSlotCodes, slotMap])

  function handleSlotClick(code: string) {
    const slot = slotMap.get(code)
    if (!slot || slot.id === 0) {
      SystemUI.toast({
        message: `Slot ${code} belum terdaftar di database.`,
        type: 'warning',
        duration: 3000
      })
      return
    }

    if (assignMode) {
      const count = slot.rollsList.length
      if (count < 4) {
        setAssignSlot(slot)
        setAssignForm({
          rollNumber: assignRollNo || '',
          entryDate: new Date().toISOString().slice(0, 10),
        })
        setShowAssignPopup(true)
      } else {
        SystemUI.toast({
          message: `Slot ${code} sudah penuh (4/4 roll). Silakan pilih slot lain.`,
          type: 'warning',
          duration: 3000
        })
      }
    } else {
      let codesToSelect = new Set<string>([code])

      if (selectRowsOn || selectColOn || selectBlockOn) {
        const parts = code.split('-')
        if (parts.length === 3) {
          const rack = parts[0]
          const col = parts[1]
          const row = parts[2]
          
          const rackConfig = RACK_CONFIGS.find(r => r.rack === rack)
          if (rackConfig) {
            if (selectRowsOn) {
              const colConfig = rackConfig.cols.find(c => c.col.toString() === col)
              if (colConfig) {
                for (let r = 1; r <= colConfig.maxRow; r++) {
                  codesToSelect.add(`${rack}-${col}-${r}`)
                }
              }
            }
            if (selectColOn) {
              rackConfig.cols.forEach(c => {
                if (parseInt(row) <= c.maxRow) {
                  codesToSelect.add(`${rack}-${c.col}-${row}`)
                }
              })
            }
            if (selectBlockOn) {
              rackConfig.cols.forEach(c => {
                for (let r = 1; r <= c.maxRow; r++) {
                  codesToSelect.add(`${rack}-${c.col}-${r}`)
                }
              })
            }
          }
        }
      }

      const codesArray = Array.from(codesToSelect).filter(c => slotMap.has(c))

      if (multiSelectMode) {
        setSelectedSlotCodes(prev => {
          const prevSet = new Set(prev)
          const allCurrentlySelected = codesArray.every(c => prevSet.has(c))
          
          if (allCurrentlySelected) {
            codesArray.forEach(c => prevSet.delete(c))
          } else {
            codesArray.forEach(c => prevSet.add(c))
          }
          return Array.from(prevSet)
        })
      } else {
        setSelectedSlotCodes([code])
      }
    }
  }

  function cancelAssignMode() {
    setAssignMode(false)
    setAssignRollId(null)
    setAssignRollNo(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('assign_roll')
    url.searchParams.delete('roll_no')
    window.history.replaceState({}, '', url.toString())
  }

  function handleUpdateLocation() {
    if (selectedSlots.length === 0) return
    setIsUpdating(true)
    
    router.put(`/locations/bulk-update`, {
      ids: selectedSlots.map(s => s.id).filter(id => id > 0),
      status: editStatus,
      stack_count: editStackCount === '' ? null : editStackCount,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsUpdating(false)
        SystemUI.toast({ message: 'Status lokasi berhasil diperbarui di database.', type: 'success' })
      },
      onError: () => {
        setIsUpdating(false)
        SystemUI.toast({ message: 'Gagal memperbarui status lokasi di database.', type: 'error' })
      }
    })
  }

  function handleAssignFromSidebar() {
    if (!selectedUnslottedRollId || selectedSlots.length !== 1 || !selectedSlots[0].id) {
      SystemUI.toast({ message: 'Pilih roll yang ingin ditempatkan.', type: 'warning' })
      return
    }

    const targetSlot = selectedSlots[0]
    if (targetSlot.rollsList.length >= 4) {
      SystemUI.toast({ message: `Slot ${targetSlot.code} sudah penuh (4/4 roll).`, type: 'error' })
      return
    }

    setIsAssigningFromSidebar(true)

    router.put(`/rolls/${selectedUnslottedRollId}`, {
      locations_id: String(targetSlot.id),
      action_type: 'ASSIGN',
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsAssigningFromSidebar(false)
        setSelectedUnslottedRollId('')
        SystemUI.toast({
          message: `Roll berhasil ditempatkan di slot ${targetSlot.code} (Tumpukan ke-${targetSlot.rollsList.length + 1})!`,
          type: 'success'
        })
      },
      onError: () => {
        setIsAssigningFromSidebar(false)
        SystemUI.toast({ message: 'Gagal menempatkan roll ke database.', type: 'error' })
      }
    })
  }

  // Sync edit state when selection changes
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const lastSlot = selectedSlots[selectedSlots.length - 1]
      if (lastSlot) {
        setEditStatus(lastSlot.status)
        setEditStackCount(lastSlot.stackCount || '')
      }
    }
  }, [selectedSlotCodes])

  // Render a single slot cell
  function renderSlotCell(code: string, row: number) {
    const slot = slotMap.get(code)
    if (!slot) {
      return (
        <div key={code} className="relative group">
          <div className="flex items-center justify-center w-full aspect-square rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-[10px] tracking-tighter leading-none font-bold text-center text-slate-400 cursor-not-allowed">
            {code}
          </div>
          <div className="hidden md:block absolute bottom-full mb-2 w-max px-3 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl whitespace-nowrap left-1/2 -translate-x-1/2">
            Location: <span className="font-bold text-slate-300">{code}</span> | Status: Not in Database
            <div className="absolute top-full border-4 border-transparent border-t-slate-900 left-1/2 -translate-x-1/2"></div>
          </div>
        </div>
      )
    }

    const rollsCount = slot.rollsList.length
    const isFull = rollsCount >= 4
    const isAvailableToAssign = rollsCount < 4
    const isSelected = selectedSlotCodes.includes(code)
    const isAssignTarget = assignMode && isAvailableToAssign

    // Visual background config
    let bgStyle = statusConfig[slot.status]?.bgClass || 'bg-white border-2 border-gray-300 text-gray-800'
    if (slot.status === 3) {
      bgStyle = 'bg-emerald-600 border-2 border-emerald-700 text-white shadow-xs'
    } else if (slot.status === 4) {
      bgStyle = 'bg-rose-600 border-2 border-rose-700 text-white shadow-xs'
    } else if (slot.status === 5) {
      bgStyle = 'bg-amber-400 border-2 border-amber-500 text-slate-900 shadow-xs'
    } else if (slot.status === 6) {
      bgStyle = 'bg-blue-600 border-2 border-blue-700 text-white shadow-xs'
    } else if (rollsCount > 0 && !isFull) {
      bgStyle = 'bg-slate-700 border-2 border-slate-800 text-white shadow-xs'
    } else if (isFull) {
      bgStyle = 'bg-slate-900 border-2 border-slate-950 text-white shadow-md'
    }

    return (
      <div key={code} className="relative group">
        <button
          onClick={() => handleSlotClick(code)}
          className={`flex flex-col items-center justify-center w-full aspect-square rounded-md text-[10px] tracking-tighter leading-none font-bold text-center acos-smooth-hover cursor-pointer shadow-sm relative ${
            isSelected
              ? `${bgStyle} ring-4 ring-offset-2 ring-indigo-500 scale-105 z-10 transition-transform`
              : isAssignTarget
                ? `${bgStyle} ring-2 ring-emerald-400 hover:ring-4 hover:ring-emerald-500 hover:scale-105 transition-all`
                : `${bgStyle}`
          }`}
        >
          <span>{code}</span>
          
          {/* Multi-Roll Stack Count Indicator */}
          {rollsCount > 0 ? (
            <div className="mt-1 flex items-center gap-0.5">
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded leading-none flex items-center justify-center shadow-xs ${
                isFull 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-emerald-400 text-slate-950'
              }`}>
                {rollsCount}/4
              </span>
            </div>
          ) : slot.stackCount ? (
            <span className="mt-1 text-[9px] font-black text-slate-800 bg-white/60 px-1 py-0.2 rounded shadow-sm leading-none">
              {slot.stackCount}
            </span>
          ) : null}
        </button>

        {/* Rich Tooltip */}
        <div className="hidden md:block absolute bottom-full mb-2 w-max px-3 py-2 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl whitespace-nowrap left-1/2 -translate-x-1/2">
          <div className="font-bold text-blue-300">Location: {code} (DB ID: {slot.id})</div>
          <div className="text-slate-300 text-[10px] mt-0.5">
            Kapasitas: <span className="font-bold text-white">{rollsCount} / 4 Roll</span>
            {isFull ? ' (PENUH)' : ` (${4 - rollsCount} slot tersisa)`}
          </div>
          {rollsCount > 0 && (
            <div className="text-[10px] text-slate-400 border-t border-slate-700 mt-1 pt-1 space-y-0.5">
              {slot.rollsList.map((r, i) => (
                <div key={r.id}>
                  #{i + 1}: <span className="font-bold text-white font-mono">{r.number}</span> ({r.grade || '—'}, {r.weight || 0}kg)
                </div>
              ))}
            </div>
          )}
          <div className="absolute top-full border-4 border-transparent border-t-slate-900 left-1/2 -translate-x-1/2"></div>
        </div>
      </div>
    )
  }

  // Render a single rack section
  function renderRack(config: RackConfig) {
    const { rack, cols, special, specialColSpan, specialRowStart, specialRowSpan } = config

    const rackMaxRows = Math.max(
      ...cols.map(c => c.maxRow),
      (specialRowStart && specialRowSpan) ? specialRowStart + specialRowSpan - 1 : 0
    )

    if (rackMaxRows === 0) return null

    return (
      <div key={rack} className="flex-shrink-0 w-[220px]">
        {/* Rack Header */}
        <div className="text-center font-bold text-slate-700 bg-slate-100 py-1.5 rounded-t-lg mb-1 text-sm border border-slate-200">
          Rack {rack}
        </div>
        {/* Sub-column headers */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {cols.map(c => (
            <div key={`${rack}-${c.col}-hdr`} className="text-center text-[10px] font-bold text-slate-400">
              {c.col}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        <div className="grid grid-cols-4 gap-1.5 relative">
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
                      className={`flex items-center justify-center font-bold text-xs tracking-wider rounded-md z-0 ${
                        special === 'DOOR'
                          ? 'bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400'
                          : 'bg-slate-200 border-2 border-slate-300 text-slate-500 shadow-inner'
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

              return renderSlotCell(code, row)
            })
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Warehouse Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">Denah tata letak gudang Kolom A — Kapasitas hingga 4 roll per slot</p>
        </div>
      </div>

      {/* Assignment Mode Banner */}
      {assignMode && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin size={18} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-blue-900">Assign Roll Mode (Kapasitas maks 4 roll)</div>
              <div className="text-xs text-blue-700 truncate">
                Assigning roll <span className="font-bold font-mono">{assignRollNo}</span> — Pilih slot yang tersedia (&lt; 4 roll) di peta
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary text-xs px-3 py-1.5 shrink-0 cursor-pointer"
            onClick={cancelAssignMode}
          >
            Batal Mode Assign
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6 overflow-x-hidden w-full relative">

        {/* Warehouse Grid Container */}
        <div className="flex-1 min-w-0 transition-all duration-500 ease-in-out transform-gpu bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                A
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Kolom A (Racks A1 - A17)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">420 Slots × Maks 4 Roll = 1.680 Kapasitas Total</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full p-0.5 shadow-sm">
                <button
                  onClick={() => toggleMode('row')}
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-1 rounded-full transition-colors cursor-pointer ${
                    selectRowsOn ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                  title="Select all rows vertically in this column"
                >
                  Rows
                </button>
                <button
                  onClick={() => toggleMode('col')}
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-1 rounded-full transition-colors cursor-pointer ${
                    selectColOn ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                  title="Select all columns horizontally in this row"
                >
                  Columns
                </button>
                <button
                  onClick={() => toggleMode('block')}
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-1 rounded-full transition-colors cursor-pointer ${
                    selectBlockOn ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                  title="Select entire block"
                >
                  Block
                </button>
              </div>

              <button
                onClick={() => {
                  setMultiSelectMode(!multiSelectMode)
                  setSelectedSlotCodes([])
                }}
                className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer shadow-sm ${
                  multiSelectMode 
                    ? 'bg-indigo-600 text-white border-indigo-700' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Layers size={13} />
                <span className="hidden sm:inline">Multi-Select: {multiSelectMode ? 'ON' : 'OFF'}</span>
                <span className="sm:hidden">{multiSelectMode ? 'ON' : 'OFF'}</span>
              </button>
              <div className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <span>Scroll kanan →</span>
                <MoveRight size={13} />
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div className="w-full overflow-x-auto pb-4 pt-2 px-2 snap-x">
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {RACK_CONFIGS.map(config => renderRack(config))}
            </div>
          </div>

          <div className="mt-auto">
            {/* Legend */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Slot Capacity & Status Legend</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-300" />
                  <span className="text-[11px] font-medium text-slate-700">Kosong (0/4)</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-600 bg-emerald-600 text-white">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-white" />
                  <span className="text-[11px] font-bold">Shipment Plan (Siap Kirim)</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-700 text-white">
                  <span className="text-[9px] font-bold bg-emerald-400 text-slate-900 px-1 rounded">1-3/4</span>
                  <span className="text-[11px] font-medium">Terisi Sebagian (Bisa Ditumpuk)</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-900 bg-slate-900 text-white">
                  <span className="text-[9px] font-bold bg-rose-500 text-white px-1 rounded">4/4</span>
                  <span className="text-[11px] font-medium">Penuh (Maks 4 Roll)</span>
                </div>
              </div>
            </div>

            {/* Summary Data */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Total Roll Tersimpan</div>
                <div className="text-lg font-black text-blue-900">{totalRolls}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Total Berat (KGS)</div>
                <div className="text-lg font-black text-emerald-900">{totalWeight.toLocaleString('id-ID', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Total Slot Fisik</div>
                <div className="text-lg font-black text-indigo-900">{totalSlots} ({totalSlots * 4} max rolls)</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Specs Available</div>
                <div className="text-[10px] text-slate-700 font-mono line-clamp-2">
                  <span className="font-bold">GRD:</span> {specs.grd || '-'} <br/>
                  <span className="font-bold">GSM:</span> {specs.gsm || '-'} <br/>
                  <span className="font-bold">RW:</span> {specs.rw || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Sidebar */}
        {!assignMode && (
          <div
            className={`flex-shrink-0 overflow-hidden acos-layout-transition ${
              selectedSlots.length > 0 ? "w-full lg:w-88 opacity-100 max-h-[1200px] mt-2 lg:mt-0" : "w-full lg:w-0 opacity-0 max-h-0 lg:max-h-[1200px]"
            }`}
          >
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3 w-full lg:w-88 h-full acos-sidebar-enter">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    <Layers size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedSlots.length === 1 ? 'Detail Slot & Tumpukan' : 'Multiple Locations'}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500">
                      {selectedSlots.length === 1 ? `${selectedSlots[0].code} (ID: ${selectedSlots[0].id})` : `${selectedSlots.length} slots terpilih`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSlotCodes([])}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Location Info & Capacity */}
              {selectedSlots.length === 1 ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Location Code</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedSlots[0].code}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Kapasitas Slot</span>
                    <span className="font-bold text-slate-900">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        selectedSlots[0].rollsList.length >= 4 
                          ? 'bg-rose-100 text-rose-800' 
                          : selectedSlots[0].rollsList.length > 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedSlots[0].rollsList.length} / 4 Roll
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2 border-b border-slate-100">
                  Bulk update {selectedSlots.length} slots terpilih.
                </div>
              )}

              {/* Direct Slot Assignment for Slots with Capacity (< 4 rolls) */}
              {selectedSlots.length === 1 && selectedSlots[0].id > 0 && selectedSlots[0].rollsList.length < 4 && unslottedRolls && unslottedRolls.length > 0 && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <PlusCircle size={14} className="text-emerald-600" />
                    <span>Tumpuk Roll ke Slot Ini (Sisa {4 - selectedSlots[0].rollsList.length})</span>
                  </div>
                  <select
                    value={selectedUnslottedRollId}
                    onChange={e => setSelectedUnslottedRollId(e.target.value)}
                    className="form-select text-xs w-full font-medium"
                  >
                    <option value="">-- Pilih Roll Tersedia ({unslottedRolls.length}) --</option>
                    {unslottedRolls.map(r => (
                      <option key={r.raw_id} value={r.raw_id}>
                        {r.no_roll} - {r.grade} ({r.weight} kg)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedUnslottedRollId || isAssigningFromSidebar}
                    onClick={handleAssignFromSidebar}
                    className="btn btn-sm btn-primary w-full text-xs font-bold py-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAssigningFromSidebar ? 'Menyimpan ke DB...' : `Tempatkan sebagai Roll ke-${selectedSlots[0].rollsList.length + 1}`}
                  </button>
                </div>
              )}

              {/* Stacked Rolls List */}
              {selectedSlots.length === 1 && selectedSlots[0].rollsList.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Rolls yang Bertumpuk di Slot Ini:</span>
                    <span className="text-[10px] font-bold text-blue-600">{selectedSlots[0].rollsList.length} Roll</span>
                  </div>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedSlots[0].rollsList.map((roll, idx) => (
                      <Link
                        key={roll.id}
                        href={`/roll-detail/${roll.number}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-blue-950 font-mono">{roll.number}</div>
                            <div className="text-[10px] text-slate-500">
                              {roll.grade || '—'} • {roll.weight || 0} kg
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={12} />
                          Detail
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Stack Count Dropdowns */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Status Slot</label>
                  <select
                    className="form-select w-full text-sm font-semibold text-slate-800"
                    value={editStatus}
                    onChange={e => setEditStatus(Number(e.target.value))}
                  >
                    {Object.entries(statusConfig).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Stack Count Manual Override</label>
                  <select
                    className="form-select w-full text-sm font-semibold text-slate-800"
                    value={editStackCount}
                    onChange={e => setEditStackCount(e.target.value)}
                  >
                    <option value="">(None)</option>
                    {stackCountOptions.map(opt => (
                      <option key={opt} value={opt}>{opt} ({opt === '✓' ? '1 roll' : `${opt} roll`})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUpdateLocation}
                  disabled={isUpdating}
                  className="btn btn-primary w-full text-sm py-2 cursor-pointer font-bold"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan Slot'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Popup Modal (When in assignMode) */}
      {showAssignPopup && assignSlot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="card w-full sm:max-w-md p-5 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MapPin size={15} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Assign Roll to Slot</h3>
              </div>
              <button onClick={() => setShowAssignPopup(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Roll yang Ditempatkan</span>
                <span className="font-bold text-blue-700 font-mono">{assignRollNo}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Target Slot</span>
                <span className="font-bold text-slate-900 font-mono">{assignSlot.code} (ID: {assignSlot.id})</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Posisi Tumpukan</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                  Tumpukan ke-{assignSlot.rollsList.length + 1} dari 4
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={assignForm.rollNumber}
                  onChange={e => setAssignForm(f => ({ ...f, rollNumber: e.target.value }))}
                  className="form-input w-full font-mono font-bold"
                  placeholder="Enter roll number"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  <Calendar size={12} className="inline mr-1" />
                  Warehouse Entry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={assignForm.entryDate}
                  onChange={e => setAssignForm(f => ({ ...f, entryDate: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5 cursor-pointer" onClick={() => setShowAssignPopup(false)}>
                Batal
              </button>
              <button
                className="btn btn-primary text-xs px-4 py-1.5 cursor-pointer font-bold"
                onClick={() => {
                  if (!assignForm.rollNumber.trim()) {
                    SystemUI.toast({ message: 'Nomor roll tidak boleh kosong.', type: 'warning' })
                    return
                  }
                  if (assignRollId && assignSlot.id > 0) {
                    router.put(`/rolls/${assignRollId}`, {
                      locations_id: String(assignSlot.id),
                      no_roll: assignForm.rollNumber,
                      entry_date: assignForm.entryDate,
                      action_type: 'ASSIGN',
                    }, {
                      onSuccess: () => {
                        setShowAssignPopup(false)
                        cancelAssignMode()
                        SystemUI.toast({
                          message: `Roll ${assignForm.rollNumber} berhasil ditempatkan di ${assignSlot.code}!`,
                          type: 'success'
                        })
                      },
                      onError: () => {
                        SystemUI.toast({
                          message: 'Gagal menempatkan roll. Pastikan kapasitas slot mencukupi.',
                          type: 'error'
                        })
                      }
                    })
                  }
                }}
              >
                Konfirmasi Assign Roll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
