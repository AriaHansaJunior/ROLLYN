import { useState, useRef } from 'react'
import { Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, X, Download, MapPin, Package } from 'lucide-react'
import { router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

interface RollItem {
  id: string
  raw_id: number
  no_roll: string
  form: string
  raw_form?: number
  shift: string
  shifts_id?: number
  date: string
  grade: string
  grades_id?: number
  gsm: number
  weight: number
  width: number
  location: string
  locations_id?: number
  jop: string
  jops_id?: number
  pic: string
  status: string
  exMaterial: string
  visual: string
}

interface OptionItem {
  id: number
  shift?: string
  grade?: string
  location?: string
  jop?: string
  status?: number
}

interface Props {
  rolls?: RollItem[]
  shifts?: OptionItem[]
  grades?: OptionItem[]
  locations?: OptionItem[]
  jops?: OptionItem[]
}

const statusColors: Record<string, { bg: string; color: string }> = {
  'Slotted': { bg: '#d0e8f5', color: '#286090' },
  'Shipment Plan': { bg: '#d4edda', color: '#3C763D' },
  'Hold': { bg: '#cce5ff', color: '#004085' },
  'Non-PO': { bg: '#fde8e8', color: '#C0392B' },
  'Incoming': { bg: '#fff3cd', color: '#8A6D3B' },
}

export default function RollInventory({
  rolls = [],
  shifts = [],
  grades = [],
  locations = [],
  jops = []
}: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortKey, setSortKey] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const [viewMode, setViewMode] = useState<'inventory' | 'shipments'>('inventory')
  const [checkedRollIds, setCheckedRollIds] = useState<string[]>([])
  const [removedShipmentIds, setRemovedShipmentIds] = useState<string[]>([])

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRoll, setEditingRoll] = useState<RollItem | null>(null)
  const [editForm, setEditForm] = useState({
    no_roll: '',
    form: '',
    shifts_id: 1,
    entry_date: '',
    grades_id: 1,
    weight: 0,
    locations_id: '',
    jops_id: '',
    exmaterial: 'IMPORT',
    visual: 'OK'
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Assign / Move Location Modal State
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [modalMode, setModalMode] = useState<'assign' | 'move'>('assign')
  const [assigningRoll, setAssigningRoll] = useState<RollItem | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedSlotCode, setSelectedSlotCode] = useState<string>('')
  const lastNotifyRef = useRef<number>(0)

  const statuses = ['All', 'Slotted', 'Shipment Plan', 'Incoming', 'Hold']

  function toggleRollChecked(id: string) {
    setCheckedRollIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
    setRemovedShipmentIds(prev => prev.filter(item => item !== id))
  }

  function handleRemoveFromShipments(id: string) {
    setCheckedRollIds(prev => prev.filter(item => item !== id))
    setRemovedShipmentIds(prev => (prev.includes(id) ? prev : [...prev, id]))

    const now = Date.now()
    if (now - lastNotifyRef.current > 3000) {
      lastNotifyRef.current = now
      SystemUI.toast({ message: 'Roll removed from shipments list.', type: 'info' })
    }
  }

  function handleConfirmShipments() {
    if (checkedRollIds.length === 0) {
      SystemUI.toast({ message: 'No rolls selected for shipment.', type: 'warning' })
      return
    }

    router.post('/rolls/ship', { roll_ids: checkedRollIds }, {
      onSuccess: () => {
        SystemUI.toast({ message: 'Shipments confirmed successfully!', type: 'success' })
        setCheckedRollIds([])
        setRemovedShipmentIds([])
      },
      onError: () => {
        SystemUI.toast({ message: 'Failed to process shipment.', type: 'error' })
      }
    })
  }

  // Build 12x4 slots for Warehouse E17
  const fullMapSlots = Array.from({ length: 12 }, (_, colIdx) =>
    Array.from({ length: 4 }, (_, tierIdx) => {
      const code = `E17-${String(colIdx + 1).padStart(2, '0')}-${tierIdx + 1}`
      const match = locations.find(l => (l.location || (l as any).code) === code)
      return {
        id: match ? match.id : (colIdx * 4 + tierIdx + 1),
        code,
        status: match ? (match.status ?? 0) : 0,
      }
    })
  ).flat()

  // Tier Stacking Constraint Check: Tier N can only be filled if Tier N-1 below is filled
  function isTierSelectable(col: number, tier: number): boolean {
    if (tier === 1) return true

    const slotBelowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
    const slotBelow = fullMapSlots.find(s => s.code === slotBelowCode)

    const isBelowFilled = slotBelow ? (slotBelow.status !== 0 || String(selectedLocationId) === String(slotBelow.id)) : false
    return isBelowFilled
  }

  // Calculate first valid recommended slot
  const recommendedSlot = fullMapSlots.find(s => {
    if (s.status !== 0) return false
    const parts = s.code.split('-')
    const col = parseInt(parts[1], 10)
    const tier = parseInt(parts[2], 10)
    return isTierSelectable(col, tier)
  })

  const filtered = rolls.filter(r => {
    if (viewMode === 'shipments') {
      const isRemoved = removedShipmentIds.includes(r.id) || removedShipmentIds.includes(String(r.raw_id))
      if (isRemoved) return false

      const isChecked = checkedRollIds.includes(r.id) || checkedRollIds.includes(String(r.raw_id))
      const matchShipment = isChecked
      const q = search.toLowerCase()
      const matchSearch = !q || r.id.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
      return matchShipment && matchSearch
    }

    const q = search.toLowerCase()
    const matchSearch = !q || r.id.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => {
    const key = sortKey as keyof RollItem
    const va = a[key] ?? ''
    const vb = b[key] ?? ''
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  function sort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ k }: { k: string }) {
    if (sortKey !== k) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  function handleExport() {
    SystemUI.toast({ message: 'Roll inventory exported successfully.', type: 'success' })
  }

  function openEdit(r: RollItem) {
    setEditingRoll(r)
    setEditForm({
      no_roll: r.no_roll || r.id,
      form: r.raw_form ? String(r.raw_form) : '',
      shifts_id: r.shifts_id || (shifts[0]?.id ?? 1),
      entry_date: r.date && r.date !== '—' ? r.date : new Date().toISOString().slice(0, 10),
      grades_id: r.grades_id || (grades[0]?.id ?? 1),
      weight: r.weight || 0,
      locations_id: r.locations_id ? String(r.locations_id) : '',
      jops_id: r.jops_id ? String(r.jops_id) : '',
      exmaterial: r.exMaterial || 'IMPORT',
      visual: r.visual || 'OK'
    })
    setEditErrors({})
    setShowEditModal(true)
  }

  function saveEdit() {
    if (!editingRoll) return

    router.put(`/rolls/${editingRoll.raw_id}`, editForm, {
      onSuccess: () => {
        SystemUI.toast({ message: `Roll ${editForm.no_roll} updated successfully.`, type: 'success' })
        setShowEditModal(false)
      },
      onError: (errs) => {
        setEditErrors(errs as any)
      }
    })
  }

  async function handleDelete(r: RollItem) {
    const confirmed = await SystemUI.confirm({
      title: 'Delete Roll',
      message: `Are you sure you want to delete roll "${r.id}"? This will free any allocated location slot and cannot be undone.`,
      confirmText: 'Delete Roll',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      router.delete(`/rolls/${r.raw_id}`, {
        onSuccess: () => {
          SystemUI.toast({ message: 'Roll deleted successfully', type: 'success' })
        }
      })
    }
  }

  function handleAssignClick(r: RollItem, mode: 'assign' | 'move' = 'assign') {
    const isSlotted = Boolean(r.locations_id) || (Boolean(r.location) && r.location !== 'No Slot' && r.location !== 'Unallocated' && r.location !== '—')

    if (mode === 'assign' && isSlotted) {
      const now = Date.now()
      if (now - lastNotifyRef.current < 5000) return
      lastNotifyRef.current = now
      SystemUI.toast({
        message: `Roll "${r.id}" already assigned to location ${r.location}! Click Map Pin to relocate.`,
        type: 'warning',
        duration: 4000
      })
      return
    }

    setModalMode(isSlotted ? 'move' : 'assign')
    setAssigningRoll(r)
    setSelectedLocationId('')
    setSelectedSlotCode('')
    setShowAssignModal(true)
  }

  function confirmAssignLocation() {
    if (!assigningRoll || !selectedLocationId) {
      SystemUI.toast({ message: 'Please click on a valid available slot in the warehouse map grid.', type: 'error' })
      return
    }

    const actionText = modalMode === 'move' ? 'moved' : 'assigned'

    router.put(`/rolls/${assigningRoll.raw_id}`, {
      locations_id: selectedLocationId
    }, {
      onSuccess: () => {
        SystemUI.toast({
          message: `Roll ${assigningRoll.id} successfully ${actionText} to slot ${selectedSlotCode}!`,
          type: 'success'
        })
        setShowAssignModal(false)
      },
      onError: () => {
        SystemUI.toast({ message: `Failed to ${modalMode} location slot.`, type: 'error' })
      }
    })
  }

  const cols: { key: string; label: string }[] = [
    { key: 'shift', label: 'SHIFT' },
    { key: 'date', label: 'ENTRY DATE' },
    { key: 'grade', label: 'GRADE' },
    { key: 'gsm', label: 'GSM' },
    { key: 'weight', label: 'WEIGHT (KG)' },
    { key: 'width', label: 'WIDTH (MM)' },
    { key: 'location', label: 'LOCATION' },
    { key: 'jop', label: 'JOP' },
    { key: 'pic', label: 'PIC' },
    { key: 'status', label: 'STATUS' },
  ]

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Roll Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive catalog of physical rolls across all warehouses</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Pill Toggle Switch: Storage ↔ Shipments */}
          <div className="relative flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 shadow-inner gap-0">
            {/* Animated background pill */}
            <span
              className="absolute top-1 bottom-1 rounded-full bg-blue-600 shadow transition-all duration-300 ease-in-out"
              style={{
                width: 'calc(50% - 4px)',
                left: viewMode === 'inventory' ? '4px' : 'calc(50%)',
              }}
            />
            <button
              className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                viewMode === 'inventory' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setViewMode('inventory'); setPage(1) }}
            >
              Storage
            </button>
            <button
              className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                viewMode === 'shipments' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setViewMode('shipments'); setPage(1) }}
            >
              Shipments
            </button>
          </div>
          <button className="btn btn-secondary btn-sm cursor-pointer" onClick={handleExport}>
            <Download size={13} /> <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search roll, grade, JOP, location..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
          />
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
                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="sm:col-span-2 mt-1 sm:mt-0">
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filtered.length} rolls</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1200px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[85px]" />  {/* SHIFT */}
            <col className="w-[105px]" /> {/* ENTRY DATE */}
            <col className="w-[140px]" /> {/* GRADE */}
            <col className="w-[70px]" />  {/* GSM */}
            <col className="w-[110px]" /> {/* WEIGHT (KG) */}
            <col className="w-[100px]" /> {/* WIDTH (MM) */}
            <col className="w-[110px]" /> {/* LOCATION */}
            <col className="w-[130px]" /> {/* JOP */}
            <col className="w-[95px]" />  {/* PIC */}
            <col className="w-[110px]" /> {/* STATUS */}
            <col className="w-[140px]" /> {/* ACTIONS */}
          </colgroup>
          <thead>
            <tr>
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
              <tr><td colSpan={cols.length + 1} className="text-center py-8 text-slate-400">{viewMode === 'shipments' ? 'No rolls selected for shipment.' : 'No rolls found in database.'}</td></tr>
            ) : paged.map(r => {
              const sc = statusColors[r.status] || { bg: '#EEEEEE', color: '#333' }
              const isSlotted = Boolean(r.locations_id) || (Boolean(r.location) && r.location !== 'No Slot' && r.location !== 'Unallocated' && r.location !== '—')

              const shiftNum = r.shift ? r.shift.replace(/Shift\s*/i, '') : '1'

              return (
                <tr key={r.raw_id || r.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                  <td style={{ textAlign: 'center' }}>
                    <span className="inline-flex flex-col items-center justify-center bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold leading-none">Shift</span>
                      <span className="font-bold text-slate-800 text-xs leading-tight">{shiftNum}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700">{r.date}</td>
                  <td style={{ textAlign: 'center' }}><span className="font-bold text-slate-800 text-xs">{r.grade}</span></td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700">{r.gsm}</td>
                  <td style={{ textAlign: 'center' }} className="text-xs text-slate-700 font-medium">{r.weight ? r.weight.toLocaleString('id-ID') : 0}</td>
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
                    <div className="flex w-full justify-center">
                      <span
                        className="badge inline-flex justify-center px-2.5 py-1 text-xs font-semibold whitespace-nowrap rounded-md"
                        style={viewMode === 'shipments' ? { backgroundColor: '#d0e8f5', color: '#286090' } : { backgroundColor: sc.bg, color: sc.color }}
                      >
                        {viewMode === 'shipments' ? 'Checked' : r.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }} className="whitespace-nowrap px-2 py-2">
                    <div className="flex gap-1.5 justify-center items-center">
                      {viewMode === 'inventory' && (
                        <>
                          <button
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            onClick={() => router.visit(`/roll-detail/${r.raw_id}`)}
                            title="View Roll Detail"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            onClick={() => openEdit(r)}
                            title="Edit Roll Data"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            onClick={() => handleAssignClick(r, isSlotted ? 'move' : 'assign')}
                            title={isSlotted ? `Move Roll Location (Current: ${r.location})` : 'Assign Location Slot'}
                          >
                            <MapPin size={14} />
                          </button>
                          <label className="inline-flex items-center justify-center p-1 cursor-pointer" title="Direct roll to shipments">
                            <input
                              type="checkbox"
                              checked={checkedRollIds.includes(r.id)}
                              onChange={() => toggleRollChecked(r.id)}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600 cursor-pointer"
                            />
                          </label>
                        </>
                      )}
                      <button
                        className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                        onClick={() => {
                          if (viewMode === 'shipments') {
                            handleRemoveFromShipments(r.id)
                          } else {
                            handleDelete(r)
                          }
                        }}
                        title={viewMode === 'shipments' ? 'Remove from Shipments' : 'Delete Roll'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
              {[5, 10, 20, 50].map(n => (
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

      {viewMode === 'shipments' && (
        <div className="flex justify-end pt-2">
          <button
            className="btn btn-primary btn-md bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm cursor-pointer transition-colors"
            onClick={handleConfirmShipments}
          >
            Confirm Shipments
          </button>
        </div>
      )}

      {/* Edit Roll Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-5 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Roll Data</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Roll Number <span className="text-red-500">*</span></label>
                <input
                  value={editForm.no_roll}
                  onChange={e => setEditForm(f => ({ ...f, no_roll: e.target.value }))}
                  className="form-input w-full"
                />
                {editErrors.no_roll && <p className="text-red-600 text-[11px] mt-0.5">{editErrors.no_roll}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Form Number</label>
                <input
                  type="number"
                  value={editForm.form}
                  onChange={e => setEditForm(f => ({ ...f, form: e.target.value }))}
                  className="form-input w-full"
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Shift</label>
                <select
                  value={editForm.shifts_id}
                  onChange={e => setEditForm(f => ({ ...f, shifts_id: Number(e.target.value) }))}
                  className="form-input w-full"
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>Shift {s.shift}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Entry Date</label>
                <input
                  type="date"
                  value={editForm.entry_date}
                  onChange={e => setEditForm(f => ({ ...f, entry_date: e.target.value }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Grade</label>
                <select
                  value={editForm.grades_id}
                  onChange={e => setEditForm(f => ({ ...f, grades_id: Number(e.target.value) }))}
                  className="form-input w-full"
                >
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={editForm.weight}
                  onChange={e => setEditForm(f => ({ ...f, weight: Number(e.target.value) }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Warehouse Location</label>
                <select
                  value={editForm.locations_id}
                  onChange={e => setEditForm(f => ({ ...f, locations_id: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="">Unallocated (No Slot)</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">JOP Order</label>
                <select
                  value={editForm.jops_id}
                  onChange={e => setEditForm(f => ({ ...f, jops_id: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="">No JOP Assigned</option>
                  {jops.map(j => (
                    <option key={j.id} value={j.id}>{j.jop}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Ex Material</label>
                <select
                  value={editForm.exmaterial}
                  onChange={e => setEditForm(f => ({ ...f, exmaterial: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="IMPORT">IMPORT</option>
                  <option value="LOCAL">LOCAL</option>
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Visual</label>
                <input
                  value={editForm.visual}
                  onChange={e => setEditForm(f => ({ ...f, visual: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary text-xs px-3 py-1.5" onClick={saveEdit}>
                Update Roll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Warehouse Map Slot Selection Modal */}
      {showAssignModal && assigningRoll && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="card w-full max-w-4xl p-4 sm:p-6 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    E17
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {modalMode === 'move' ? 'Move Roll Location (Relocate)' : 'Select Warehouse Location Slot'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {modalMode === 'move'
                        ? `Current Slot: ${assigningRoll.location} ➔ Select a new valid warehouse slot below`
                        : 'Warehouse E17 Grid Layout — Click an available slot card to assign'}
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* Roll Info Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 font-medium">Roll Number: </span>
                  <span className="font-bold text-blue-700 font-mono text-sm ml-1">{assigningRoll.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Grade: </span>
                  <span className="font-semibold text-slate-800 ml-1">{assigningRoll.grade} ({assigningRoll.gsm} g/m²)</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Weight: </span>
                  <span className="font-mono text-slate-800 ml-1">{assigningRoll.weight} kg</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Selected Slot: </span>
                  {selectedSlotCode ? (
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded text-xs">{selectedSlotCode}</span>
                  ) : (
                    <span className="italic text-slate-400">None Clicked</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Recommendation Slot: </span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                    {recommendedSlot?.code || 'E17-04-1 (Auto)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Warehouse Grid */}
            <div className="card overflow-x-auto p-3 sm:p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl">
              <div className="flex flex-col gap-2.5 min-w-[760px]">
                {/* Column Headers 01 - 12 */}
                <div className="grid grid-cols-12 gap-2 text-center text-[11px] font-bold text-slate-400">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(col => (
                    <div key={col}>{String(col).padStart(2, '0')}</div>
                  ))}
                </div>

                {/* Tier Rows 1 - 4 */}
                {[1, 2, 3, 4].map(tier => (
                  <div key={tier} className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, colIdx) => {
                      const col = colIdx + 1
                      const code = `E17-${String(col).padStart(2, '0')}-${tier}`
                      const slot = fullMapSlots.find(s => s.code === code) || { id: 0, code, status: 0 }
                      const isSelected = String(selectedLocationId) === String(slot.id)
                      const isOccupied = slot.status !== 0
                      const isSelectable = !isOccupied && isTierSelectable(col, tier)

                      return (
                        <button
                          key={code}
                          type="button"
                          disabled={!isSelectable}
                          onClick={() => {
                            if (!isSelectable && !isOccupied) {
                              const belowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
                              SystemUI.toast({
                                message: `Cannot select ${code}. Slot ${belowCode} underneath must be filled first!`,
                                type: 'warning',
                                duration: 3500
                              })
                              return
                            }
                            setSelectedLocationId(String(slot.id))
                            setSelectedSlotCode(code)
                          }}
                          className={`flex items-center justify-center py-2.5 px-0.5 min-h-[42px] rounded-xl text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap leading-none ${
                            isSelected
                              ? 'bg-blue-600 border-2 border-blue-700 text-white ring-2 ring-blue-500 ring-offset-1 scale-105 z-10 shadow-md font-extrabold cursor-pointer'
                              : isOccupied
                              ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                              : !isSelectable
                              ? 'bg-slate-100 border border-dashed border-slate-300 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-white border border-slate-300 text-slate-800 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 cursor-pointer shadow-xs'
                          }`}
                          title={!isSelectable && !isOccupied ? `Fill E17-${String(col).padStart(2, '0')}-${tier - 1} below first` : code}
                        >
                          <span className="whitespace-nowrap tracking-tighter">{code}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-white border border-slate-300" />
                  <span className="text-slate-600 text-[11px]">Free Space (Available)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-100 border border-dashed border-slate-300" />
                  <span className="text-slate-600 text-[11px]">Blocked (Fill Lower Tier First)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-300 border border-slate-400" />
                  <span className="text-slate-600 text-[11px]">Occupied / Slotted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-600 border border-blue-700" />
                  <span className="text-slate-600 text-[11px] font-bold">Selected Slot</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end">
                <button className="btn btn-secondary text-xs px-4 py-2 cursor-pointer" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary text-xs px-4 py-2 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedLocationId}
                  onClick={confirmAssignLocation}
                >
                  {modalMode === 'move' ? 'Confirm Move Slot' : 'Confirm Assign Slot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
