import { useState } from 'react'
import { Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, X, Download } from 'lucide-react'
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

const PER_PAGE = 8

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

  const statuses = ['All', 'Slotted', 'Shipment Plan', 'Incoming', 'Hold']

  const filtered = rolls.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.id.toLowerCase().includes(q) || r.grade.toLowerCase().includes(q) || r.jop.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey]
    const vb = (b as Record<string, unknown>)[sortKey]
    if (va === undefined || vb === undefined) return 0
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

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

  const cols: { key: string; label: string }[] = [
    { key: 'id', label: 'Roll No.' },
    { key: 'form', label: 'Form No.' },
    { key: 'shift', label: 'Shift' },
    { key: 'date', label: 'Entry Date' },
    { key: 'grade', label: 'Grade' },
    { key: 'gsm', label: 'GSM' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'width', label: 'Width (mm)' },
    { key: 'location', label: 'Location' },
    { key: 'jop', label: 'JOP' },
    { key: 'pic', label: 'PIC' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Roll Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive catalog of physical rolls across all warehouses</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm cursor-pointer" onClick={handleExport}>
            <Download size={13} /> <span>Export</span>
          </button>
        </div>
      </div>

      {}
      <div className="card p-3 sm:p-4 grid grid-cols-1 min-[760px]:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full min-[760px]:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search roll, grade, JOP, location..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 justify-between w-full min-[760px]:w-auto min-[760px]:justify-end">
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
        <div className="min-[760px]:col-span-2 mt-1 min-[760px]:mt-0">
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filtered.length} rolls</span>
        </div>
      </div>

      {}
      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1300px] lg:min-w-[1060px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[130px] lg:w-[100px]" />
            <col className="w-[100px] lg:w-[75px]" />
            <col className="w-[80px] lg:w-[55px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[110px] lg:w-[90px]" />
            <col className="w-[80px] lg:w-[50px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[100px] lg:w-[85px]" />
            <col className="w-[100px] lg:w-[85px]" />
            <col className="w-[120px] lg:w-[95px]" />
            <col className="w-[110px] lg:w-[85px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[110px] lg:w-[95px]" />
          </colgroup>
          <thead>
            <tr>
              {cols.map(col => {
                const isCenter = col.key !== 'id';
                return (
                  <th
                    key={col.key}
                    onClick={() => sort(col.key)}
                    className="cursor-pointer select-none"
                    style={{ textAlign: isCenter ? 'center' : 'left' }}
                  >
                    {col.label}
                    <span className="inline-block align-middle ml-1"><SortIcon k={col.key} /></span>
                  </th>
                );
              })}
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="text-center py-8 text-slate-400">No rolls found in database.</td></tr>
            ) : paged.map(r => {
              const sc = statusColors[r.status] || { bg: '#EEEEEE', color: '#333' }
              return (
                <tr key={r.raw_id || r.id}>
                  <td style={{ textAlign: 'left' }}><span className="font-bold text-blue-700 font-mono text-xs">{r.id}</span></td>
                  <td style={{ textAlign: 'center' }} className="font-mono text-xs">{r.form}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge bg-slate-100 text-slate-700 border-slate-200">{r.shift}</span></td>
                  <td style={{ textAlign: 'center' }} className="text-xs">{r.date}</td>
                  <td style={{ textAlign: 'center' }}><span className="font-semibold text-slate-800">{r.grade}</span></td>
                  <td style={{ textAlign: 'center' }}>{r.gsm}</td>
                  <td style={{ textAlign: 'center' }} className="font-mono text-xs">{r.weight ? r.weight.toLocaleString() : 0}</td>
                  <td style={{ textAlign: 'center' }}>{r.width}</td>
                  <td style={{ textAlign: 'center' }} className="font-mono text-xs">{r.location || <span className="text-red-600">No Slot</span>}</td>
                  <td style={{ textAlign: 'center' }} className="text-xs">{r.jop}</td>
                  <td style={{ textAlign: 'center' }} className="text-xs">{r.pic}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      <span className="badge inline-flex min-w-[88px] justify-center" style={{ backgroundColor: sc.bg, color: sc.color }}>{r.status}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex gap-1 justify-center">
                      <button className="btn btn-secondary btn-sm p-1.5 cursor-pointer" onClick={() => router.visit(`/roll-detail/${r.raw_id}`)} title="View Roll Detail">
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-secondary btn-sm p-1.5 cursor-pointer text-blue-600 hover:text-blue-800" onClick={() => openEdit(r)} title="Edit Roll">
                        <Edit size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm p-1.5 cursor-pointer" onClick={() => handleDelete(r)} title="Delete Roll">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
        <span className="text-xs text-slate-500">
          Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-1">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'} min-w-[30px] justify-center`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {}
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
    </div>
  )
}
