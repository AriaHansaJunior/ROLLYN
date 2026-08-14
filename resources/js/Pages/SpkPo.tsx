import { targetOrders, rollInventory } from '../data/dummy'

export default function SpkPo() {
  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">SPK / Purchase Order</h2>
        <p className="text-xs text-slate-500 mt-0.5">Production fulfillment correlation between SPK instructions and Customer POs</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1000px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[130px]" />
            <col className="w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[200px]" />
            <col className="w-[100px]" />
            <col className="w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>SPK No.</th>
              <th style={{ textAlign: 'center' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>PO No.</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>Target (rolls)</th>
              <th style={{ textAlign: 'center' }}>Fulfilled Rolls</th>
              <th style={{ textAlign: 'center' }}>Status</th>
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
                  <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{o.spk}</td>
                  <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{o.jop}</td>
                  <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{o.po}</td>
                  <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{o.customer}</td>
                  <td style={{ textAlign: 'center' }}>{o.grade}</td>
                  <td className="font-semibold" style={{ textAlign: 'center' }}>{o.qtyRoll}</td>
                  <td className="font-bold text-slate-900" style={{ textAlign: 'center' }}>{relatedRolls}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      <span className={`badge inline-flex min-w-[96px] justify-center ${sc}`}>{status}</span>
                    </div>
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
