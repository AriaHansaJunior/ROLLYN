import React from 'react'
import {
  Search, Filter, X, Eye, Edit, Trash2, MapPin, Truck, XCircle, Scale, RotateCcw
} from 'lucide-react'
import { router } from '@inertiajs/react'
import { RollItem, statusColors } from './RollInventory_types'

interface RollInventory_StorageTabProps {
  rolls: RollItem[]
  filtered: RollItem[]
  paged: RollItem[]
  totalPages: number
  search: string
  setSearch: (s: string) => void
  statusFilter: string
  setStatusFilter: (s: string) => void
  statuses: string[]
  queueFilter: string
  setQueueFilter: (q: string) => void
  qcStatusFilter: string
  setQcStatusFilter: (q: string) => void
  reproductionFilter: string
  setReproductionFilter: (r: string) => void
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  perPage: number
  setPerPage: (n: number) => void
  advFilters: any
  setAdvFilters: React.Dispatch<React.SetStateAction<any>>
  checkedRollIds: string[]
  setCheckedRollIds: React.Dispatch<React.SetStateAction<string[]>>
  toggleRollChecked: (id: string, isQueued: boolean) => void
  toggleSelectAllVisible: () => void
  cols: { key: string; label: string }[]
  sort: (key: string) => void
  SortIcon: (props: { k: string }) => React.ReactNode
  isQC: boolean
  openEdit: (roll: RollItem) => void
  handleAssignClick: (roll: RollItem, mode: 'assign' | 'move') => void
  handleDelete: (roll: RollItem) => void
  openShipmentModal: () => void
  queuedRollsCount: number
  unqueuedRollsCount: number
  holdRollsCount: number
}

export default function RollInventory_StorageTab({
  rolls,
  filtered,
  paged,
  totalPages,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  statuses,
  queueFilter,
  setQueueFilter,
  qcStatusFilter,
  setQcStatusFilter,
  reproductionFilter,
  setReproductionFilter,
  page,
  setPage,
  perPage,
  setPerPage,
  advFilters,
  setAdvFilters,
  checkedRollIds,
  setCheckedRollIds,
  toggleRollChecked,
  toggleSelectAllVisible,
  cols,
  sort,
  SortIcon,
  isQC,
  openEdit,
  handleAssignClick,
  handleDelete,
  openShipmentModal,
  queuedRollsCount,
  unqueuedRollsCount,
  holdRollsCount,
}: RollInventory_StorageTabProps) {
  return (
    <div className="space-y-4">
      {/* Filter Card */}
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:max-w-md min-w-0">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search roll number, grade, JOP, location, shipment..."
              className="w-full min-w-0 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 justify-between w-full sm:w-auto sm:justify-end">
            <div className="flex items-center gap-1.5 min-w-0">
              <Filter size={13} className="text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="form-input text-xs py-1.5 min-w-[130px] w-auto"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All Storage Status' : s}</option>
                ))}
              </select>
              <select
                value={qcStatusFilter}
                onChange={e => { setQcStatusFilter(e.target.value); setPage(1) }}
                className="form-input text-xs py-1.5 min-w-[125px] w-auto font-medium"
              >
                <option value="All">All Label Status</option>
                <option value="OK">OK (Released)</option>
                <option value="HOLD">HOLD (Verification)</option>
              </select>
              <select
                value={reproductionFilter}
                onChange={e => { setReproductionFilter(e.target.value); setPage(1) }}
                className="form-input text-xs py-1.5 min-w-[150px] w-auto font-medium"
              >
                <option value="All">All Re-production</option>
                <option value="shipped">Shipped</option>
                <option value="reject">Reject</option>
                <option value="reweigh">Reweigh</option>
                <option value="reproduce_again">Reproduce Again</option>
                <option value="none">Standard / None</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <select value={advFilters.width} onChange={e => {setAdvFilters((f: any) => ({...f, width: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Width</option>
            {Array.from(new Set(rolls.map(r => String(r.width || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.grade} onChange={e => {setAdvFilters((f: any) => ({...f, grade: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Grade</option>
            {Array.from(new Set(rolls.map(r => String(r.grade || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.gsm} onChange={e => {setAdvFilters((f: any) => ({...f, gsm: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All GSM</option>
            {Array.from(new Set(rolls.map(r => String(r.gsm || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.plybond} onChange={e => {setAdvFilters((f: any) => ({...f, plybond: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All PlyBond</option>
            {Array.from(new Set(rolls.map(r => String(r.plybond || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.thickness} onChange={e => {setAdvFilters((f: any) => ({...f, thickness: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Thickness</option>
            {Array.from(new Set(rolls.map(r => String(r.thickness || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.bulk} onChange={e => {setAdvFilters((f: any) => ({...f, bulk: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All BULK</option>
            {Array.from(new Set(rolls.map(r => String(r.bulk || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.diameter} onChange={e => {setAdvFilters((f: any) => ({...f, diameter: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Diameter</option>
            {Array.from(new Set(rolls.map(r => String(r.diameter || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.core} onChange={e => {setAdvFilters((f: any) => ({...f, core: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Core</option>
            {Array.from(new Set(rolls.map(r => String(r.core || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.weight} onChange={e => {setAdvFilters((f: any) => ({...f, weight: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Weight</option>
            {Array.from(new Set(rolls.map(r => String(r.weight || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={advFilters.cobb} onChange={e => {setAdvFilters((f: any) => ({...f, cobb: e.target.value})); setPage(1)}} className="form-input text-xs py-1.5 min-w-[120px] flex-1">
            <option value="">All Cobb</option>
            {Array.from(new Set(rolls.map(r => String(r.cobb || '')).filter(Boolean))).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {/* Shipment Queue Switch Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => { setQueueFilter('all'); setPage(1) }}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${queueFilter === 'all' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Rolls ({rolls.length})
            </button>
            <button
              type="button"
              onClick={() => { setQueueFilter('not_queued'); setPage(1) }}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${queueFilter === 'not_queued' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Available ({unqueuedRollsCount})
            </button>
            <button
              type="button"
              onClick={() => { setQueueFilter('queued'); setPage(1) }}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${queueFilter === 'queued' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Shipment Queued ({queuedRollsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQcStatusFilter(qcStatusFilter === 'HOLD' ? 'All' : 'HOLD');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${qcStatusFilter === 'HOLD'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              HOLD Verification ({holdRollsCount})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">
              Showing <strong className="text-slate-800">{filtered.length}</strong> rolls
            </span>
            {checkedRollIds.length > 0 && (
              <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {checkedRollIds.length} rolls selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-x-auto relative">
        <table className="data-table w-full min-w-[1250px] table-fixed border-collapse text-xs">
          <colgroup>
            {!isQC && <col className="w-[45px]" />}
            <col className="w-[85px]" />
            <col className="w-[105px]" />
            <col className="w-[140px]" />
            <col className="w-[70px]" />
            <col className="w-[110px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            <col className="w-[130px]" />
            <col className="w-[95px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
          </colgroup>
          <thead>
            <tr>
              {!isQC && (
                <th style={{ textAlign: 'center' }} className="py-2.5">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.filter(r => !r.in_shipment_queue).length > 0 && paged.filter(r => !r.in_shipment_queue).every(r => checkedRollIds.includes(r.id))}
                    onChange={toggleSelectAllVisible}
                    title="Select all available rolls on this page"
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600 cursor-pointer"
                  />
                </th>
              )}
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => sort(col.key)}
                  className="cursor-pointer select-none tracking-wider text-[11px] font-bold text-slate-700"
                  style={{ textAlign: 'center' }}
                >
                  {col.label}
                  <span className="inline-block align-middle ml-1"><SortIcon k={col.key} /></span>
                </th>
              ))}
              <th style={{ textAlign: 'center' }} className="tracking-wider text-[11px] font-bold text-slate-700">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 2} className="text-center py-10 text-slate-400">
                  No rolls found matching the filter criteria.
                </td>
              </tr>
            ) : paged.map(r => {
              const sc = statusColors[r.status] || { bg: '#EEEEEE', color: '#333' }
              const isSlotted = Boolean(r.locations_id) || (Boolean(r.location) && r.location !== 'No Slot' && r.location !== 'Unallocated' && r.location !== '—')
              const shiftNum = r.shift ? r.shift.replace(/Shift\s*/i, '') : '1'
              const isChecked = checkedRollIds.includes(r.id)
              const isQueued = Boolean(r.in_shipment_queue)

              return (
                <tr
                  key={r.raw_id || r.id}
                  className={`transition-colors border-b border-slate-100 ${isQueued
                      ? 'bg-indigo-50/20 hover:bg-indigo-50/40 text-slate-600'
                      : isChecked
                        ? 'bg-blue-50/60 hover:bg-blue-50'
                        : 'hover:bg-slate-50/80'
                    }`}
                >
                  {!isQC && (
                    <td style={{ textAlign: 'center' }}>
                      {isQueued ? (
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          title={`Roll already queued in shipment ${r.shipment_queue_number || ''}`}
                          className="w-4 h-4 text-slate-300 rounded border-slate-200 cursor-not-allowed opacity-40"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRollChecked(r.id, isQueued)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600 cursor-pointer"
                        />
                      )}
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    <span className="inline-flex flex-col items-center justify-center bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold leading-none">Shift</span>
                      <span className="font-bold text-slate-800 text-xs leading-tight">{shiftNum}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700">{r.date}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="font-bold text-slate-800 text-xs">{r.grade}</span>
                    <div className="text-[10px] text-slate-400 font-mono">{r.no_roll}</div>
                  </td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700">{r.gsm}</td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700 font-medium">{r.weight ? r.weight.toLocaleString('en-US') : 0}</td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700">{r.width}</td>
                  <td style={{ textAlign: 'center' }}>
                    {r.location ? (
                      <span className="inline-block font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 text-xs font-mono">
                        {r.location}
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold text-xs">No Slot</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-600 font-mono">{r.jop}</td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700 uppercase font-medium">{r.pic}</td>
                  <td style={{ textAlign: 'center' }} className="whitespace-nowrap px-2 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="badge inline-flex justify-center px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap rounded-md"
                        style={{ backgroundColor: sc.bg, color: sc.color }}
                      >
                        {r.status}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.roll_status === 'HOLD'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}
                      >
                        Label: {r.roll_status || 'OK'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Visual: {r.visual || 'OK'}
                      </span>
                      {r.reproduction_status && r.reproduction_status !== 'none' && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.reproduction_status === 'shipped'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : r.reproduction_status === 'reject'
                              ? 'bg-red-50 text-red-700 border border-red-300'
                              : r.reproduction_status === 'reweigh'
                              ? 'bg-amber-50 text-amber-700 border border-amber-300'
                              : 'bg-purple-50 text-purple-700 border border-purple-300'}`}
                          title={`PPIC Disposition: ${r.reproduction_status}`}
                        >
                          {r.reproduction_status === 'shipped' && <Truck size={10} />}
                          {r.reproduction_status === 'reject' && <XCircle size={10} />}
                          {r.reproduction_status === 'reweigh' && <Scale size={10} />}
                          {r.reproduction_status === 'reproduce_again' && <RotateCcw size={10} />}
                          {r.reproduction_status === 'shipped'
                            ? 'Shipped'
                            : r.reproduction_status === 'reject'
                            ? 'Reject'
                            : r.reproduction_status === 'reweigh'
                            ? 'Reweigh'
                            : 'Reproduce Again'}
                        </span>
                      )}
                      {isQueued && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full"
                          title={`Queued in shipment: ${r.shipment_queue_number}`}
                        >
                          <Truck size={10} />
                          Queued
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }} className="whitespace-nowrap px-2 py-2">
                    <div className="flex gap-1.5 justify-center items-center">
                      {!isQC && (
                        <button
                          className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                          onClick={() => router.visit(`/roll-detail/${r.raw_id}`)}
                          title="View Roll Detail"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        className={`p-1.5 rounded transition-colors cursor-pointer border ${r.roll_status === 'HOLD'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 shadow-xs'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-slate-200'}`}
                        onClick={() => openEdit(r)}
                        title={r.roll_status === 'HOLD' ? 'Verify & Release HOLD Roll' : 'Edit Roll Data'}
                      >
                        <Edit size={14} />
                      </button>
                      {!isQC && (
                        <>
                          <button
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            onClick={() => handleAssignClick(r, isSlotted ? 'move' : 'assign')}
                            title={isSlotted ? `Move Roll Location (Current: ${r.location})` : 'Assign Location Slot'}
                          >
                            <MapPin size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                            onClick={() => handleDelete(r)}
                            title="Delete Roll"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Sticky Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
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

      {/* Floating Confirm Shipment Bar */}
      {!isQC && checkedRollIds.length > 0 && (
        <div className="sticky bottom-4 z-30 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm shadow-inner">
              {checkedRollIds.length}
            </div>
            <div>
              <div className="text-sm font-bold">Rolls Selected for Shipment</div>
              <div className="text-xs text-slate-300">Ready to assign customer and QC officer</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              onClick={() => setCheckedRollIds([])}
            >
              Clear Selection
            </button>
            <button
              className="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5"
              onClick={openShipmentModal}
            >
              <Truck size={14} />
              Confirm Shipment ({checkedRollIds.length})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
