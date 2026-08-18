import { useState, useEffect } from 'react'
import { Search, Filter, Plus, X } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import axios from 'axios'

interface CustomerItem { id: number; customer: string }
interface GradeItem { id: number; grade: string }
interface GsmItem { id: number; gsm: number }

export default function Jop() {
  const { jopData = [] } = usePage<any>().props;
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [gradesList, setGradesList] = useState<GradeItem[]>([])
  const [gsmsList, setGsmsList] = useState<GsmItem[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    spk: '',
    jop: '',
    po: '',
    customers_id: '',
    grades_id: '',
    gsms_id: '',
  })

  const processedJop = jopData.map((r: any) => {
    const target = r.quantity || 1
    const completed = r.rolls ? r.rolls.length : 0
    const progress = Math.round((completed / target) * 100)

    const status = progress >= 100 ? 'Complete' : progress > 0 ? 'In Progress' : 'Pending'
    const colorClass = progress >= 100 ? 'bg-green-500 text-green-700' : progress >= 60 ? 'bg-blue-600 text-blue-700' : 'bg-amber-500 text-amber-700'
    const barBg = progress >= 100 ? 'bg-green-500' : progress >= 60 ? 'bg-blue-600' : 'bg-amber-500'

    return {
      id: r.id,
      jop: r.jop || '-',
      spk: r.spk || '-',
      po: r.po || '-',
      customer: r.customer?.customer || '-',
      grade: r.grade?.grade || '-',
      gsm: r.gsm?.gsm || '-',
      target: target,
      rolls: completed,
      progress,
      status,
      colorClass,
      barBg
    }
  })

  const filtered = processedJop.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.jop.toLowerCase().includes(q) ||
      r.spk.toLowerCase().includes(q) ||
      r.po.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q) ||
      r.grade.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  function openAddModal() {
    setForm({ spk: '', jop: '', po: '', customers_id: '', grades_id: '', gsms_id: '' })
    setFormErrors({})

    // Fetch dropdown data from existing API endpoints
    axios.get('/api/v1/customers').then(res => {
      const data = res.data?.data?.data || res.data?.data || res.data || []
      setCustomers(Array.isArray(data) ? data : [])
    }).catch(() => {})
    axios.get('/api/v1/grades').then(res => {
      const data = res.data?.data?.data || res.data?.data || res.data || []
      setGradesList(Array.isArray(data) ? data : [])
    }).catch(() => {})
    axios.get('/api/v1/gsms').then(res => {
      const data = res.data?.data?.data || res.data?.data || res.data || []
      setGsmsList(Array.isArray(data) ? data : [])
    }).catch(() => {})

    setShowModal(true)
  }

  function handleSave() {
    const errs: Record<string, string> = {}
    if (!form.spk.trim()) errs.spk = 'SPK is required.'
    if (!form.jop.trim()) errs.jop = 'JOP number is required.'
    if (!form.po.trim()) errs.po = 'PO is required.'
    if (!form.customers_id) errs.customers_id = 'Customer is required.'
    if (!form.grades_id) errs.grades_id = 'Grade is required.'
    if (!form.gsms_id) errs.gsms_id = 'GSM is required.'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    axios.post('/api/v1/jops', {
      spk: form.spk,
      jop: form.jop,
      po: form.po,
      customers_id: Number(form.customers_id),
      grades_id: Number(form.grades_id),
      gsms_id: Number(form.gsms_id),
    }).then(() => {
      SystemUI.toast({ message: 'JOP created successfully.', type: 'success' })
      setShowModal(false)
      // Reload page to reflect new data
      window.location.reload()
    }).catch((err) => {
      if (err.response?.status === 422) {
        const apiErrors = err.response.data?.errors || err.response.data?.data || {}
        const mapped: Record<string, string> = {}
        Object.entries(apiErrors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? (v as string[]).join(', ') : String(v)
        })
        setFormErrors(mapped)
      } else {
        SystemUI.toast({ message: 'Failed to create JOP.', type: 'error' })
      }
    })
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Job Order Production (JOP)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manufacturing execution tracking and completion status by production order</p>
        </div>
        <button className="btn btn-primary text-xs py-1.5 px-3 sm:text-[13px] sm:py-[7px] sm:px-[14px] shrink-0 cursor-pointer" onClick={openAddModal}>
          <Plus size={13} className="sm:w-3.5 sm:h-3.5" /> <span>Add JOP</span>
        </button>
      </div>

      <div className="card p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search JOP, SPK, PO, customer, grade..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 justify-between w-full sm:w-auto sm:justify-end">
          <div className="flex items-center gap-1.5 min-w-0">
            <Filter size={13} className="text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-input text-xs py-1.5 min-w-[130px] w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Complete">Complete</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="sm:col-span-2 mt-1 sm:mt-0">
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filtered.length} records</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1250px] lg:min-w-[1080px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[180px] lg:w-[160px]" />
            <col className="w-[110px] lg:w-[100px]" />
            <col className="w-[80px] lg:w-[70px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[160px] lg:w-[150px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>SPK</th>
              <th style={{ textAlign: 'center' }}>PO</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>GSM</th>
              <th style={{ textAlign: 'center' }}>Target Rolls</th>
              <th style={{ textAlign: 'center' }}>Completed</th>
              <th style={{ textAlign: 'center' }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((r: any) => (
              <tr key={r.id || r.jop} className="hover:bg-slate-50 transition-colors">
                <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.jop}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.spk}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.po}</td>
                <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>{r.customer}</td>
                <td style={{ textAlign: 'center' }}>{r.grade}</td>
                <td style={{ textAlign: 'center' }}>{r.gsm}</td>
                <td className="font-semibold" style={{ textAlign: 'center' }}>{r.target}</td>
                <td className="font-bold text-slate-900" style={{ textAlign: 'center' }}>{r.rolls}</td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-full max-w-[90px] h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.barBg}`} style={{ width: `${Math.min(r.progress, 100)}%` }} />
                    </div>
                    <span className={`text-[11px] font-bold w-9 text-right ${r.colorClass.split(' ')[1]}`}>{r.progress}%</span>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No JOP records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add JOP Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-5 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Job Order Production</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">SPK <span className="text-red-500">*</span></label>
                <input
                  value={form.spk}
                  onChange={e => { setForm(f => ({ ...f, spk: e.target.value })); if (formErrors.spk) setFormErrors(err => ({ ...err, spk: '' })) }}
                  className={`form-input w-full ${formErrors.spk ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="e.g. 0726-00001-1"
                />
                {formErrors.spk && <p className="text-red-600 text-[11px] mt-1">{formErrors.spk}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">JOP Number <span className="text-red-500">*</span></label>
                <input
                  value={form.jop}
                  onChange={e => { setForm(f => ({ ...f, jop: e.target.value })); if (formErrors.jop) setFormErrors(err => ({ ...err, jop: '' })) }}
                  className={`form-input w-full ${formErrors.jop ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="e.g. JOP-0726-00001"
                />
                {formErrors.jop && <p className="text-red-600 text-[11px] mt-1">{formErrors.jop}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">PO <span className="text-red-500">*</span></label>
                <input
                  value={form.po}
                  onChange={e => { setForm(f => ({ ...f, po: e.target.value })); if (formErrors.po) setFormErrors(err => ({ ...err, po: '' })) }}
                  className={`form-input w-full ${formErrors.po ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="e.g. FCL-Jul-1"
                />
                {formErrors.po && <p className="text-red-600 text-[11px] mt-1">{formErrors.po}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Customer <span className="text-red-500">*</span></label>
                <select
                  value={form.customers_id}
                  onChange={e => { setForm(f => ({ ...f, customers_id: e.target.value })); if (formErrors.customers_id) setFormErrors(err => ({ ...err, customers_id: '' })) }}
                  className={`form-input w-full ${formErrors.customers_id ? 'border-red-500 focus:ring-red-200' : ''}`}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.customer}</option>
                  ))}
                </select>
                {formErrors.customers_id && <p className="text-red-600 text-[11px] mt-1">{formErrors.customers_id}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Grade <span className="text-red-500">*</span></label>
                <select
                  value={form.grades_id}
                  onChange={e => { setForm(f => ({ ...f, grades_id: e.target.value })); if (formErrors.grades_id) setFormErrors(err => ({ ...err, grades_id: '' })) }}
                  className={`form-input w-full ${formErrors.grades_id ? 'border-red-500 focus:ring-red-200' : ''}`}
                >
                  <option value="">Select Grade</option>
                  {gradesList.map(g => (
                    <option key={g.id} value={g.id}>{g.grade}</option>
                  ))}
                </select>
                {formErrors.grades_id && <p className="text-red-600 text-[11px] mt-1">{formErrors.grades_id}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">GSM <span className="text-red-500">*</span></label>
                <select
                  value={form.gsms_id}
                  onChange={e => { setForm(f => ({ ...f, gsms_id: e.target.value })); if (formErrors.gsms_id) setFormErrors(err => ({ ...err, gsms_id: '' })) }}
                  className={`form-input w-full ${formErrors.gsms_id ? 'border-red-500 focus:ring-red-200' : ''}`}
                >
                  <option value="">Select GSM</option>
                  {gsmsList.map(g => (
                    <option key={g.id} value={g.id}>{g.gsm} g/m²</option>
                  ))}
                </select>
                {formErrors.gsms_id && <p className="text-red-600 text-[11px] mt-1">{formErrors.gsms_id}</p>}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary text-xs px-3 py-1.5" onClick={handleSave}>
                Save JOP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
