import { useState } from 'react'
import { X, Package } from 'lucide-react'

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

const statusConfig: Record<SlotStatus, { label: string; bg: string; border: string; text: string }> = {
  free: { label: 'Free Space', bg: '#FFFFFF', border: '#DDDDDD', text: '#333' },
  planning: { label: 'Slot Planning', bg: '#CCCCCC', border: '#AAAAAA', text: '#333' },
  slotted: { label: 'Slotted', bg: '#9ecae1', border: '#5b9fcf', text: '#1a4e70' },
  shipment: { label: 'Shipment Plan', bg: '#5CB85C', border: '#3C763D', text: '#fff' },
  nonpo: { label: 'Non-PO', bg: '#e74c3c', border: '#c0392b', text: '#fff' },
  move: { label: 'Move Warehouse', bg: '#f39c12', border: '#d68910', text: '#fff' },
  hold: { label: 'Hold', bg: '#337AB7', border: '#286090', text: '#fff' },
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
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>Warehouse Map</h2>

      {/* WH Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 4, marginBottom: 16, paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {warehouses.map(wh => (
          <button
            key={wh}
            className={`tab-button ${activeWH === wh ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => { setActiveWH(wh); setSelectedSlot(null) }}
          >
            Warehouse {wh}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16 }} className={selectedSlot ? "grid-cols-1 min-[680px]:grid-cols-[1fr_280px]" : "grid-cols-1"}>
        {/* Map */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="section-title">Warehouse {activeWH} — Slot Layout</h3>
            <div style={{ display: 'flex', gap: 4, fontSize: 11, color: '#777' }}>
              <span>Rows: {slots.length}</span>
              <span style={{ color: '#DDD' }}>|</span>
              <span>Cols: {cols}</span>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ minWidth: cols * 52 + 40 }}>
              <div style={{ display: 'flex', gap: 3, marginLeft: 40, marginBottom: 4 }}>
                {Array.from({ length: cols }, (_, i) => (
                  <div key={i} style={{ width: 48, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#999', fontFamily: 'JetBrains Mono, monospace' }}>
                    C{String(i + 1).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {slots.map((row, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                  <div style={{ width: 36, fontSize: 10, fontWeight: 700, color: '#999', textAlign: 'right', marginRight: 4, fontFamily: 'JetBrains Mono, monospace' }}>
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
                          width: 48,
                          height: 28,
                          borderRadius: 3,
                          background: cfg.bg,
                          border: `1px solid ${isSelected ? '#333' : cfg.border}`,
                          cursor: 'pointer',
                          fontSize: 9,
                          color: cfg.text,
                          fontFamily: 'JetBrains Mono, monospace',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? '0 0 0 2px #333' : 'none',
                          transition: 'box-shadow 0.1s',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          padding: '0 2px',
                        }}
                      >
                        {slot.code.split('-')[0].slice(-3)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid #EEEEEE' }}>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 2, background: cfg.bg, border: `1px solid ${cfg.border}` }} />
                <span style={{ fontSize: 11, color: '#555' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Backdrop for Detail Panel */}
        {selectedSlot && (
          <div className="fixed inset-0 bg-black/50 z-40 min-[680px]:hidden" onClick={() => setSelectedSlot(null)} />
        )}

        {/* Slot Detail Panel */}
        {selectedSlot && (
          <div className="card max-[679px]:fixed max-[679px]:bottom-0 max-[679px]:left-0 max-[679px]:right-0 max-[679px]:z-50 max-[679px]:rounded-t-2xl max-[679px]:rounded-b-none max-[679px]:shadow-[0_-4px_24px_rgba(0,0,0,0.15)] max-[679px]:max-h-[85vh] max-[679px]:overflow-y-auto" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="section-title">Slot Detail</h3>
              <button onClick={() => setSelectedSlot(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Slot Code', value: selectedSlot.code },
                { label: 'Warehouse', value: `Warehouse ${activeWH}` },
                { label: 'Status', value: statusConfig[selectedSlot.status].label, isStatus: true, status: selectedSlot.status },
                { label: 'Roll Number', value: selectedSlot.rollNumber || '—' },
                { label: 'Grade', value: selectedSlot.grade || '—' },
                { label: 'GSM', value: selectedSlot.gsm ? `${selectedSlot.gsm} g/m²` : '—' },
                { label: 'Weight', value: selectedSlot.weight ? `${selectedSlot.weight} kg` : '—' },
                { label: 'JOP', value: selectedSlot.jop || '—' },
                { label: 'Customer', value: selectedSlot.customer || '—' },
                { label: 'Order Status', value: selectedSlot.orderStatus || '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #EEEEEE' }}>
                  <span style={{ fontSize: 12, color: '#777', fontWeight: 500 }}>{row.label}</span>
                  {row.isStatus && row.status ? (
                    <span className="badge" style={{ background: statusConfig[row.status].bg, color: statusConfig[row.status].text, border: `1px solid ${statusConfig[row.status].border}` }}>
                      {row.value}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#333', fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                  )}
                </div>
              ))}
            </div>
            {selectedSlot.status !== 'free' && selectedSlot.status !== 'planning' && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                <Package size={13} /> View Roll Detail
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
