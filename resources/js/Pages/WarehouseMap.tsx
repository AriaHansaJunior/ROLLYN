import { useState, useEffect, useMemo } from 'react'
import { X, Package, MoveRight, Layers, Eye, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { Link, router } from '@inertiajs/react'

type SlotStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface LocationItem {
  id: number
  location: string
  status: number
  stack_count?: string | null
  rolls?: { no: number; no_roll: string; weight?: number; grade?: any; jop?: any }[]
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
  rollsList?: { id: number; number: string; }[]
}

interface Props {
  locations?: LocationItem[]
}

const statusConfig: Record<number, { label: string; bgClass: string; dot: string }> = {
  0: { label: 'Free Space', bgClass: 'bg-white border-2 border-gray-300 text-gray-800', dot: '#ffffff' },
  1: { label: 'Slot Planning', bgClass: 'bg-gray-200 border-2 border-gray-300 text-gray-800', dot: '#e5e7eb' },
  2: { label: 'Slotted', bgClass: 'bg-gray-500 border-2 border-gray-600 text-white', dot: '#6b7280' },
  3: { label: 'Shipment Plan', bgClass: 'bg-green-600 border-2 border-green-700 text-white', dot: '#16a34a' },
  4: { label: 'Non-PO', bgClass: 'bg-red-600 border-2 border-red-700 text-white', dot: '#dc2626' },
  5: { label: 'Move to Another Warehouse', bgClass: 'bg-yellow-400 border-2 border-yellow-500 text-gray-900', dot: '#facc15' },
  6: { label: 'HOLD', bgClass: 'bg-blue-500 border-2 border-blue-600 text-white', dot: '#3b82f6' },
}

const stackCountOptions = ['✓', '2', '3', '4'];

// Define each rack's structure: which sub-columns exist and how many rows each sub-column has
// Format: { rack: string, cols: { col: number, rows: number }[], special?: 'loading-dock-1' | 'loading-dock-2' | 'door' | 'empty', specialRows?: number }
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

export default function WarehouseMap({ locations = [] }: Props) {
  const [selectedSlotCodes, setSelectedSlotCodes] = useState<string[]>([])
  const [editStatus, setEditStatus] = useState<number>(0)
  const [editStackCount, setEditStackCount] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [multiSelectMode, setMultiSelectMode] = useState(false)

  const [selectRowsOn, setSelectRowsOn] = useState(false)
  const [selectColOn, setSelectColOn] = useState(false)
  const [selectBlockOn, setSelectBlockOn] = useState(false)

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
      setAssignMode(true)
      setAssignRollId(rollId)
      setAssignRollNo(rollNo ? decodeURIComponent(rollNo) : rollId)
    }
  }, [])

  // Build a lookup map for quick slot access
  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>()
    locations.forEach(loc => {
      const roll = loc.rolls && loc.rolls.length > 0 ? loc.rolls[0] : null
      map.set(loc.location, {
        id: loc.id,
        code: loc.location,
        status: (loc.status >= 0 && loc.status <= 6 ? loc.status : 0) as SlotStatus,
        stackCount: loc.stack_count,
        rollId: roll?.no,
        rollNumber: roll?.no_roll,
        weight: roll?.weight,
        grade: roll?.grade?.grade,
        gsm: roll?.jop?.gsm?.gsm,
        width: roll?.jop?.rollsWidth?.width,
        rollsList: loc.rolls?.map(r => ({ id: r.no, number: r.no_roll })) || [],
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
      // Only count slots that belong to Kolom A
      if (slot.code.startsWith('A')) {
        slotsCount++
        if (slot.rollId) {
          rollsCount++
          weightSum += slot.weight || 0
          if (slot.grade) grdSet.add(slot.grade)
          if (slot.gsm) gsmSet.add(slot.gsm)
          if (slot.width) rwSet.add(slot.width)
        }
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
    const slot = slotMap.get(code) || { id: 0, code, status: 0 as SlotStatus }
    if (assignMode) {
      if (slot.status === 0) {
        setAssignSlot(slot)
        setAssignForm({
          rollNumber: '',
          entryDate: new Date().toISOString().slice(0, 10),
        })
        setShowAssignPopup(true)
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
      onSuccess: () => setIsUpdating(false),
      onError: () => {
        setIsUpdating(false)
        alert("Failed to update locations")
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

  // Render a single slot cell (big square like old E17 design)
  function renderSlotCell(code: string, row: number) {
    const slot = slotMap.get(code)
    if (!slot) {
      // Slot doesn't exist in DB — render a disabled placeholder that still shows the code
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

    const cfg = statusConfig[slot.status]
    const isSelected = selectedSlotCodes.includes(code)
    const isAssignTarget = assignMode && slot.status === 0

    return (
      <div key={code} className="relative group">
        <button
          onClick={() => handleSlotClick(code)}
          className={`flex flex-col items-center justify-center w-full aspect-square rounded-md text-[10px] tracking-tighter leading-none font-bold text-center acos-smooth-hover cursor-pointer shadow-sm ${
            isSelected
              ? `${cfg.bgClass} ring-4 ring-offset-2 ring-indigo-500 scale-105 z-10 transition-transform`
              : isAssignTarget
                ? `${cfg.bgClass} ring-2 ring-emerald-400 hover:ring-4 hover:ring-emerald-500 hover:scale-105 transition-all`
                : `${cfg.bgClass}`
          }`}
        >
          <span>{code}</span>
          {slot.stackCount && (
            <span className="mt-1 text-[9px] font-black text-slate-800 bg-white/60 backdrop-blur-[1px] border border-slate-900/10 px-1.5 py-0.5 rounded shadow-sm leading-none flex items-center justify-center">
              {slot.stackCount}
            </span>
          )}
        </button>
        {/* Tooltip */}
        <div className="hidden md:block absolute bottom-full mb-2 w-max px-3 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl whitespace-nowrap left-1/2 -translate-x-1/2">
          Location: <span className="font-bold text-blue-300">{code}</span> | Status: {cfg.label}
          <div className="absolute top-full border-4 border-transparent border-t-slate-900 left-1/2 -translate-x-1/2"></div>
        </div>
      </div>
    )
  }

  // Render a single rack section
  function renderRack(config: RackConfig) {
    const { rack, cols, special, specialColSpan, specialRowStart, specialRowSpan } = config

    // Compute the actual number of rows for this rack
    const rackMaxRows = Math.max(
      ...cols.map(c => c.maxRow),
      (specialRowStart && specialRowSpan) ? specialRowStart + specialRowSpan - 1 : 0
    )

    if (rackMaxRows === 0) return null

    return (
      <div key={rack} className="flex-shrink-0 w-[220px]">
        {/* Rack Header */}
        <div className="text-center font-bold text-slate-700 bg-slate-100 py-1.5 rounded-t-lg mb-1 text-sm border border-slate-200">
          {rack}
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

              // Render special area (LOADING DOCK / DOOR) on the first cell of the area
              if (special && specialRowStart && specialRowSpan && specialColSpan) {
                if (c.col === cols[0].col && row === specialRowStart) {
                  // Render the special merged cell
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
                // Skip cells that are part of the special area
                if (row >= specialRowStart && row < specialRowStart + specialRowSpan) {
                  // For DOOR: only skip cols 4,3,2 (first 3 cols). Col 1 might have slots.
                  if (special === 'DOOR') {
                    const colIndex = cols.findIndex(x => x.col === c.col)
                    if (colIndex < specialColSpan) return null
                  } else {
                    return null
                  }
                }
              }

              // Check if this row exceeds the max for this sub-column
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
        </div>
      </div>

      {/* Assignment Mode Banner */}
      {assignMode && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin size={18} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-blue-900">Assign Roll Mode</div>
              <div className="text-xs text-blue-700 truncate">
                Assigning roll <span className="font-bold font-mono">{assignRollNo}</span> — Select a <span className="font-bold">Free Space</span> slot below
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary text-xs px-3 py-1.5 shrink-0 cursor-pointer"
            onClick={cancelAssignMode}
          >
            Cancel
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
                  Kolom A
                </h3>
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
                <span>Scroll right →</span>
                <MoveRight size={13} />
              </div>
            </div>
          </div>

          {/* Grid Area — Horizontal scroll with large boxes */}
          <div className="w-full overflow-x-auto pb-4 pt-2 px-2 snap-x">
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {RACK_CONFIGS.map(config => renderRack(config))}
            </div>
          </div>

          <div className="mt-auto">
            {/* Legend */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Slot Status Legend</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50/50"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cfg.dot }} />
                    <span className="text-[11px] font-medium text-slate-700">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot Planning → Slotted flow hint */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <AlertCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed m-0">
                  <span className="font-bold text-slate-700">Slot Planning</span> indicates a slot has been reserved for a roll but the roll has not yet physically arrived.
                  Once the roll is placed in the warehouse, the PIC updates the status to <span className="font-bold text-slate-700">Slotted</span>.
                </p>
              </div>
            </div>

            {/* Summary Data */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Total Roll</div>
                <div className="text-lg font-black text-blue-900">{totalRolls}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Weight (KGS)</div>
                <div className="text-lg font-black text-emerald-900">{totalWeight.toLocaleString('id-ID', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Capacity (Slots)</div>
                <div className="text-lg font-black text-indigo-900">{totalSlots}</div>
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
              selectedSlots.length > 0 ? "w-full lg:w-80 opacity-100 max-h-[1000px] mt-2 lg:mt-0" : "w-full lg:w-0 opacity-0 max-h-0 lg:max-h-[1000px]"
            }`}
          >
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3 w-full lg:w-80 h-full acos-sidebar-enter">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    <Layers size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedSlots.length === 1 ? 'Location Detail' : 'Multiple Locations'}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500">
                      {selectedSlots.length === 1 ? selectedSlots[0].code : `${selectedSlots.length} slots selected`}
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

              {/* Location Info */}
              {selectedSlots.length === 1 ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Location Code</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedSlots[0].code}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Warehouse Area</span>
                    <span className="font-medium text-slate-800">Kolom A</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2 border-b border-slate-100">
                  Bulk updating {selectedSlots.length} slots. Apply status and stack count below to update all selected slots.
                </div>
              )}

              {/* Status & Stack Count Dropdowns */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Stack Count</label>
                  <select
                    className="form-select w-full text-sm font-semibold text-slate-800"
                    value={editStackCount}
                    onChange={e => setEditStackCount(e.target.value)}
                  >
                    <option value="">(None)</option>
                    {stackCountOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUpdateLocation}
                  disabled={isUpdating}
                  className="btn btn-primary w-full text-sm py-2"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* See Roll Details link */}
              {selectedSlots.length === 1 && selectedSlots[0].status !== 0 && selectedSlots[0].rollsList && selectedSlots[0].rollsList.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Assigned Rolls</div>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {selectedSlots[0].rollsList.map(roll => (
                      <Link
                        key={roll.id}
                        href={`/roll-detail/${roll.number}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-blue-500" />
                          <span className="text-xs font-bold text-blue-900 font-mono">{roll.number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={12} />
                          Details
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Popup Modal */}
      {showAssignPopup && assignSlot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                <span className="text-slate-500 font-medium">Roll</span>
                <span className="font-bold text-blue-700 font-mono">{assignRollNo}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Warehouse</span>
                <span className="font-semibold text-slate-800">Kolom A</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Slot</span>
                <span className="font-bold text-slate-900 font-mono">{assignSlot.code}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Initial Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Slot Planning
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
              <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed m-0">
                The roll will initially be set to <span className="font-bold">Slot Planning</span>.
                Once the roll physically arrives at the warehouse, the PIC can update the status to <span className="font-bold">Slotted</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={assignForm.rollNumber}
                  onChange={e => setAssignForm(f => ({ ...f, rollNumber: e.target.value }))}
                  className="form-input w-full"
                  placeholder="Enter roll number"
                />
                <p className="text-[10px] text-slate-400 mt-1">Manually assigned during warehouse assignment</p>
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
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowAssignPopup(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary text-xs px-3 py-1.5"
                onClick={() => {
                  if (!assignForm.rollNumber.trim()) return
                  if (assignRollId) {
                    router.put(`/rolls/${assignRollId}`, {
                      locations_id: String(assignSlot.id),
                      no_roll: assignForm.rollNumber,
                      entry_date: assignForm.entryDate,
                      action_type: 'ASSIGN',
                    }, {
                      onSuccess: () => {
                        setShowAssignPopup(false)
                        cancelAssignMode()
                      },
                      onError: () => {
                        alert("Failed to assign roll. Ensure all required data is provided.")
                      }
                    })
                  }
                }}
              >
                Assign Roll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
