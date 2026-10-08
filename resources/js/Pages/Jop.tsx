import { useState } from 'react'
import { Search, Filter, Plus, X, Eye, Printer, FileSpreadsheet } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import axios from 'axios'
import { router } from '@inertiajs/react'

import {
  CustomerItem, GradeItem, GsmItem, PlybondItem, ThicknessItem, CoreItem
} from '@/Components/Jop/Jop_types'
import Jop_CreateModal from '@/Components/Jop/Jop_CreateModal'
import Jop_DetailModal from '@/Components/Jop/Jop_DetailModal'
import Jop_RollPopupModal from '@/Components/Jop/Jop_RollPopupModal'

export default function Jop() {
  const { jopData = [], auth } = usePage<any>().props;
  const currentUserName = auth?.user?.name || auth?.user?.username || '';
  const currentUserRole = (auth?.user?.role || '').toLowerCase();
  const isProduksi = currentUserRole === 'production';
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [gradesList, setGradesList] = useState<GradeItem[]>([])
  const [gsmsList, setGsmsList] = useState<GsmItem[]>([])
  const [plybondsList, setPlybondsList] = useState<PlybondItem[]>([])
  const [thicknessesList, setThicknessesList] = useState<ThicknessItem[]>([])
  const [coresList, setCoresList] = useState<CoreItem[]>([])
  const [rollsWidthsList, setRollsWidthsList] = useState<any[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [selectedJopDetail, setSelectedJopDetail] = useState<any>(null)
  const [selectedRWFilter, setSelectedRWFilter] = useState<string>('')
  const [selectedRollPopup, setSelectedRollPopup] = useState<any>(null)

  const [form, setForm] = useState({
    spk: '',
    jop: '',
    po: '',
    customers_id: '',
    grades_id: '',
    gsms_id: '',
    plybonds_id: '',
    thicknesses_id: '',
    cores_id: '',
    quantity: '1',
    tph: '',
    noted_order: '',
    rw_targets: [{ id: Date.now(), width: '', quantity: '1' }],
  })

  // Custom manual input states
  const [customCustomer, setCustomCustomer] = useState('')
  const [customGrade, setCustomGrade] = useState('')
  const [customGsm, setCustomGsm] = useState('')
  const [customPlybond, setCustomPlybond] = useState('')
  const [customThickness, setCustomThickness] = useState('')
  const [customCore, setCustomCore] = useState('')

  const processedJop = jopData.map((r: any) => {
    const est = r.production_estimation || {};
    const target = r.quantity || 1
    const completed = r.rolls ? r.rolls.length : 0
    const progress = Math.round((completed / target) * 100)
    const sisa = Math.max(0, target - completed)

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
      plybond: r.plybond?.plybonds ?? '-',
      thickness: r.thickness?.thickness ?? '-',
      core: r.core?.core ?? '-',
      target: target,
      rolls: completed,
      sisa: sisa,
      rollsList: r.rolls || [],
      progress,
      status,
      colorClass,
      barBg,
      est,
      noted_order: r.noted_order || '',
      rwTargets: r.rw_targets || [],
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

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)


  function openAddModal() {
    setForm({
      spk: '',
      jop: '',
      po: '',
      customers_id: '',
      grades_id: '',
      gsms_id: '',
      plybonds_id: '',
      thicknesses_id: '',
      cores_id: '',
      quantity: '1',
      tph: '',
      noted_order: '',
      rw_targets: [{ id: Date.now(), width: '', quantity: '1' }]
    })
    setCustomCustomer('')
    setCustomGrade('')
    setCustomGsm('')
    setCustomPlybond('')
    setCustomThickness('')
    setCustomCore('')
    setFormErrors({})

    axios.get('/jop-master-data').then(res => {
      if (res.data?.customers) setCustomers(res.data.customers)
      if (res.data?.grades) setGradesList(res.data.grades)
      if (res.data?.gsms) setGsmsList(res.data.gsms)
      if (res.data?.plybonds) setPlybondsList(res.data.plybonds)
      if (res.data?.thicknesses) setThicknessesList(res.data.thicknesses)
      if (res.data?.cores) setCoresList(res.data.cores)
      if (res.data?.rolls_widths) setRollsWidthsList(res.data.rolls_widths)
    }).catch(() => {
      axios.get('/api/v1/customers').then(res => setCustomers(res.data?.data || [])).catch(() => { })
      axios.get('/api/v1/grades').then(res => setGradesList(res.data?.data || [])).catch(() => { })
      axios.get('/api/v1/gsms').then(res => setGsmsList(res.data?.data || [])).catch(() => { })
      axios.get('/api/v1/plybonds').then(res => setPlybondsList(res.data?.data || [])).catch(() => { })
      axios.get('/api/v1/thicknesses').then(res => setThicknessesList(res.data?.data || [])).catch(() => { })
      axios.get('/api/v1/cores').then(res => setCoresList(res.data?.data || [])).catch(() => { })
      axios.get('/api/v1/rolls-widths').then(res => setRollsWidthsList(res.data?.data || [])).catch(() => { })
    })

    setShowModal(true)
  }

  function handleUpdateTph(jopId: number, newTph: string) {
    setSelectedJopDetail((prev: any) => {
      if (!prev || prev.id !== jopId) return prev;
      return {
        ...prev,
        est: {
          ...prev.est,
          tph: newTph,
        },
      };
    });
  }

  function handleSave() {
    const errs: Record<string, string> = {}
    if (!form.spk.trim()) errs.spk = 'SPK is required.'
    if (!form.jop.trim()) errs.jop = 'JOP number is required.'
    if (!form.po.trim()) errs.po = 'PO is required.'

    if (!form.customers_id) {
      errs.customers_id = 'Customer is required.'
    } else if (form.customers_id === 'NEW_CUSTOM' && !customCustomer.trim()) {
      errs.customers_id = 'Please enter new customer name.'
    }

    if (!form.grades_id) {
      errs.grades_id = 'Grade is required.'
    } else if (form.grades_id === 'NEW_CUSTOM' && !customGrade.trim()) {
      errs.grades_id = 'Please enter new grade name.'
    }

    if (!form.gsms_id) {
      errs.gsms_id = 'GSM is required.'
    } else if (form.gsms_id === 'NEW_CUSTOM' && !customGsm.trim()) {
      errs.gsms_id = 'Please enter new GSM value.'
    }

    let totalQty = 0;
    form.rw_targets.forEach((tgt, idx) => {
      if (!tgt.width) {
        errs[`rw_targets_${idx}`] = 'RW is required.'
      }
      if (!tgt.quantity || Number(tgt.quantity) < 1) {
        errs[`rw_targets_${idx}_qty`] = 'Min 1.'
      }
      totalQty += Number(tgt.quantity) || 0;
    });

    if (totalQty < 1) {
      errs.quantity = 'Total target rolls must be at least 1.'
    }

    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: any = {
      spk: form.spk,
      jop: form.jop,
      po: form.po,
      quantity: totalQty || 1,
      tph: form.tph ? Number(form.tph) : null,
      noted_order: form.noted_order,
      rw_targets: form.rw_targets,
    }

    if (form.customers_id === 'NEW_CUSTOM') {
      payload.custom_customer = customCustomer.trim()
    } else {
      payload.customers_id = Number(form.customers_id)
    }

    if (form.grades_id === 'NEW_CUSTOM') {
      payload.custom_grade = customGrade.trim()
    } else {
      payload.grades_id = Number(form.grades_id)
    }

    if (form.gsms_id === 'NEW_CUSTOM') {
      payload.custom_gsm = customGsm.trim()
    } else {
      payload.gsms_id = Number(form.gsms_id)
    }

    if (form.plybonds_id === 'NEW_CUSTOM') {
      if (customPlybond.trim()) payload.custom_plybond = customPlybond.trim()
    } else if (form.plybonds_id) {
      payload.plybonds_id = Number(form.plybonds_id)
    }

    if (form.thicknesses_id === 'NEW_CUSTOM') {
      if (customThickness.trim()) payload.custom_thickness = customThickness.trim()
    } else if (form.thicknesses_id) {
      payload.thicknesses_id = Number(form.thicknesses_id)
    }

    if (form.cores_id === 'NEW_CUSTOM') {
      if (customCore.trim()) payload.custom_core = customCore.trim()
    } else if (form.cores_id) {
      payload.cores_id = Number(form.cores_id)
    }

    axios.post('/jop', payload).then(() => {
      SystemUI.toast({ message: 'JOP created successfully.', type: 'success' })
      setShowModal(false)
      router.reload() // Use Inertia reload instead of full browser reload
    }).catch((err) => {
      if (err.response?.status === 422) {
        const apiErrors = err.response.data?.errors || err.response.data?.data || {}
        const mapped: Record<string, string> = {}
        Object.entries(apiErrors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? (v as string[]).join(', ') : String(v)
        })
        setFormErrors(mapped)
      } else {
        const msg = err.response?.data?.message || 'Failed to create JOP.'
        SystemUI.toast({ message: msg, type: 'error' })
      }
    })
  }

  function printSerahTerima(jop: any) {
    const allRolls: any[] = jop.rollsList || []

    // Strip "JOP-" prefix — show only numbers/separators
    const jobOrderNo = jop.jop ? jop.jop.replace(/^JOP-/i, '') : '-'

    // ── Group rolls by form number ─────────────────────────────────────────
    const groupMap: Map<string, any[]> = new Map()
    for (const r of allRolls) {
      const key = r.form != null ? String(r.form) : '__none__'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(r)
    }
    if (groupMap.size === 0) groupMap.set('__none__', [])

    // ── Build pages: each form group → split into chunks of 16 ────────────
    // Page counter is LOCAL to each form number (1 OF N per form, not global)
    const ROWS_PER_PAGE = 16
    const pages: any[] = []

    for (const [formKey, groupRolls] of groupMap.entries()) {
      const formNumber = formKey === '__none__' ? '-' : formKey

      // Specs from the first roll of this form group
      const spec = groupRolls[0]
      const gsm = spec?.gsm?.gsm ?? spec?.gsm ?? '-'
      const ib = spec?.plybond?.plybonds ?? spec?.plybond ?? '-'  // IB = plybond
      const rw = spec?.rolls_width?.width ?? spec?.rollsWidth?.width ?? '-' // RW = roll width
      const coreSize = spec?.core?.core ?? '-'
      const thickness = spec?.thickness?.thickness ?? '-'
      const grade = spec?.grade?.grade ?? jop.grade ?? '-'
      const shift = spec?.shift?.shift ?? '-'
      const productionDate = spec?.entry_date ?? '-'

      // Split rolls into chunks of ROWS_PER_PAGE
      const chunks: any[][] = []
      for (let i = 0; i < groupRolls.length; i += ROWS_PER_PAGE) {
        chunks.push(groupRolls.slice(i, i + ROWS_PER_PAGE))
      }
      if (chunks.length === 0) chunks.push([]) // always at least 1 page

      const totalPagesForForm = chunks.length  // ← "OF N" is per form number

      chunks.forEach((chunk, chunkIdx) => {
        const pageNum = chunkIdx + 1           // ← "X OF" is per form number
        const chunkWeight = chunk.reduce((s: number, r: any) => s + (parseFloat(r.weight) || 0), 0)

        // Build row HTML for this chunk (pad to ROWS_PER_PAGE with empty rows, all rows numbered)
        const rows = Array.from({ length: ROWS_PER_PAGE }, (_, i) => {
          const r = chunk[i]
          const globalRowNum = chunkIdx * ROWS_PER_PAGE + i + 1
          return r
            ? `<tr>
                <td style="text-align:center">${globalRowNum}</td>
                <td>${r.no_roll || ('R-' + r.no) || '&nbsp;'}</td>
                <td style="text-align:center">${r.exmaterial || r.ex_material || '&nbsp;'}</td>
                <td style="text-align:center">${r.grade?.grade ?? grade ?? '&nbsp;'}</td>
                <td style="text-align:center;font-weight:600">${parseFloat(r.weight || 0).toFixed(0)}</td>
               </tr>`
            : `<tr>
                <td style="text-align:center">${globalRowNum}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
               </tr>`
        }).join('')

        pages.push({ formNumber, gsm, ib, rw, coreSize, thickness, grade, shift, productionDate, chunkWeight, chunk, rows, pageNum, totalPagesForForm })
      })
    }

    const pageBlocks = pages.map(p =>
      `<div class="page">
  <div class="header-box">
    <div class="header-logo"><div class="logo-circle">R</div></div>
    <div class="header-main">
      <div class="company">PT. INDONESIA ROYAL PAPER</div>
      <div style="font-size:8px;color:#555;margin-top:1px">FORM SERAH TERIMA ROLL FINISHGOODS</div>
    </div>
    <div class="header-meta">
      <table>
        <tr><td>Form</td><td>WP-PMR-PN-013</td></tr>
        <tr><td>Rev</td><td>0</td></tr>
        <tr><td>Issue Date</td><td>02.01.2025</td></tr>
        <tr><td>Page</td><td>${p.pageNum} OF ${p.totalPagesForForm}</td></tr>
      </table>
    </div>
  </div>
  <div style="font-size:9px; margin-bottom:5px;">
    <div class="info-row" style="margin-bottom:2px"><span class="info-label">Form</span><span>:</span><span style="margin-left:6px">${p.formNumber}</span></div>
    <div class="info-row" style="margin-bottom:2px"><span class="info-label">Job Order No.</span><span>:</span><span style="margin-left:6px;font-weight:700">${jobOrderNo}</span></div>
    <div class="info-row"><span class="info-label">Job Order Date</span><span>:</span><span style="margin-left:6px"></span></div>
  </div>
  <div class="section-title">PT. INDONESIA ROYAL PAPER</div>
  <div class="section-sub">DELIVERY REPORT FINISHED GOODS TO WAREHOUSE</div>
  <div class="info-grid">
    <div>
      <div class="info-row"><span class="info-label">Production Date</span><span>:</span><span class="info-value" style="margin-left:6px">${p.productionDate}</span></div>
      <div class="info-row"><span class="info-label">Delivery Date</span><span>:</span><span class="info-value" style="margin-left:6px"></span></div>
      <div class="info-row"><span class="info-label">Grade Product</span><span>:</span><span class="info-value" style="margin-left:6px;font-weight:700">${p.grade}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="info-label">Product Detail</span></div>
      <div class="product-detail">
        <table>
          <thead><tr><th>GSM</th><th>IB</th><th>RW</th><th>Core Size</th><th>Thickness</th></tr></thead>
          <tbody><tr><td>${p.gsm}</td><td>${p.ib}</td><td>${p.rw}</td><td>${p.coreSize}</td><td>${p.thickness}</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
  <div class="shift-row"><span style="width:100px;font-weight:600">Shift</span><span>:</span><span style="margin-left:6px">${p.shift}</span></div>
  <table class="main-table">
    <thead>
      <tr>
        <th style="width:28px">No</th>
        <th style="width:140px;text-align:left">No. Roll</th>
        <th style="width:90px">Ex. Material</th>
        <th>Grade</th>
        <th style="width:80px">Weight (kg)</th>
      </tr>
    </thead>
    <tbody>${p.rows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right;font-weight:700">TOTAL</td>
        <td style="text-align:center">Roll<br/><span style="font-size:8px">Weight (kg)</span></td>
        <td style="text-align:center;font-weight:700">${p.chunk.length}<br/>${p.chunkWeight.toFixed(0)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="sig-section">
    <div class="sig-block"><div class="sig-title">Prepared by:</div><div class="sig-name">(Rewinder)</div></div>
    <div class="sig-block"><div class="sig-title">Submitted by:</div><div class="sig-name">${currentUserRole === 'production' ? (currentUserName || 'Production') : '(Production)'}</div></div>
    <div class="sig-block"><div class="sig-title">Controlled by:</div><div class="sig-name">(QA)</div></div>
    <div class="sig-block"><div class="sig-title">Received by:</div><div class="sig-name">${currentUserRole === 'ppic' || currentUserRole === 'admin' ? `${currentUserName || 'PPIC'} (PPIC)` : '(Warehouse / PPIC)'}</div></div>
  </div>
</div>`
    )

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>Form Serah Terima — ${jop.jop}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background:#fff; }
  .page { width: 210mm; min-height: 297mm; padding: 14mm 14mm 10mm; margin: 0 auto; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  .header-box { display: flex; justify-content: space-between; align-items: stretch; border: 1px solid #000; margin-bottom: 4px; }
  .header-logo { width: 18%; padding: 6px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; }
  .logo-circle { width: 38px; height: 38px; border-radius: 50%; background: #1d4ed8; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 18px; }
  .header-main { flex: 1; padding: 5px 10px; text-align: center; border-right: 1px solid #000; }
  .header-main .company { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; }
  .header-meta { width: 160px; font-size: 8.5px; }
  .header-meta table { width: 100%; border-collapse: collapse; }
  .header-meta td { padding: 2px 4px; border-bottom: 1px solid #ddd; }
  .header-meta td:first-child { font-weight: 600; width: 70px; }
  .section-title { text-align: center; font-weight: 900; font-size: 11px; margin: 6px 0 2px; text-transform: uppercase; }
  .section-sub { text-align: center; font-size: 9px; margin-bottom: 8px; font-weight: 600; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; margin-bottom: 6px; }
  .info-row { display: flex; gap: 4px; margin-bottom: 3px; font-size: 9.5px; }
  .info-label { width: 100px; font-weight: 600; flex-shrink: 0; }
  .info-value { flex: 1; border-bottom: 1px solid #000; padding-bottom: 1px; }
  .product-detail { margin-bottom: 6px; }
  .product-detail table { border-collapse: collapse; width: 280px; }
  .product-detail th, .product-detail td { border: 1px solid #000; padding: 2px 5px; text-align: center; font-size: 9px; }
  .product-detail th { background: #f0f0f0; font-weight: 700; }
  .shift-row { display: flex; gap: 4px; font-size: 9.5px; margin-bottom: 8px; }
  .main-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed; }
  .main-table th, .main-table td { border: 1px solid #000; padding: 2px 5px; font-size: 9px; box-sizing: border-box; }
  .main-table th { background: #e8e8e8; font-weight: 700; text-align: center; height: 22px; }
  .main-table tbody tr { height: 22px; }
  .main-table tbody td { height: 22px; vertical-align: middle; }
  .total-row td { font-weight: 700; background: #f5f5f5; height: 26px; vertical-align: middle; }
  .sig-section { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; margin-top: 16px; }
  .sig-block { text-align: center; border: 1px solid #000; padding: 6px 4px; }
  .sig-block .sig-title { font-weight: 700; font-size: 9px; margin-bottom: 28px; }
  .sig-block .sig-name { font-size: 8.5px; border-top: 1px solid #000; padding-top: 3px; margin-top: 4px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>
${pageBlocks.join('\n')}
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }


  const uniqueRWs = selectedJopDetail?.rollsList 
    ? Array.from(new Set(selectedJopDetail.rollsList.map((r: any) => String(r.rolls_width?.width || r.rollsWidth?.width)).filter((w: string) => w && w !== 'undefined')))
    : [];

  const filteredRolls = selectedJopDetail?.rollsList
    ? selectedJopDetail.rollsList.filter((r: any) => String(r.rolls_width?.width || r.rollsWidth?.width) === selectedRWFilter)
    : [];

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Job Order Production (JOP)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manufacturing execution tracking and completion status by production order</p>
        </div>
        <div className="flex items-center gap-2">
          {!isProduksi && (
            <>
              <a
                href="/jop/export-excel"
                className="btn btn-secondary text-xs py-1.5 px-3 sm:text-[13px] sm:py-[7px] sm:px-[14px] shrink-0 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 font-semibold cursor-pointer transition-colors shadow-xs"
                title="Export entire JOP database to Excel"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <span>Export Excel</span>
              </a>
              <button className="btn btn-primary text-xs py-1.5 px-3 sm:text-[13px] sm:py-[7px] sm:px-[14px] shrink-0 cursor-pointer" onClick={openAddModal}>
                <Plus size={13} className="sm:w-3.5 sm:h-3.5" /> <span>Add JOP</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search JOP, SPK, PO, customer, grade..."
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
            <col className="w-[160px] lg:w-[140px]" />
            <col className="w-[90px] lg:w-[80px]" />
            <col className="w-[70px] lg:w-[60px]" />
            <col className="w-[85px] lg:w-[80px]" />
            <col className="w-[85px] lg:w-[80px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[140px] lg:w-[130px]" />
            <col className="w-[90px] lg:w-[80px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>JOP</th>
              <th style={{ textAlign: 'center' }}>SPK</th>
              <th style={{ textAlign: 'center' }}>PO</th>
              <th style={{ textAlign: 'center' }}>Customer</th>
              <th style={{ textAlign: 'center' }}>Grade</th>
              <th style={{ textAlign: 'center' }}>GSM</th>
              <th style={{ textAlign: 'center' }}>Target</th>
              <th style={{ textAlign: 'center' }}>Actual</th>
              <th style={{ textAlign: 'center' }}>Progress</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((r: any) => (
              <tr key={r.id || r.jop} className="hover:bg-slate-50 transition-colors">
                <td className="font-bold text-blue-700 font-mono text-xs" style={{ textAlign: 'left' }}>{r.jop}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.spk}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{r.po}</td>
                <td className="font-medium text-slate-900" style={{ textAlign: 'center' }}>
                  <div>{r.customer}</div>
                  {r.noted_order && (
                    <div className="text-[10px] text-amber-700 font-normal italic truncate max-w-[140px] mx-auto" title={r.noted_order}>
                      Note: {r.noted_order}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{r.grade}</td>
                <td style={{ textAlign: 'center' }}>{r.gsm}</td>
                <td className="font-semibold" style={{ textAlign: 'center' }}>{r.target}</td>
                <td className="font-bold text-slate-900" style={{ textAlign: 'center' }}>{r.rolls}</td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-full max-w-[70px] h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.barBg}`} style={{ width: `${Math.min(r.progress, 100)}%` }} />
                    </div>
                    <span className={`text-[11px] font-bold w-9 text-right ${r.colorClass.split(' ')[1]}`}>{r.progress}%</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => { setSelectedJopDetail(r); setSelectedRWFilter(''); }}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 mx-auto py-1 px-2"
                  >
                    <Eye size={13} />
                    <span>Detail</span>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No JOP records found.
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

      {/* Add JOP Modal */}
      <Jop_CreateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        customers={customers}
        customCustomer={customCustomer}
        setCustomCustomer={setCustomCustomer}
        gradesList={gradesList}
        customGrade={customGrade}
        setCustomGrade={setCustomGrade}
        gsmsList={gsmsList}
        customGsm={customGsm}
        setCustomGsm={setCustomGsm}
        plybondsList={plybondsList}
        customPlybond={customPlybond}
        setCustomPlybond={setCustomPlybond}
        thicknessesList={thicknessesList}
        customThickness={customThickness}
        setCustomThickness={setCustomThickness}
        coresList={coresList}
        customCore={customCore}
        setCustomCore={setCustomCore}
        onSave={handleSave}
      />

      {/* JOP Detail Modal */}
      <Jop_DetailModal
        selectedJopDetail={selectedJopDetail}
        onClose={() => setSelectedJopDetail(null)}
        selectedRWFilter={selectedRWFilter}
        setSelectedRWFilter={setSelectedRWFilter}
        uniqueRWs={uniqueRWs}
        filteredRolls={filteredRolls}
        onSelectRoll={(roll) => setSelectedRollPopup(roll)}
        onPrint={printSerahTerima}
      />

      {/* Roll Detail Popup Modal */}
      <Jop_RollPopupModal
        selectedRollPopup={selectedRollPopup}
        selectedJopDetail={selectedJopDetail}
        onClose={() => setSelectedRollPopup(null)}
      />
    </div>
  )
}
