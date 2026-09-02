import { useState, useEffect, useMemo } from 'react'
import { X, Package, MoveRight, Layers, Eye, MapPin, Calendar, AlertCircle, PlusCircle, CheckCircle2 } from 'lucide-react'
import { Link, router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import { motion } from 'framer-motion'

type SlotStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface LocationItem {
  id: number
  location: string
  status: number
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
  0: { label: 'Free Space (0/4)', bgClass: 'bg-white/60 backdrop-blur-md border border-slate-200 text-slate-700', dot: '#94a3b8' },
  1: { label: 'Slot Planning', bgClass: 'bg-blue-100/60 backdrop-blur-md border border-blue-200 text-blue-800', dot: '#3b82f6' },
  2: { label: 'Slotted', bgClass: 'bg-slate-200/60 backdrop-blur-md border border-slate-300 text-slate-800', dot: '#475569' },
  3: { label: 'Shipment Plan', bgClass: 'bg-emerald-100/60 backdrop-blur-md border border-emerald-200 text-emerald-800', dot: '#10b981' },
  4: { label: 'Non-PO', bgClass: 'bg-rose-100/60 backdrop-blur-md border border-rose-200 text-rose-800', dot: '#f43f5e' },
  5: { label: 'Move to Another Warehouse', bgClass: 'bg-amber-100/60 backdrop-blur-md border border-amber-200 text-amber-800', dot: '#f59e0b' },
  6: { label: 'HOLD', bgClass: 'bg-indigo-100/60 backdrop-blur-md border border-indigo-200 text-indigo-800', dot: '#6366f1' },
}

const stackCountOptions = ['✓', '2', '3', '4'];

import { 
  AREA_CONFIGS, 
  RackConfig,
  A_RACK_CONFIGS,
  E_RACK_CONFIGS,
  G_RACK_CONFIGS,
  H_RACK_CONFIGS,
  B_KANAN_RACK_CONFIGS,
  B_KIRI_RACK_CONFIGS,
  C_KANAN_RACK_CONFIGS,
  C_KIRI_RACK_CONFIGS
} from '@/Utils/WarehouseConfigs'
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, duration: 0.4 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

export default function WarehouseMap({ locations = [], unslottedRolls = [] }: Props) {
  const [activeArea, setActiveArea] = useState<'A' | 'E' | 'G' | 'H' | 'B_KANAN' | 'B_KIRI' | 'C_KANAN' | 'C_KIRI'>(() => {
    return (localStorage.getItem('rollyn_active_warehouse_area') as any) || 'A'
  })

  useEffect(() => {
    localStorage.setItem('rollyn_active_warehouse_area', activeArea)
  }, [activeArea])

  const [selectedSlotCodes, setSelectedSlotCodes] = useState<string[]>([])
  const [editStatus, setEditStatus] = useState<number>(0)
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

  // Determine the active config list
  const currentConfig = useMemo(() => {
    if (activeArea === 'E') return E_RACK_CONFIGS
    if (activeArea === 'G') return G_RACK_CONFIGS
    if (activeArea === 'H') return H_RACK_CONFIGS
    if (activeArea === 'B_KANAN') return B_KANAN_RACK_CONFIGS
    if (activeArea === 'B_KIRI') return B_KIRI_RACK_CONFIGS
    if (activeArea === 'C_KANAN') return C_KANAN_RACK_CONFIGS
    if (activeArea === 'C_KIRI') return C_KIRI_RACK_CONFIGS
    return A_RACK_CONFIGS
  }, [activeArea])

  const activeConfigRacks = useMemo(() => {
    return new Set(currentConfig.map(c => c.rack))
  }, [currentConfig])

  // Derived summaries
  const { totalRolls, totalWeight, specs, totalSlots } = useMemo(() => {
    let rollsCount = 0
    let weightSum = 0
    let slotsCount = 0
    const grdSet = new Set<string>()
    const gsmSet = new Set<number>()
    const rwSet = new Set<number>()

    slotMap.forEach(slot => {
      // Only count slots that belong to the active area
      const rackPart = slot.code.split('-')[0]
      if (activeConfigRacks.has(rackPart)) {
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
        message: `Slot ${code} is not registered in the database.`,
        type: 'warning',
        duration: 3000
      })
      return
    }

    let codesToSelect = new Set<string>([code])

    if (selectRowsOn || selectColOn || selectBlockOn) {
      const parts = code.split('-')
      if (parts.length === 3) {
        const rack = parts[0]
        const col = parts[1]
        const row = parts[2]
        
        const rackConfig = currentConfig.find(r => r.rack === rack)
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



  function handleUpdateLocation() {
    if (selectedSlots.length === 0) return
    setIsUpdating(true)
    
    router.put(`/locations/bulk-update`, {
      ids: selectedSlots.map(s => s.id).filter(id => id > 0),
      status: editStatus,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsUpdating(false)
        SystemUI.toast({ message: 'Location status successfully updated in database.', type: 'success' })
      },
      onError: () => {
        setIsUpdating(false)
        SystemUI.toast({ message: 'Failed to update location status in database.', type: 'error' })
      }
    })
  }



  // Sync edit state when selection changes
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const lastSlot = selectedSlots[selectedSlots.length - 1]
      if (lastSlot) {
        setEditStatus(lastSlot.status)
      }
    }
  }, [selectedSlotCodes])

  // Render a single slot cell
  function renderSlotCell(code: string, row: number) {
    const slot = slotMap.get(code)
      if (!slot) {
      return (
        <div key={code} className="relative group hover:z-50">
          <div className="flex items-center justify-center w-full aspect-square rounded-md border-2 border-dashed border-white/10 bg-white/5 text-[10px] tracking-tighter leading-none font-bold text-center text-slate-500 cursor-not-allowed">
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

    // Visual background config
    let bgStyle = statusConfig[slot.status]?.bgClass || 'bg-white/60 backdrop-blur-md border-2 border-slate-200 text-slate-700'
    if (slot.status === 3) {
      bgStyle = 'bg-emerald-100/60 backdrop-blur-md border-2 border-emerald-300 text-emerald-800'
    } else if (slot.status === 4) {
      bgStyle = 'bg-rose-100/60 backdrop-blur-md border-2 border-rose-300 text-rose-800'
    } else if (slot.status === 5) {
      bgStyle = 'bg-amber-100/60 backdrop-blur-md border-2 border-amber-300 text-amber-800'
    } else if (slot.status === 6) {
      bgStyle = 'bg-indigo-100/60 backdrop-blur-md border-2 border-indigo-300 text-indigo-800'
    } else if (rollsCount > 0 && !isFull) {
      bgStyle = 'bg-slate-200/60 backdrop-blur-md border-2 border-slate-300 text-slate-800'
    } else if (isFull) {
      bgStyle = 'bg-slate-300/80 backdrop-blur-md border-2 border-slate-400 text-slate-900 shadow-inner'
    }

    return (
      <div key={code} className="relative group hover:z-50">
        <button
          onClick={() => handleSlotClick(code)}
          className={`flex flex-col items-center justify-center w-full aspect-square rounded-lg text-[10px] tracking-tighter leading-none font-bold text-center cursor-pointer shadow-sm relative transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
            isSelected
              ? `${bgStyle} ring-2 ring-blue-400 shadow-md scale-[1.02] z-10`
              : `${bgStyle} hover:brightness-105`
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
          ) : null}
        </button>

        {/* Rich Tooltip */}
        <div className="hidden md:block absolute bottom-full mb-2 w-max px-3 py-2 bg-white text-slate-800 text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl border border-slate-200 whitespace-nowrap left-1/2 -translate-x-1/2">
          <div className="font-bold text-blue-600">Location: {code} (DB ID: {slot.id})</div>
          <div className="text-slate-500 text-[10px] mt-0.5">
            Capacity: <span className="font-bold text-slate-800">{rollsCount} / 4 Roll</span>
            {isFull ? ' (FULL)' : ` (${4 - rollsCount} slots remaining)`}
          </div>
          {rollsCount > 0 && (
            <div className="text-[10px] text-slate-500 border-t border-slate-100 mt-1 pt-1 space-y-0.5">
              {slot.rollsList.map((r, i) => (
                <div key={r.id}>
                  #{i + 1}: <span className="font-bold text-slate-800 font-mono">{r.number}</span> ({r.grade || '—'}, {r.weight || 0}kg)
                </div>
              ))}
            </div>
          )}
          <div className="absolute top-full border-4 border-transparent border-t-white left-1/2 -translate-x-1/2"></div>
        </div>
      </div>
    )
  }

  // Render a single rack section
  function renderRack(config: RackConfig) {
    const { rack, label, cols, special, specialColSpan, specialRowStart, specialRowSpan } = config

    const rackMaxRows = Math.max(
      ...cols.map(c => c.maxRow),
      (specialRowStart && specialRowSpan) ? specialRowStart + specialRowSpan - 1 : 0
    )

    if (rackMaxRows === 0) return null

    return (
      <div key={rack} className="flex-shrink-0 w-[228px] border border-white/60 bg-white/60 backdrop-blur-2xl rounded-xl p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative group/rack transition-all duration-300 hover:bg-white/80 hover:z-40">
        {/* Rack Header */}
        <div className="text-center font-bold text-slate-800 bg-white/50 backdrop-blur-md py-1.5 rounded-lg mb-1.5 text-sm border border-white/60 shadow-sm uppercase group-hover/rack:bg-white/80 transition-colors drop-shadow-sm">
          {label || rack}
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
                      className={`flex items-center justify-center font-bold text-xs tracking-wider rounded-lg z-0 ${
                        special === 'DOOR'
                          ? 'bg-slate-50 backdrop-blur-sm border-2 border-dashed border-slate-200 text-slate-400'
                          : 'bg-slate-100 backdrop-blur-md border border-slate-200 text-slate-500 shadow-inner'
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
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="py-4 px-2.5 sm:px-6 max-w-full overflow-x-hidden relative">
      {/* Background blobs to match Dashboard */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-3xl pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-3xl pointer-events-none -z-10 -translate-x-1/4 translate-y-1/4" />
      
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Warehouse Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">Warehouse layout map {activeArea === 'B_KANAN' ? 'Warehouse B (RIGHT)' : activeArea === 'B_KIRI' ? 'Warehouse B (LEFT)' : activeArea === 'C_KANAN' ? 'Warehouse C (RIGHT)' : activeArea === 'C_KIRI' ? 'Warehouse C (LEFT)' : activeArea === 'G' ? 'Warehouse G' : activeArea === 'H' ? 'Warehouse H' : `Column ${activeArea}`} — Capacity up to 4 rolls per slot</p>
        </div>
      </motion.div>



      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6 overflow-x-hidden w-full relative">

        {/* Warehouse Grid Container */}
        <motion.div variants={itemVariants} className="flex-1 min-w-0 transition-all duration-500 ease-in-out transform-gpu glass-panel rounded-2xl p-3.5 sm:p-5 flex flex-col relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm">
                  {activeArea.includes('B_') ? 'B' : activeArea.includes('C_') ? 'C' : activeArea}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {activeArea === 'B_KANAN' ? 'Warehouse B (RIGHT)' : activeArea === 'B_KIRI' ? 'Warehouse B (LEFT)' : activeArea === 'C_KANAN' ? 'Warehouse C (RIGHT)' : activeArea === 'C_KIRI' ? 'Warehouse C (LEFT)' : activeArea === 'G' ? 'Warehouse G' : activeArea === 'H' ? 'Warehouse H' : `Column ${activeArea}`}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">{totalSlots} Slots × Max 4 Rolls = {totalSlots * 4} Total Capacity</span>
                </div>
              </div>
              <div className="flex flex-wrap bg-slate-100/80 backdrop-blur-md p-1.5 rounded-xl self-start sm:self-auto gap-1.5 border border-slate-200 shadow-inner">
                <button
                  onClick={() => {
                    setActiveArea('A')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'A' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Column A
                </button>
                <button
                  onClick={() => {
                    setActiveArea('E')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'E' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Column E
                </button>
                <button
                  onClick={() => {
                    setActiveArea('B_KANAN')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'B_KANAN' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Warehouse B (RIGHT)
                </button>
                <button
                  onClick={() => {
                    setActiveArea('B_KIRI')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'B_KIRI' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Warehouse B (LEFT)
                </button>
                <button
                  onClick={() => {
                    setActiveArea('C_KANAN')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'C_KANAN' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Warehouse C (RIGHT)
                </button>
                <button
                  onClick={() => {
                    setActiveArea('C_KIRI')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'C_KIRI' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Warehouse C (LEFT)
                </button>
                <button
                  onClick={() => {
                    setActiveArea('G')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'G' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Warehouse G
                </button>
                <button
                  onClick={() => {
                    setActiveArea('H')
                    setSelectedSlotCodes([])
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    activeArea === 'H' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                >
                  Warehouse H
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100/80 backdrop-blur-md border border-slate-200 rounded-full p-1 shadow-inner">
                <button
                  onClick={() => toggleMode('row')}
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    selectRowsOn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                  title="Select all rows vertically in this column"
                >
                  Rows
                </button>
                <button
                  onClick={() => toggleMode('col')}
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    selectColOn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                  }`}
                  title="Select all columns horizontally in this row"
                >
                  Columns
                </button>
                <button
                  onClick={() => toggleMode('block')}
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    selectBlockOn ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
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
                className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm backdrop-blur-md ${
                  multiSelectMode 
                    ? 'bg-white text-blue-600 border-slate-200 shadow-sm scale-[1.02]' 
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:text-slate-800 hover:bg-white hover:border-slate-300'
                }`}
              >
                <Layers size={13} />
                <span className="hidden sm:inline">Multi-Select: {multiSelectMode ? 'ON' : 'OFF'}</span>
                <span className="sm:hidden">{multiSelectMode ? 'ON' : 'OFF'}</span>
              </button>
              <div className="hidden md:flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-full border border-blue-200 backdrop-blur-sm shadow-inner">
                <span>Scroll right →</span>
                <MoveRight size={13} />
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="flex gap-4 pt-12 pb-6 px-2 flex-nowrap min-w-min">
              {currentConfig.map(config => renderRack(config))}
            </div>
          </div>

          <div className="mt-auto">
            {/* Legend */}
            <div className="mt-5 pt-3 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status Legend</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(statusConfig).map(([val, cfg]) => (
                  <div key={val} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${cfg.bgClass} hover:brightness-95 transition-all duration-200 cursor-default`}>
                    <span className="text-[11px] font-bold">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Data */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 flex flex-col justify-center hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-300 group">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 group-hover:text-blue-600 transition-colors">Total Stored Rolls</div>
                <div className="text-lg font-black text-slate-800 transition-colors">{totalRolls}</div>
              </div>
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 flex flex-col justify-center hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-300 group">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 group-hover:text-emerald-600 transition-colors">Total Weight (KGS)</div>
                <div className="text-lg font-black text-slate-800 transition-colors">{totalWeight.toLocaleString('id-ID', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 flex flex-col justify-center hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-300 group">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 group-hover:text-indigo-600 transition-colors">Total Physical Slots</div>
                <div className="text-lg font-black text-slate-800 transition-colors">{totalSlots} <span className="text-xs text-slate-400 font-medium">({totalSlots * 4} max rolls)</span></div>
              </div>
              <div className="bg-white/60 border border-slate-200 rounded-xl p-3 flex flex-col justify-center hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-300 group">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 group-hover:text-slate-800 transition-colors">Specs Available</div>
                <div className="text-[10px] text-slate-600 font-mono line-clamp-2 leading-relaxed">
                  <span className="font-bold text-slate-800">GRD:</span> {specs.grd || '-'} <br/>
                  <span className="font-bold text-slate-800">GSM:</span> {specs.gsm || '-'} <br/>
                  <span className="font-bold text-slate-800">RW:</span> {specs.rw || '-'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detail Sidebar */}
          <div
            className={`flex-shrink-0 overflow-hidden acos-layout-transition ${
              selectedSlots.length > 0 ? "w-full lg:w-88 opacity-100 max-h-[1200px] mt-2 lg:mt-0" : "w-full lg:w-0 opacity-0 max-h-0 lg:max-h-[1200px]"
            }`}
          >
            <div className="bg-white/80 backdrop-blur-2xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-slate-200 p-5 flex flex-col gap-3 w-full lg:w-88 h-full acos-sidebar-enter">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shadow-sm">
                    <Layers size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedSlots.length === 1 ? 'Slot & Stack Detail' : 'Multiple Locations'}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500">
                      {selectedSlots.length === 1 ? `${selectedSlots[0].code} (ID: ${selectedSlots[0].id})` : `${selectedSlots.length} selected slots`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSlotCodes([])}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Location Info & Capacity */}
              {selectedSlots.length === 1 ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Location Code</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedSlots[0].code}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Warehouse Area</span>
                    <span className="font-medium text-slate-800">
                      {activeArea === 'B_KANAN' ? 'Warehouse B (RIGHT)' : activeArea === 'B_KIRI' ? 'Warehouse B (LEFT)' : activeArea === 'C_KANAN' ? 'Warehouse C (RIGHT)' : activeArea === 'C_KIRI' ? 'Warehouse C (LEFT)' : activeArea === 'G' ? 'Warehouse G' : activeArea === 'H' ? 'Warehouse H' : `Column ${activeArea}`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Slot Capacity</span>
                    <span className="font-bold text-slate-800">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                        selectedSlots[0].rollsList.length >= 4 
                          ? 'bg-rose-100 text-rose-700 border-rose-200' 
                          : selectedSlots[0].rollsList.length > 0 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {selectedSlots[0].rollsList.length} / 4 Roll
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 py-2 border-b border-slate-100">
                  Bulk updating {selectedSlots.length} selected slots.
                </div>
              )}


              {/* Stacked Rolls List */}
              {selectedSlots.length === 1 && selectedSlots[0].rollsList.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Rolls Stacked in This Slot:</span>
                    <span className="text-[10px] font-bold text-blue-600">{selectedSlots[0].rollsList.length} Rolls</span>
                  </div>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedSlots[0].rollsList.map((roll, idx) => (
                      <Link
                        key={roll.id}
                        href={`/roll-detail/${roll.number}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white text-blue-600 border border-blue-200 text-[10px] font-black flex items-center justify-center shadow-sm">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-800 font-mono">{roll.number}</div>
                            <div className="text-[10px] text-slate-600">
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

              {/* Status Dropdowns */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Slot Status</label>
                  <select
                    className="form-select w-full text-sm font-semibold bg-white border-slate-200 text-slate-800"
                    value={editStatus}
                    onChange={e => setEditStatus(Number(e.target.value))}
                  >
                    {Object.entries(statusConfig).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                </div>


                <button
                  onClick={handleUpdateLocation}
                  disabled={isUpdating}
                  className="btn btn-primary w-full text-sm py-2 cursor-pointer font-bold"
                >
                  {isUpdating ? 'Saving...' : 'Save Slot Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
    </motion.div>
  )
}
