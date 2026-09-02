import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { usePage, router } from '@inertiajs/react'
import { Search, Filter, Package, Download, Eye, X, Calendar } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'

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
    currentDate = null
  } = usePage<any>().props;

  const [historyDate, setHistoryDate] = useState(currentDate || '')
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<any>(null)

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

  const totalPages = Math.ceil(filteredShipments.length / perPage)
  const pagedShipments = filteredShipments.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Historical operational summary, OCR performance, and warehouse utilization</p>
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
                <Bar dataKey="occupied" fill="#2563EB" name="Occupied" radius={[0, 0, 4, 4]} />
                <Bar dataKey="available" fill="#E2E8F0" name="Available" radius={[4, 4, 0, 0]} />
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
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Riwayat Produksi Harian</h3>
              <p className="text-[11px] text-slate-500">Agregasi hasil input roll berdasarkan tanggal dan shift</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <Calendar size={14} className="text-slate-500" />
              <input 
                type="date" 
                value={historyDate}
                onChange={(e) => {
                  setHistoryDate(e.target.value)
                  router.get('/reports', { history_date: e.target.value }, { preserveState: true, preserveScroll: true, replace: true })
                }}
                className="bg-transparent border-none outline-none text-xs text-slate-700"
              />
              {historyDate && (
                <button 
                  onClick={() => {
                    setHistoryDate('')
                    router.get('/reports', { history_date: '' }, { preserveState: true, preserveScroll: true, replace: true })
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
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
                <th style={{ textAlign: 'center' }}>Tanggal Produksi</th>
                <th style={{ textAlign: 'center' }}>Shift</th>
                <th style={{ textAlign: 'center' }}>Jumlah Roll</th>
                <th style={{ textAlign: 'center' }}>Total Berat (kg)</th>
              </tr>
            </thead>
            <tbody>
              {productionHistory && productionHistory.length > 0 ? productionHistory.map((h: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="font-semibold text-slate-900" style={{ textAlign: 'center' }}>{h.date}</td>
                  <td className="font-mono text-slate-600" style={{ textAlign: 'center' }}>{h.shift}</td>
                  <td className="font-medium text-blue-700" style={{ textAlign: 'center' }}>{h.total_rolls} Roll</td>
                  <td className="font-medium" style={{ textAlign: 'center' }}>{h.total_weight.toLocaleString('id-ID')}</td>
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
                      <span className="badge inline-flex justify-center px-2.5 py-1 text-xs font-semibold whitespace-nowrap rounded-md uppercase" style={{ backgroundColor: '#d4edda', color: '#3C763D' }}>
                        {s.status}
                      </span>
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
        </div>        {/* Pagination */}
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
                <h3 className="text-base font-bold text-slate-900">Rincian Pengiriman: {selectedShipmentDetail.shipment_number}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Customer: <span className="font-semibold text-slate-700">{selectedShipmentDetail.customer}</span> | Tanggal: {selectedShipmentDetail.date}</p>
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
                      <th style={{ textAlign: 'left' }}>Nomor Roll</th>
                      <th style={{ textAlign: 'center' }}>JOP</th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                      <th style={{ textAlign: 'center' }}>GSM</th>
                      <th style={{ textAlign: 'center' }}>Berat (kg)</th>
                      <th style={{ textAlign: 'center' }}>Tgl Input</th>
                      <th style={{ textAlign: 'center' }}>Status QC</th>
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
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${roll.qc_status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {roll.qc_status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500">
                          Tidak ada roll dalam shipment ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
              <button className="btn btn-secondary text-xs px-4 py-1.5 cursor-pointer" onClick={() => setSelectedShipmentDetail(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
