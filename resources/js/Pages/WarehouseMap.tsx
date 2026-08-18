import { useState } from 'react'
import { X, Package, MoveRight, Layers, ArrowRight, Eye } from 'lucide-react'
import { Link } from '@inertiajs/react'

type SlotStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface LocationItem {
  id: number
  location: string
  status: number
  rolls?: { no: number; no_roll: string }[]
}

interface Slot {
  id: number
  code: string
  status: SlotStatus
  rollId?: number
  rollNumber?: string
}

interface Props {
  locations?: LocationItem[]
}

const statusConfig: Record<number, { label: string; bgClass: string; dot: string }> = {
  0: { label: 'Free Space', bgClass: 'bg-white border-2 border-gray-300 text-gray-800', dot: '#ffffff' },
  1: { label: 'Slot Planning', bgClass: 'bg-gray-200 border-2 border-gray-300 text-gray-800', dot: '#e5e7eb' },
  2: { label: 'Slotted', bgClass: 'bg-gray-500 border-2 border-gray-600 text-white', dot: '#6b7280' },
  3: { label: 'Shipment Plan', bgClass: 'bg-green-600 border-2 border-green-700 text-white', dot: '#16a34a' },
  4: { label: 'Non PO', bgClass: 'bg-red-600 border-2 border-red-700 text-white', dot: '#dc2626' },
  5: { label: 'Pindah Gudang B/C', bgClass: 'bg-yellow-400 border-2 border-yellow-500 text-gray-900', dot: '#facc15' },
  6: { label: 'HOLD', bgClass: 'bg-blue-500 border-2 border-blue-600 text-white', dot: '#3b82f6' },
}

export default function WarehouseMap({ locations = [] }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const slotList: Slot[] = locations.length > 0 ? locations.map(loc => ({
    id: loc.id,
    code: loc.location,
    status: (loc.status >= 0 && loc.status <= 6 ? loc.status : 0) as SlotStatus,
    rollId: loc.rolls && loc.rolls.length > 0 ? loc.rolls[0].no : undefined,
    rollNumber: loc.rolls && loc.rolls.length > 0 ? loc.rolls[0].no_roll : undefined,
  })) : Array.from({ length: 12 }, (_, colIdx) =>
    Array.from({ length: 4 }, (_, tierIdx) => ({
      id: colIdx * 4 + tierIdx + 1,
      code: `E17-${String(colIdx + 1).padStart(2, '0')}-${tierIdx + 1}`,
      status: 0 as SlotStatus
    }))
  ).flat()

  return (
    <div className="py-4 px-2.5 sm:px-6 max-w-full overflow-x-hidden">
      {}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Warehouse Map</h2>
        </div>
      </div>

      {}
      <div className="flex flex-col lg:flex-row items-stretch gap-6 overflow-x-hidden w-full relative">

        {}
        <div className="flex-1 min-w-0 transition-all duration-500 ease-in-out transform-gpu bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                E17
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Warehouse E17
                </h3>
              </div>
            </div>

            <div className="flex min-[680px]:hidden items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <span>Scroll right</span>
              <MoveRight size={13} />
            </div>
          </div>

          {}
          <div className="w-full overflow-x-auto pb-4 pt-2 px-2 no-scrollbar snap-x">
            <div className="flex flex-col gap-3 min-w-[700px] md:min-w-full">
              {}
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-12 gap-3 flex-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(col => (
                    <div key={col} className="text-center text-[10px] font-bold text-slate-400">
                      {String(col).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>

              {}
              {[1, 2, 3, 4].map(tier => (
                <div key={tier} className="flex items-center gap-3">
                  {}
                  <div className="grid grid-cols-12 gap-3 flex-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(col => {
                      const code = `E17-${String(col).padStart(2, '0')}-${tier}`;
                      const slot = slotList.find(s => s.code === code) || {
                        id: 0,
                        code,
                        status: 0 as SlotStatus
                      };
                      const cfg = statusConfig[slot.status];
                      const isSelected = selectedSlot?.code === code;

                      return (
                        <div key={code} className="relative group aspect-square snap-center">
                          <button
                            onClick={() => setSelectedSlot(isSelected ? null : slot)}
                            className={`flex items-center justify-center w-full h-full min-h-[3rem] whitespace-nowrap rounded-md text-[10px] tracking-tighter leading-none font-bold text-center break-words acos-smooth-hover cursor-pointer shadow-sm ${
                              isSelected
                                ? `${cfg.bgClass} ring-4 ring-offset-2 ring-indigo-500 scale-105 z-10 transition-transform`
                                : `${cfg.bgClass}`
                            }`}
                          >
                            {code}
                          </button>
                          {}
                          <div className={`hidden md:block absolute bottom-full mb-2 w-max px-3 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl whitespace-nowrap ${
                            col === 1 ? 'left-0' : col === 12 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                          }`}>
                            Lokasi: <span className="font-bold text-blue-300">{code}</span> | Status: {cfg.label}
                            <div className={`absolute top-full border-4 border-transparent border-t-slate-900 ${
                              col === 1 ? 'left-4' : col === 12 ? 'right-4' : 'left-1/2 -translate-x-1/2'
                            }`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {}
          <div className="mt-3 pt-3 border-t border-slate-100">
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
        </div>

        {}
        <div
          className={`flex-shrink-0 overflow-hidden acos-layout-transition ${
            selectedSlot ? "w-full lg:w-80 opacity-100 max-h-[1000px] mt-2 lg:mt-0" : "w-full lg:w-0 opacity-0 max-h-0 lg:max-h-[1000px]"
          }`}
        >
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3 w-full lg:w-80 h-full acos-sidebar-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Location Detail</h3>
                  <div className="text-[11px] font-mono text-slate-500">{selectedSlot?.code || '-'}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Location Code</span>
                <span className="font-bold text-slate-900 font-mono">{selectedSlot?.code || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Warehouse Area</span>
                <span className="font-medium text-slate-800">Warehouse E17</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot ? statusConfig[selectedSlot.status].label : ''}
                </span>
              </div>
              {selectedSlot?.status !== 0 && selectedSlot?.rollNumber && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Roll Number</span>
                  <span className="font-bold text-slate-900">{selectedSlot.rollNumber}</span>
                </div>
              )}
            </div>

            {selectedSlot?.status !== 0 && selectedSlot?.rollNumber && (
              <div className="mt-5 flex justify-end">
                <Link
                  href={`/roll-detail/${selectedSlot.rollNumber}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Eye size={16} />
                  See details
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
