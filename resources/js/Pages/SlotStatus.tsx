import { warehouseData } from '../data/dummy'

const statusDef = [
  { key: 'available', label: 'Free Space', bg: '#FFFFFF', border: '#CBD5E1', color: '#334155' },
  { key: 'planning', label: 'Slot Planning', bg: '#F1F5F9', border: '#94A3B8', color: '#1E293B' },
  { key: 'occupied', label: 'Slotted', bg: '#E0F2FE', border: '#0284C7', color: '#0369A1' },
  { key: 'shipment', label: 'Shipment Plan', bg: '#DCFCE7', border: '#16A34A', color: '#15803D' },
  { key: 'nonPO', label: 'Non-PO', bg: '#FEE2E2', border: '#DC2626', color: '#B91C1C' },
  { key: 'moveWH', label: 'Move Warehouse', bg: '#FEF3C7', border: '#D97706', color: '#B45309' },
  { key: 'hold', label: 'Hold', bg: '#DBEAFE', border: '#2563EB', color: '#1D4ED8' },
]

export default function SlotStatus() {
  const totals = warehouseData.reduce((acc, wh) => {
    statusDef.forEach(s => {
      acc[s.key] = (acc[s.key] || 0) + ((wh as unknown as Record<string, number>)[s.key] || 0)
    })
    return acc
  }, {} as Record<string, number>)

  const totalSlots = warehouseData.reduce((s, w) => s + w.total, 0)

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Slot Status</h2>
        <p className="text-xs text-slate-500 mt-0.5">Overview of warehouse slot locations and status distribution</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 min-[680px]:grid-cols-3 min-[960px]:grid-cols-4 min-[1180px]:grid-cols-7 gap-2.5">
        {statusDef.map(s => (
          <div key={s.key} className="bg-white border rounded-xl p-3.5 shadow-2xs" style={{ borderColor: s.border }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: s.bg, borderColor: s.border }} />
              <span className="text-[11px] font-semibold text-slate-600 truncate">{s.label}</span>
            </div>
            <div className="text-2xl font-extrabold" style={{ color: s.border }}>{totals[s.key] || 0}</div>
            <div className="text-[10px] font-medium text-slate-400 mt-1">
              {totalSlots > 0 ? Math.round(((totals[s.key] || 0) / totalSlots) * 100) : 0}% of total
            </div>
          </div>
        ))}
      </div>

      {/* Per-warehouse breakdown */}
      <div className="card overflow-x-auto">
        <div className="p-3.5 sm:p-4 border-b border-slate-100">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Per-Warehouse Slot Distribution</h3>
          <p className="text-[11px] text-slate-400">Detailed count by warehouse facility</p>
        </div>
        <table className="data-table w-full min-w-[680px] text-left border-collapse text-xs">
          <thead>
            <tr>
              <th>Warehouse</th>
              {statusDef.map(s => <th key={s.key} className="text-right">{s.label}</th>)}
              <th className="text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {warehouseData.map(wh => (
              <tr key={wh.id}>
                <td className="font-bold text-blue-700">WH {wh.id}</td>
                {statusDef.map(s => {
                  const val = (wh as unknown as Record<string, number>)[s.key] || 0
                  return (
                    <td key={s.key} className="text-right">
                      {val > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}>
                          {val}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  )
                })}
                <td className="text-right font-bold text-slate-900">{wh.total}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-200">
              <td className="text-slate-900">Total</td>
              {statusDef.map(s => <td key={s.key} className="text-right text-slate-900">{totals[s.key] || 0}</td>)}
              <td className="text-right text-blue-700">{totalSlots}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
