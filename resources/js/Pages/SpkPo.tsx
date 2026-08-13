import { targetOrders, rollInventory } from '../data/dummy'

export default function SpkPo() {
  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">SPK / Purchase Order</h2>
        <p className="text-xs text-slate-500 mt-0.5">Production fulfillment correlation between SPK instructions and Customer POs</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[850px] text-left border-collapse text-xs">
          <thead>
            <tr>
              <th>SPK No.</th>
              <th>JOP</th>
              <th>PO No.</th>
              <th>Customer</th>
              <th>Grade</th>
              <th className="text-right">Target (rolls)</th>
              <th className="text-right">Fulfilled Rolls</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {targetOrders.map(o => {
              const relatedRolls = rollInventory.filter(r => r.jop === o.jop).length
              const status = relatedRolls >= o.qtyRoll ? 'Complete' : relatedRolls > 0 ? 'In Progress' : 'Pending'
              const sc = status === 'Complete' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : status === 'In Progress' 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'

              return (
                <tr key={o.spk}>
                  <td className="font-bold text-blue-700 font-mono text-xs">{o.spk}</td>
                  <td className="font-mono text-xs text-slate-600">{o.jop}</td>
                  <td className="font-mono text-xs text-slate-600">{o.po}</td>
                  <td className="font-medium text-slate-900">{o.customer}</td>
                  <td>{o.grade}</td>
                  <td className="text-right font-semibold">{o.qtyRoll}</td>
                  <td className="text-right font-bold text-slate-900">{relatedRolls}</td>
                  <td className="text-center">
                    <span className={`badge ${sc}`}>{status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
