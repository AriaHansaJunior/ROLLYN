import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { usePage, router } from '@inertiajs/react'
import { Search, Filter, Package, Download, Eye, X, Calendar, Activity } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'
import axios from 'axios'
import { useEffect } from 'react'

interface OutgoingRoll {
  id: number
  no_roll: string
  jop: string
  customer: string
  grade: string
  gsm: number | string
  weight: number
  entry_date: string
  status: string
}

export default function Reports() {
  const {
    warehouseData = [],
    demandForecast = [],
    statusDistribution = [],
    ocrActivity = [],
    kpis = [],
    shipments = [],
    productionHistory = [],
    currentDate = null,
    currentShift = '',
    shifts = []
  } = usePage<any>().props;

  const [historyDate, setHistoryDate] = useState(currentDate || '')
  const [historyShift, setHistoryShift] = useState(currentShift || '')
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<any>(null)

  function applyHistoryFilter(newDate: string, newShift: string) {
    setHistoryDate(newDate);
    setHistoryShift(newShift);
    const params: Record<string, string> = {};
    if (newDate) params.history_date = newDate;
    if (newShift && newShift !== 'all' && newShift !== '') params.history_shift = newShift;
    router.get('/reports', params, { preserveState: true, preserveScroll: true, replace: true });
  }

  const [logType, setLogType] = useState('jumbo')
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logSearch, setLogSearch] = useState('')

  useEffect(() => {
    setLoadingLogs(true)
    axios.get(`/api/reports/logs?type=${logType}`)
      .then(res => setLogs(res.data))
      .catch(err => {
        console.error(err)
        SystemUI.toast({ message: 'Failed to fetch process logs', type: 'error' })
      })
      .finally(() => setLoadingLogs(false))
  }, [logType])

  const [outgoingSearch, setOutgoingSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const filteredShipments = (shipments || []).filter((s: any) => {
    if (!outgoingSearch) return true
    const q = outgoingSearch.toLowerCase()
    return (
      (s.shipment_number || '').toLowerCase().includes(q) ||
      (s.customer || '').toLowerCase().includes(q)
    )
  })

  function exportOutgoingCSV() {
    const dataToExport = filteredShipments.length > 0 ? filteredShipments : (shipments || [])
    if (dataToExport.length === 0) {
      SystemUI.toast({ message: 'No outgoing shipments to export.', type: 'warning' })
      return
    }

    const headers = ['Shipment Number', 'Customer', 'Date', 'Admin', 'QC', 'Total Rolls', 'Status']
    const rows = [
      'sep=,',
      headers.join(','),
      ...dataToExport.map((s: any) => [
        `"${(s.shipment_number || '').replace(/"/g, '""')}"`,
        `"${(s.customer || '').replace(/"/g, '""')}"`,
        `"${(s.date || '').replace(/"/g, '""')}"`,
        `"${(s.admin || '').replace(/"/g, '""')}"`,
        `"${(s.qc || '').replace(/"/g, '""')}"`,
        s.total_rolls || 0,
        `"${(s.status || '').replace(/"/g, '""')}"`
      ].join(','))
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rollyn_outgoing_shipments_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    SystemUI.toast({ message: `Exported ${dataToExport.length} outgoing roll records to CSV.`, type: 'success' })
  }

  const filteredLogs = logs.filter((log: any) => {
    if (!logSearch) return true
    const q = logSearch.toLowerCase()
    return (
      (log.number || '').toLowerCase().includes(q) ||
      (log.grade || '').toLowerCase().includes(q) ||
      (log.customer || '').toLowerCase().includes(q) ||
      (log.status || '').toLowerCase().includes(q) ||
      (log.jop || '').toLowerCase().includes(q)
    )
  })

  function exportLogsExcel() {
    const dataToExport = filteredLogs.length > 0 ? filteredLogs : logs
    if (dataToExport.length === 0) {
      SystemUI.toast({ message: 'No logs to export.', type: 'warning' })
      return
    }

    const headers = ['Date', 'Reference Number', 'Specification (Grade / GSM)', 'JOP/Customer', 'Target', 'Actual', 'Status']
    const rows = [
      'sep=,',
      headers.join(','),
      ...dataToExport.map((log: any) => {
        const spec = `${log.grade || '-'} / ${log.gsm || '-'} gsm`
        let jopCust = '-'
        if (logType === 'jop' && log.customer) jopCust = log.customer
        if (logType === 'reproduction' && log.jop) jopCust = log.jop

        const target = logType === 'reproduction' ? '-' : `${log.target_weight || 0} ${logType === 'jop' ? 'Ton' : 'kg'}`
        const actual = logType === 'reproduction' ? `${log.weight || 0} kg` : `${log.actual_weight || 0} ${logType === 'jop' ? 'Ton' : 'kg'}`

        return [
          `"${(log.date || '').replace(/"/g, '""')}"`,
          `"${(log.number || '').replace(/"/g, '""')}"`,
          `"${spec.replace(/"/g, '""')}"`,
          `"${jopCust.replace(/"/g, '""')}"`,
          `"${target.replace(/"/g, '""')}"`,
          `"${actual.replace(/"/g, '""')}"`,
          `"${(log.status || '').replace(/"/g, '""')}"`
        ].join(',')
      })
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rollyn_${logType}_logs_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    SystemUI.toast({ message: `Exported ${dataToExport.length} ${logType} logs to Excel.`, type: 'success' })
  }

  const totalPages = Math.ceil(filteredShipments.length / perPage)
  const pagedShipments = filteredShipments.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Historical operational summary, OCR performance, and warehouse utilization</p>
      </div>

      {/* Process Activity Logs Section */}
      <div className="card p-4 sm:p-5 border border-slate-200/90 shadow-2xs rounded-xl bg-white space-y-3.5 mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Process Activity Logs</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  {filteredLogs.length} Records
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Track Jumbo Roll, JOP Production, and Reproduction disposition history</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            {/* Search within logs */}
            <div className="relative w-full sm:w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="form-input text-xs w-full !pl-8 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border-slate-200 rounded-lg"
                style={{ paddingLeft: '2rem' }}
              />
            </div>

            {/* Type selector */}
            <select
              value={logType}
              onChange={(e) => {
                setLogType(e.target.value);
                setLogSearch('');
              }}
              className="form-input text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-white border-slate-200 rounded-lg py-1.5 px-3 cursor-pointer transition-colors shadow-2xs w-full sm:w-auto"
            >
              <option value="jumbo">Jumbo Roll Status</option>
              <option value="jop">JOP Production Status</option>
              <option value="reproduction">Re-production Disposition</option>
            </select>

            {/* Export button */}
            <button
              onClick={exportLogsExcel}
              className="btn btn-secondary text-xs flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs transition-colors whitespace-nowrap w-full sm:w-auto"
              title="Export Activity Logs as CSV / Excel"
            >
              <Download size={13} className="text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table container */}
        <div className="border border-slate-200/90 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="data-table w-full min-w-[720px] text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-2xs">
                <tr>
                  <th style={{ textAlign: 'left', width: '130px' }}>Date</th>
                  <th style={{ textAlign: 'left', width: '120px' }}>Reference</th>
                  <th style={{ textAlign: 'left' }}>Specification & Order</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Target</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Actual</th>
                  <th style={{ textAlign: 'center', width: '160px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Loading activity logs...
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      <div className="text-xs text-slate-400">No activity logs found.</div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="whitespace-nowrap font-medium text-slate-600 font-mono text-[11.5px]">
                        {log.date}
                      </td>
                      <td>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50/80 border border-blue-200/70 px-2 py-0.5 rounded text-xs inline-block">
                          {log.number}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-slate-800">{log.grade || '—'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-600">{log.gsm} gsm</span>
                          {logType === 'jop' && log.customer && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600 font-medium truncate max-w-[200px]" title={log.customer}>
                                {log.customer}
                              </span>
                            </>
                          )}
                          {logType === 'reproduction' && log.jop && log.jop !== '-' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-blue-600 font-mono">JOP: {log.jop}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="text-right font-mono text-slate-600">
                        {logType === 'reproduction' ? '—' : `${Number(log.target_weight || 0).toLocaleString()} ${logType === 'jop' ? 'Ton' : 'kg'}`}
                      </td>
                      <td className="text-right font-mono font-bold text-slate-900">
                        {logType === 'reproduction' ? `${Number(log.weight || 0).toLocaleString()} kg` : `${Number(log.actual_weight || 0).toLocaleString()} ${logType === 'jop' ? 'Ton' : 'kg'}`}
                      </td>
                      <td className="text-center">
                        {(() => {
                          const st = (log.status || '').toLowerCase();
                          const isDone = st === 'completed' || st.includes('ok') || st.includes('released') || st.includes('passed');
                          const isProgress = st.includes('in progress') || st.includes('in_progress');
                          const isShipped = st.includes('shipped') || st.includes('approved');
                          const isDanger = st.includes('reject') || st.includes('reweigh') || st.includes('hold');

                          const badgeClass = isDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isProgress
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : isShipped
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isDanger
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200';

                          const dotColor = isDone
                            ? 'bg-emerald-500'
                            : isProgress
                            ? 'bg-amber-500'
                            : isShipped
                            ? 'bg-blue-500'
                            : isDanger
                            ? 'bg-red-500'
                            : 'bg-slate-400';

                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass} whitespace-nowrap`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {log.status}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="sm:hidden text-[10.5px] text-slate-400 text-center">
          ← Swipe horizontally to see all columns →
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 min-[680px]:grid-cols-3 min-[1180px]:grid-cols-6 gap-2.5">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 truncate mb-1">{kpi.label}</div>
            <div className="text-xl font-extrabold text-blue-900 font-mono leading-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 min-[680px]:grid-cols-2 gap-4">
        {}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Warehouse Occupancy (Slots)</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `WH ${v}`} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="occupied" stackId="a" fill="#2563EB" name="Occupied" radius={[0, 0, 4, 4]} maxBarSize={60} />
                <Bar dataKey="available" stackId="a" fill="#E2E8F0" name="Available" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Roll Status Distribution</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={false} labelLine={false}>
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} stroke={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">OCR Recognition Activity (Last 7 Days)</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocrActivity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="success" fill="#16A34A" name="Success" radius={[4, 4, 0, 0]} />
                <Bar dataKey="error" fill="#DC2626" name="Error" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Demand Trend & Forecast</h3>
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandForecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} name="Actual" dot={{ r: 2 }} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#16A34A" strokeWidth={2.5} strokeDasharray="5 3" name="Forecast (AI)" dot={{ r: 2 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Production History Section */}
      <div className="space-y-3 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Daily Production History</h3>
              <p className="text-[11px] text-slate-500">Aggregate roll input results by date and shift</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Filter size={13} className="text-slate-500 shrink-0" />
              <select
                value={historyShift}
                onChange={(e) => applyHistoryFilter(historyDate, e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-700 font-medium cursor-pointer"
              >
                <option value="">All Shifts</option>
                {shifts && shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    Shift: {s.shift}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <Calendar size={14} className="text-slate-500 shrink-0" />
              <input 
                type="date" 
                value={historyDate}
                onChange={(e) => applyHistoryFilter(e.target.value, historyShift)}
                className="bg-transparent border-none outline-none text-xs text-slate-700 cursor-pointer"
              />
              {historyDate && (
                <button 
                  onClick={() => applyHistoryFilter('', historyShift)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Clear date filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Reset All Filters Button */}
            {(historyDate || historyShift) && (
              <button
                onClick={() => applyHistoryFilter('', '')}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-slate-600 hover:text-red-600 cursor-pointer"
                title="Reset all date & shift filters"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="data-table w-full min-w-[500px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[120px]" />
              <col className="w-[150px]" />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Production Date</th>
                <th style={{ textAlign: 'center' }}>Shift</th>
                <th style={{ textAlign: 'center' }}>Total Rolls</th>
                <th style={{ textAlign: 'center' }}>Total Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {productionHistory && productionHistory.length > 0 ? productionHistory.map((h: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="font-semibold text-slate-900" style={{ textAlign: 'center' }}>{h.date}</td>
                  <td className="font-mono text-slate-600" style={{ textAlign: 'center' }}>{h.shift}</td>
                  <td className="font-medium text-blue-700" style={{ textAlign: 'center' }}>{h.total_rolls} {h.total_rolls === 1 ? 'Roll' : 'Rolls'}</td>
                  <td className="font-medium" style={{ textAlign: 'center' }}>{h.total_weight.toLocaleString('en-US')}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">No production history data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outgoing Shipment Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Outgoing Shipment</h3>
              <p className="text-[11px] text-slate-500">Rolls with Shipment Plan status — linked to JOP orders, not yet assigned to warehouse slots</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">{filteredShipments.length} shipments</span>
        </div>

        {/* Search & Export */}
        <div className="card p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:max-w-md">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={outgoingSearch}
              onChange={e => { setOutgoingSearch(e.target.value); setPage(1) }}
              placeholder="Search roll, JOP, customer, grade..."
              className="w-full min-w-0 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={exportOutgoingCSV}
            className="btn btn-secondary btn-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Outgoing Table */}
        <div className="card overflow-x-auto">
          <table className="data-table w-full min-w-[900px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[140px]" />
              <col className="w-[160px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Shipment Number</th>
                <th style={{ textAlign: 'center' }}>Customer</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'center' }}>Admin</th>
                <th style={{ textAlign: 'center' }}>QC</th>
                <th style={{ textAlign: 'center' }}>Total Rolls</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pagedShipments.length > 0 ? pagedShipments.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{s.shipment_number}</td>
                  <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{s.customer}</td>
                  <td className="text-slate-600" style={{ textAlign: 'center' }}>{s.date}</td>
                  <td className="font-semibold text-slate-800" style={{ textAlign: 'center' }}>{s.admin}</td>
                  <td className="font-semibold text-slate-800" style={{ textAlign: 'center' }}>{s.qc}</td>
                  <td className="font-medium" style={{ textAlign: 'center' }}>{s.total_rolls} Roll</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      {(() => {
                        const st = (s.status || '').toLowerCase();
                        const isCanceled = st === 'canceled' || st === 'cancelled' || st === 'rejected';
                        const isCompleted = st === 'completed' || st === 'passed';
                        return (
                          <span
                            className={`badge inline-flex justify-center px-2.5 py-1 text-xs font-semibold whitespace-nowrap rounded-md uppercase ${
                              isCanceled
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.status}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedShipmentDetail(s)}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5 mx-auto py-1 px-2"
                    >
                      <Eye size={13} />
                      <span>Detail</span>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No shipments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Showing {filteredShipments.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filteredShipments.length)} of {filteredShipments.length}
            </span>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="text-xs border-slate-200 rounded-md py-1 px-2 pr-7 text-slate-600 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {[5, 10, 25, 50].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'} min-w-[30px] justify-center`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* Shipment Detail Modal */}
      {selectedShipmentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Shipment Details: {selectedShipmentDetail.shipment_number}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Customer: <span className="font-semibold text-slate-700">{selectedShipmentDetail.customer}</span> | Date: {selectedShipmentDetail.date}</p>
              </div>
              <button 
                onClick={() => setSelectedShipmentDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto bg-slate-50 flex-1">
              <div className="card overflow-x-auto bg-white border border-slate-200">
                <table className="data-table w-full text-xs">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>No</th>
                      <th style={{ textAlign: 'left' }}>Roll Number</th>
                      <th style={{ textAlign: 'center' }}>JOP</th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                      <th style={{ textAlign: 'center' }}>GSM</th>
                      <th style={{ textAlign: 'center' }}>Weight (kg)</th>
                      <th style={{ textAlign: 'center' }}>Entry Date</th>
                      <th style={{ textAlign: 'center' }}>QC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedShipmentDetail.rolls && selectedShipmentDetail.rolls.length > 0 ? (
                      selectedShipmentDetail.rolls.map((roll: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td style={{ textAlign: 'center' }} className="text-slate-500">{index + 1}</td>
                          <td className="font-bold text-blue-700 font-mono" style={{ textAlign: 'left' }}>{roll.no_roll}</td>
                          <td style={{ textAlign: 'center' }} className="font-mono text-slate-600">{roll.jop}</td>
                          <td style={{ textAlign: 'center' }} className="font-medium text-slate-800">{roll.grade}</td>
                          <td style={{ textAlign: 'center' }}>{roll.gsm}</td>
                          <td style={{ textAlign: 'center' }} className="font-medium">{roll.weight}</td>
                          <td style={{ textAlign: 'center' }} className="text-slate-600">{roll.entry_date}</td>
                          <td style={{ textAlign: 'center' }}>
                            {(() => {
                              const qc = (roll.qc_status || '').toLowerCase();
                              const isPassed = qc === 'passed';
                              const isRejected = qc.includes('reject');
                              return (
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                    isPassed
                                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      : isRejected
                                      ? 'bg-red-100 text-red-700 border border-red-200'
                                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {roll.qc_status || 'pending'}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500">
                          No rolls in this shipment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
              <button className="btn btn-secondary text-xs px-4 py-1.5 cursor-pointer" onClick={() => setSelectedShipmentDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
