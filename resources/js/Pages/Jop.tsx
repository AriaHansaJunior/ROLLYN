import { jopData } from '../data/dummy'

export default function Jop() {
  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Job Order Production (JOP)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manufacturing execution tracking and completion status by production order</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1080px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col className="w-[170px]" />
            <col className="w-[230px]" />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col className="w-[150px]" />
            <col className="w-[220px]" />
          </colgroup>
          <thead>
            <tr>
              <th>JOP</th>
              <th>SPK</th>
              <th>PO</th>
              <th>Customer</th>
              <th>Grade</th>
              <th className="text-center">Target Rolls</th>
              <th className="text-center">Completed</th>
              <th className="text-center">Progress</th>
            </tr>
          </thead>
          <tbody>
            {jopData.map(r => {
              const pct = r.progress
              const colorClass = pct >= 100 ? 'bg-green-500 text-green-700' : pct >= 60 ? 'bg-blue-600 text-blue-700' : 'bg-amber-500 text-amber-700'
              const barBg = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-600' : 'bg-amber-500'

              return (
                <tr key={r.jop}>
                  <td className="font-bold text-blue-700 font-mono text-xs">{r.jop}</td>
                  <td className="font-mono text-xs text-slate-600">{r.spk}</td>
                  <td className="font-mono text-xs text-slate-600">{r.po}</td>
                  <td className="font-medium text-slate-900">{r.customer}</td>
                  <td>{r.grade}</td>
                  <td className="text-center font-semibold">{r.target}</td>
                  <td className="text-center font-bold text-slate-900">{r.rolls}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                        <div className={`h-full rounded-full ${barBg}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className={`text-[11px] font-bold w-9 text-right ${colorClass.split(' ')[1]}`}>{pct}%</span>
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
