import { jopData } from '../data/dummy'

export default function Jop() {
  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Job Order Production (JOP)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manufacturing execution tracking and completion status by production order</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[980px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[130px]" />
            <col className="w-[130px]" />
            <col className="w-[130px]" />
            <col className="w-[200px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            <col className="w-[110px]" />
            <col className="w-[160px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>SPK</th>
              <th style={{ textAlign: 'center' }}>PO</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>Target Rolls</th>
              <th style={{ textAlign: 'center' }}>Completed</th>
              <th style={{ textAlign: 'center' }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {jopData.map(r => {
              const pct = r.progress
              const colorClass = pct >= 100 ? 'bg-green-500 text-green-700' : pct >= 60 ? 'bg-blue-600 text-blue-700' : 'bg-amber-500 text-amber-700'
              const barBg = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-600' : 'bg-amber-500'

              return (
                <tr key={r.jop}>
                  <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.jop}</td>
                  <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.spk}</td>
                  <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.po}</td>
                  <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{r.customer}</td>
                  <td style={{ textAlign: 'center' }}>{r.grade}</td>
                  <td className="font-semibold" style={{ textAlign: 'center' }}>{r.target}</td>
                  <td className="font-bold text-slate-900" style={{ textAlign: 'center' }}>{r.rolls}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-full max-w-[90px] h-2 bg-slate-100 rounded-full overflow-hidden">
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
