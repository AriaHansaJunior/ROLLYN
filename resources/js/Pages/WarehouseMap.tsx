import { useState } from 'react'
import { X, Package, MoveRight, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react'

type SlotStatus = 'free' | 'planning' | 'slotted' | 'shipment' | 'nonpo' | 'move' | 'hold'

interface Slot {
  code: string
  status: SlotStatus
  roll?: string
  rollNumber?: string
  grade?: string
  gsm?: number
  weight?: number
  jop?: string
  customer?: string
  orderStatus?: string
}

const statusConfig: Record<SlotStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
  free: { label: 'Free Space', bg: '#FFFFFF', border: '#E2E8F0', text: '#475569', dot: '#94A3B8' },
  planning: { label: 'Slot Planning', bg: '#F1F5F9', border: '#CBD5E1', text: '#334155', dot: '#64748B' },
  slotted: { label: 'Slotted', bg: '#E0F2FE', border: '#7DD3FC', text: '#0369A1', dot: '#0284C7' },
  shipment: { label: 'Shipment Plan', bg: '#DCFCE7', border: '#86EFAC', text: '#15803D', dot: '#16A34A' },
  nonpo: { label: 'Non-PO', bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C', dot: '#DC2626' },
  move: { label: 'Move Warehouse', bg: '#FEF3C7', border: '#FDE047', text: '#B45309', dot: '#D97706' },
  hold: { label: 'Hold', bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8', dot: '#2563EB' },
}

function generateSlots(whId: string): Slot[][] {
  const rows = 8
  const cols = 10
  const statuses: SlotStatus[] = ['free', 'planning', 'slotted', 'shipment', 'nonpo', 'move', 'hold']
  const customers = ['PT Surya Makmur', 'Pacific Paper Co.', 'CV Mega Karton', 'UD Karya Bersama']
  const grades = ['KLB-150', 'KLB-175', 'KLB-200', 'KIA-125']

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      const seed = (row * 10 + col + whId.charCodeAt(0)) % 100
      const statusIdx = seed < 40 ? 2 : seed < 55 ? 3 : seed < 65 ? 6 : seed < 70 ? 4 : seed < 75 ? 5 : seed < 85 ? 0 : 1
      const status = statuses[statusIdx]
      const code = `${whId}${String(col + 1).padStart(2, '0')}-R${row + 1}`
      if (status === 'free' || status === 'planning') return { code, status }
      return {
        code,
        status,
        roll: `R-104${20 + (row * 10 + col) % 10}`,
        rollNumber: `R-104${20 + (row * 10 + col) % 10}`,
        grade: grades[(row + col) % grades.length],
        gsm: [125, 150, 175, 200][(row + col) % 4],
        weight: 876 + ((row * col) % 300),
        jop: `JOP-24071${col % 4}`,
        customer: customers[(row + col) % customers.length],
        orderStatus: status === 'shipment' ? 'Ready to Ship' : status === 'hold' ? 'On Hold' : 'In Stock',
      }
    })
  )
}

const warehouses = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default function WarehouseMap() {
  const [activeWH, setActiveWH] = useState('A')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const slots = generateSlots(activeWH)
  const cols = slots[0]?.length ?? 0

  return (
    <div className="py-4 px-2.5 sm:px-6 max-w-full overflow-x-hidden">
      {/* Header Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Warehouse Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time slot allocation & roll position tracking</p>
        </div>
      </div>

      {/* Modern Horizontal Pill Scroll for WH Tabs */}
      <div className="mb-4 overflow-x-auto pb-1 flex gap-2 no-scrollbar scroll-smooth">
        <div className="flex gap-1.5 p-1 bg-slate-200/70 backdrop-blur-xs rounded-2xl border border-slate-200/80 shrink-0 min-w-full min-[680px]:min-w-0">
          {warehouses.map(wh => {
            const isActive = activeWH === wh
            return (
              <button
                key={wh}
                onClick={() => { setActiveWH(wh); setSelectedSlot(null) }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                    : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/50'
                }`}
              >
                Warehouse {wh}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Grid Layout Container */}
      <div className={selectedSlot ? "grid grid-cols-1 min-[680px]:grid-cols-[1fr_280px] min-[1180px]:grid-cols-[1fr_320px] gap-4" : "grid grid-cols-1 gap-4"}>
        
        {/* Map Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-5">
          {/* Card Title & Specs */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {activeWH}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Warehouse {activeWH} — Slot Layout
                </h3>
                <div className="text-[11px] text-slate-400 font-medium">8 Rows × 10 Columns (80 Total Slots)</div>
              </div>
            </div>

            {/* Mobile Touch Swipe Indicator */}
            <div className="flex min-[680px]:hidden items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <span>Scroll right</span>
              <MoveRight size={13} />
            </div>
          </div>

          {/* Interactive Scrollable Grid Layout */}
          <div className="overflow-x-auto pb-3 pt-1 touch-pan-x no-scrollbar">
            <div className="inline-block min-w-[560px]">
              {/* Column Headers */}
              <div className="flex gap-1.5 ml-10 mb-2">
                {Array.from({ length: cols }, (_, i) => (
                  <div
                    key={i}
                    className="w-12 text-center text-[10px] font-extrabold text-slate-400 font-mono tracking-tighter"
                  >
                    C{String(i + 1).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Rows & Slot Cells */}
              {slots.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-8 text-right text-[10px] font-bold text-slate-400 font-mono pr-1 shrink-0">
                    R{rowIdx + 1}
                  </div>
                  {row.map(slot => {
                    const cfg = statusConfig[slot.status]
                    const isSelected = selectedSlot?.code === slot.code
                    return (
                      <button
                        key={slot.code}
                        onClick={() => setSelectedSlot(isSelected ? null : slot)}
                        title={`${slot.code} — ${cfg.label}`}
                        style={{
                          backgroundColor: cfg.bg,
                          borderColor: isSelected ? '#1E293B' : cfg.border,
                          color: cfg.text,
                        }}
                        className={`w-12 h-8 rounded-lg border text-[10px] font-bold font-mono flex items-center justify-center transition-all duration-150 active:scale-95 shadow-2xs ${
                          isSelected ? 'ring-2 ring-slate-900 ring-offset-1 z-10 scale-105 shadow-md' : 'hover:scale-102 hover:shadow-xs'
                        }`}
                      >
                        {slot.code.split('-')[0].slice(-3)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Modern Responsive Legend */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Slot Legend</div>
            <div className="grid grid-cols-2 min-[680px]:flex min-[680px]:flex-wrap gap-2 text-xs">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-slate-50/50"
                  style={{ borderColor: cfg.border }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                  <span className="text-[11px] font-medium text-slate-700 truncate">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Backdrop Overlay for Bottom Sheet */}
        {selectedSlot && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 min-[680px]:hidden"
            onClick={() => setSelectedSlot(null)}
          />
        )}

        {/* Slot Detail Mobile Bottom Sheet / Tablet & Desktop Side Panel */}
        {selectedSlot && (
          <div className="bg-white rounded-t-3xl min-[680px]:rounded-2xl border-t min-[680px]:border border-slate-200/80 shadow-2xl min-[680px]:shadow-xs p-4 sm:p-5 max-[679px]:fixed max-[679px]:inset-x-0 max-[679px]:bottom-0 max-[679px]:z-50 max-[679px]:max-h-[85vh] max-[679px]:overflow-y-auto transition-all">
            
            {/* Mobile Drag Handle Bar */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 min-[680px]:hidden" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Slot Details</h3>
                  <div className="text-[11px] font-mono text-slate-500">{selectedSlot.code}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Detail Rows */}
            <div className="space-y-2 text-xs">
              {[
                { label: 'Slot Code', value: selectedSlot.code },
                { label: 'Warehouse', value: `Warehouse ${activeWH}` },
                { label: 'Status', value: statusConfig[selectedSlot.status].label, isStatus: true, status: selectedSlot.status },
                { label: 'Roll Number', value: selectedSlot.rollNumber || '—' },
                { label: 'Grade', value: selectedSlot.grade || '—' },
                { label: 'GSM', value: selectedSlot.gsm ? `${selectedSlot.gsm} g/m²` : '—' },
                { label: 'Weight', value: selectedSlot.weight ? `${selectedSlot.weight} kg` : '—' },
                { label: 'Job Order Production', value: selectedSlot.jop || '—' },
                { label: 'Customer', value: selectedSlot.customer || '—' },
                { label: 'Order Status', value: selectedSlot.orderStatus || '—' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-100/80">
                  <span className="text-slate-500 font-medium text-[11px]">{row.label}</span>
                  {row.isStatus && row.status ? (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                      style={{
                        backgroundColor: statusConfig[row.status].bg,
                        color: statusConfig[row.status].text,
                        borderColor: statusConfig[row.status].border,
                      }}
                    >
                      {row.value}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-800 text-[11px] text-right truncate max-w-[170px]">
                      {row.value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {selectedSlot.status !== 'free' && selectedSlot.status !== 'planning' && (
              <button className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer">
                <Package size={15} /> View Roll Detail
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
