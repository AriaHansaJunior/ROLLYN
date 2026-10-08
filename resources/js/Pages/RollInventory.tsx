import React, { useState, useRef, useEffect } from 'react'
import {
  Package, Layers, Truck, Download, ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import QRScannerModal from '@/Components/QRScannerModal'
import SpectrumSlotSelectorModal from '@/Components/SpectrumSlotSelectorModal'
import {
  RollItem, OptionItem, ShipmentRollItem, ShipmentData, Props
} from '@/Components/RollInventory/RollInventory_types'
import RollInventory_StorageTab from '@/Components/RollInventory/RollInventory_StorageTab'
import RollInventory_ShipmentsTab from '@/Components/RollInventory/RollInventory_ShipmentsTab'
import RollInventory_CreateShipmentModal from '@/Components/RollInventory/RollInventory_CreateShipmentModal'
import RollInventory_QcRejectModal from '@/Components/RollInventory/RollInventory_QcRejectModal'
import RollInventory_EditRollModal from '@/Components/RollInventory/RollInventory_EditRollModal'
import RollInventory_PpicDispositionModal from '@/Components/RollInventory/RollInventory_PpicDispositionModal'
import RollInventory_QcReportModal from '@/Components/RollInventory/RollInventory_QcReportModal'
import RollInventory_QcRollEvaluatorModal from '@/Components/RollInventory/RollInventory_QcRollEvaluatorModal'

export default function RollInventory({
  rolls = [],
  shifts = [],
  grades = [],
  gsms = [],
  locations = [],
  jops = [],
  customers = [],
  qcUsers = [],
  shipments = []
}: Props) {
  const { props } = usePage()
  const authUser = (props.auth as any)?.user
  const userRole = (authUser?.role ?? '').toLowerCase()
  const isQC = userRole === 'qc'
  const isPPIC = userRole === 'ppic'
  const isPpicOrAdmin = userRole === 'ppic' || userRole === 'admin'

  // URL tab handling: QC is now allowed to switch views
  const initialTab = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'shipments')
    ? 'shipments'
    : 'inventory'

  const [viewMode, setViewMode] = useState<'inventory' | 'shipments'>(initialTab)

  // ----------------------------------------------------
  // STORAGE (INVENTORY) TAB STATE
  // ----------------------------------------------------
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [queueFilter, setQueueFilter] = useState('All') // 'All' | 'queued' | 'not_queued'
  const [qcStatusFilter, setQcStatusFilter] = useState('All') // 'All' | 'OK' | 'HOLD'
  const [reproductionFilter, setReproductionFilter] = useState('All') // 'All' | 'shipped' | 'reject' | 'reweigh' | 'reproduce_again' | 'none'
  const [sortKey, setSortKey] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const [advFilters, setAdvFilters] = useState({
    width: '',
    grade: '',
    gsm: '',
    plybond: '',
    thickness: '',
    bulk: '',
    diameter: '',
    core: '',
    weight: '',
    cobb: ''
  })

  // Checkboxes for creating new shipment
  const [checkedRollIds, setCheckedRollIds] = useState<string[]>([])

  // Shipment Creation Modal
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [shipmentForm, setShipmentForm] = useState<{
    customers_id: string[],
    qc_users_id: string,
    shipment_date: string,
  }>({
    customers_id: [''],
    qc_users_id: '',
    shipment_date: new Date().toISOString().slice(0, 10),
  })
  const [shipmentErrors, setShipmentErrors] = useState<Record<string, string>>({})
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false)

  // Edit Roll Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRoll, setEditingRoll] = useState<RollItem | null>(null)
  const [editForm, setEditForm] = useState({
    no_roll: '',
    form: '',
    shifts_id: 1,
    entry_date: '',
    grades_id: 1,
    gsms_id: '',
    weight: 0,
    locations_id: '',
    jops_id: '',
    exmaterial: 'IMPORT',
    visual: 'OK',
    status: 'OK',
    reproduction_status: 'none'
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Assign / Move Location Modal State
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [modalMode, setModalMode] = useState<'assign' | 'move'>('assign')
  const [assigningRoll, setAssigningRoll] = useState<RollItem | null>(null)
  const lastNotifyRef = useRef<number>(0)

  // Storage Scanner Modal
  const [showQRScanner, setShowQRScanner] = useState(false)

  // ----------------------------------------------------
  // SHIPMENTS & QC TAB STATE
  // ----------------------------------------------------
  const [activeShipmentId, setActiveShipmentId] = useState<number | null>(shipments[0]?.id || null)
  const activeShipment = shipments.find(s => s.id === activeShipmentId) || null
  const [shipmentSearch, setShipmentSearch] = useState('')
  const [shipmentFilter, setShipmentFilter] = useState<'all' | 'pending' | 'completed' | 'canceled'>('all')
  const [manualScanInput, setManualScanInput] = useState('')
  const [isProcessingScan, setIsProcessingScan] = useState(false)
  const [showQcReportModal, setShowQcReportModal] = useState(false)

  // QC Evaluation Flow
  const [activeQcRoll, setActiveQcRoll] = useState<any>(null)
  const [qcEvaluationMode, setQcEvaluationMode] = useState<'decision' | 'checklist'>('decision')
  const [selectedQcIssues, setSelectedQcIssues] = useState<string[]>([])
  const [qcReportNotes, setQcReportNotes] = useState<Record<string, string>>({})
  const [qcReportMeta, setQcReportMeta] = useState({
    customer: '',
    jenis_kendaraan: '',
    no_kendaraan: '',
    tujuan: '',
    tanggal: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (activeShipment && showQcReportModal) {
      setQcReportMeta({
        customer: activeShipment.customer || '',
        jenis_kendaraan: '',
        no_kendaraan: '',
        tujuan: '',
        tanggal: activeShipment.date ? activeShipment.date.split(' ')[0] : new Date().toISOString().split('T')[0]
      })
    }
  }, [activeShipment, showQcReportModal])

  const [qcIssueSearch, setQcIssueSearch] = useState('')
  const [expandedQcCategories, setExpandedQcCategories] = useState<string[]>([])
  const lastScannedThrottleRef = useRef<{ code: string; time: number }>({ code: '', time: 0 })

  // QC Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectForm, setRejectForm] = useState({
    shipment_id: '',
    roll_no: '',
    roll_display: '',
    reject_type: 'replace' as 'replace' | 'fixed',
    notes: ''
  })
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)

  // PPIC Re-production Disposition Modal State
  const [showPpicDispositionModal, setShowPpicDispositionModal] = useState(false)
  const [ppicDispositionRoll, setPpicDispositionRoll] = useState<any>(null)
  const [ppicDispositionStatus, setPpicDispositionStatus] = useState<'shipped' | 'reject' | 'reweigh' | 'reproduce_again'>('shipped')
  const [ppicDispositionNotes, setPpicDispositionNotes] = useState('')
  const [isSubmittingPpicDisposition, setIsSubmittingPpicDisposition] = useState(false)

  function openPpicDispositionModal(roll: any) {
    setPpicDispositionRoll(roll)
    const currentStatus = roll.reproduction_status && roll.reproduction_status !== 'none'
      ? roll.reproduction_status
      : 'shipped'
    setPpicDispositionStatus(currentStatus as any)
    setPpicDispositionNotes(roll.qc_notes || '')
    setShowPpicDispositionModal(true)
  }

  function submitPpicDisposition() {
    if (!ppicDispositionRoll || isSubmittingPpicDisposition) return
    setIsSubmittingPpicDisposition(true)
    const rollId = ppicDispositionRoll.roll_no || ppicDispositionRoll.raw_id || ppicDispositionRoll.id
    router.post(`/rolls/${rollId}/reproduction-disposition`, {
      reproduction_status: ppicDispositionStatus,
      notes: ppicDispositionNotes
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsSubmittingPpicDisposition(false)
        setShowPpicDispositionModal(false)
        SystemUI.toast({ message: `Re-production disposition updated for roll ${ppicDispositionRoll.no_roll}!`, type: 'success' })
      },
      onError: (errs) => {
        setIsSubmittingPpicDisposition(false)
        SystemUI.toast({ message: (errs as any)?.error || 'Failed to update re-production disposition.', type: 'error' })
      }
    })
  }

  // Sync active shipment when shipments prop updates
  useEffect(() => {
    if (shipments.length > 0) {
      if (!activeShipmentId || !shipments.some(s => s.id === activeShipmentId)) {
        setActiveShipmentId(shipments[0].id)
      }
    } else {
      setActiveShipmentId(null)
    }
  }, [shipments])

  // Derived state for QC Report Modal
  const aggregatedQcIssues = Array.from(new Set(
    (activeShipment?.rolls || []).flatMap((r: any) => {
      try {
        return typeof r.qc_issues === 'string' ? JSON.parse(r.qc_issues) : (r.qc_issues || [])
      } catch (e) {
        return []
      }
    })
  ))

  const statuses = ['All', 'Slotted', 'Shipment Plan', 'Incoming', 'Hold']

  // ----------------------------------------------------
  // STORAGE FUNCTIONS
  // ----------------------------------------------------
  function toggleRollChecked(id: string, inQueue?: boolean) {
    if (inQueue) {
      SystemUI.toast({ message: 'This roll is already assigned to a shipment queue.', type: 'warning' })
      return
    }
    setCheckedRollIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  function toggleSelectAllVisible() {
    const selectableRolls = paged.filter(r => !r.in_shipment_queue)
    const selectableIds = selectableRolls.map(r => r.id)

    if (selectableIds.length === 0) return

    const allSelected = selectableIds.every(id => checkedRollIds.includes(id))
    if (allSelected) {
      setCheckedRollIds(prev => prev.filter(id => !selectableIds.includes(id)))
    } else {
      setCheckedRollIds(prev => Array.from(new Set([...prev, ...selectableIds])))
    }
  }

  function openShipmentModal() {
    if (checkedRollIds.length === 0) {
      SystemUI.toast({ message: 'No rolls selected for shipment.', type: 'warning' })
      return
    }
    setShipmentErrors({})
    setShowShipmentModal(true)
  }

  function handleConfirmShipments() {
    const validCustomers = shipmentForm.customers_id.filter(c => c.trim() !== '')
    if (validCustomers.length === 0 || !shipmentForm.qc_users_id || !shipmentForm.shipment_date) {
      setShipmentErrors({
        customers_id: validCustomers.length === 0 ? 'At least one Customer is required' : '',
        qc_users_id: !shipmentForm.qc_users_id ? 'QC Officer is required' : '',
        shipment_date: !shipmentForm.shipment_date ? 'Shipment date is required' : '',
      })
      return
    }

    setIsSubmittingShipment(true)
    router.post('/shipments', {
      rolls: checkedRollIds,
      customers_id: validCustomers,
      qc_users_id: shipmentForm.qc_users_id,
      shipment_date: shipmentForm.shipment_date
    }, {
      onSuccess: () => {
        setIsSubmittingShipment(false)
        SystemUI.toast({ message: 'Shipment created successfully!', type: 'success' })
        setCheckedRollIds([])
        setShowShipmentModal(false)
        setViewMode('shipments')
      },
      onError: (errs) => {
        setIsSubmittingShipment(false)
        setShipmentErrors(errs as any)
        SystemUI.toast({ message: (errs as any)?.error || 'Failed to create shipment.', type: 'error' })
      }
    })
  }

  function handleStorageQRScanSuccess(scannedData: string) {
    let cleanVal = scannedData.trim()
    let targetRollId = cleanVal
    try {
      const parsed = JSON.parse(cleanVal)
      if (parsed && typeof parsed === 'object') {
        targetRollId = String(parsed.roll || parsed.no_roll || parsed.rollNumber || parsed.id || cleanVal)
      }
    } catch (e) {
      if (cleanVal.startsWith('*') && cleanVal.endsWith('*') && cleanVal.length > 2) {
        targetRollId = cleanVal.slice(1, -1).trim()
      }
    }

    const q = targetRollId.toLowerCase().replace(/^\*|\*$/g, '').trim()
    const matched = rolls.find(r => {
      const rId = (r.id || '').toLowerCase()
      const nr = (r.no_roll || '').toLowerCase()
      const rawId = String(r.raw_id || '')
      const rPrefixed = ('r-' + rawId).toLowerCase()
      const jop = (r.jop || '').toLowerCase()
      return rId === q || nr === q || rawId === q || rPrefixed === q || jop === q || (nr && nr.includes(q))
    })

    if (matched) {
      if (matched.in_shipment_queue) {
        SystemUI.toast({
          message: `Roll "${matched.no_roll || matched.id}" is already in shipment queue (${matched.shipment_queue_number}).`,
          type: 'warning'
        })
        return
      }

      if (!checkedRollIds.includes(matched.id)) {
        setCheckedRollIds(prev => [...prev, matched.id])
      }
      SystemUI.toast({
        message: `Roll "${matched.no_roll || matched.id}" selected for shipment!`,
        type: 'success'
      })
      setShowQRScanner(false)
    } else {
      SystemUI.toast({
        message: `Roll "${targetRollId}" not found in inventory.`,
        type: 'warning'
      })
    }
  }

  // Filter rolls in storage
  const filtered = rolls.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.id.toLowerCase().includes(q) ||
      r.grade.toLowerCase().includes(q) ||
      r.jop.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      (r.shipment_queue_number && r.shipment_queue_number.toLowerCase().includes(q))

    const matchStatus = statusFilter === 'All' || r.status === statusFilter

    let matchQueue = true
    if (queueFilter === 'queued') matchQueue = Boolean(r.in_shipment_queue)
    if (queueFilter === 'not_queued') matchQueue = !r.in_shipment_queue

    const matchQcStatus = qcStatusFilter === 'All' || r.roll_status === qcStatusFilter

    const matchReproduction = reproductionFilter === 'All'
      || (reproductionFilter === 'none' ? (!r.reproduction_status || r.reproduction_status === 'none') : r.reproduction_status === reproductionFilter)

    const matchAdv = (
      (!advFilters.width || String(r.width || '') === advFilters.width) &&
      (!advFilters.grade || String(r.grade || '') === advFilters.grade) &&
      (!advFilters.gsm || String(r.gsm || '') === advFilters.gsm) &&
      (!advFilters.plybond || String(r.plybond || '') === advFilters.plybond) &&
      (!advFilters.thickness || String(r.thickness || '') === advFilters.thickness) &&
      (!advFilters.bulk || String(r.bulk || '') === advFilters.bulk) &&
      (!advFilters.diameter || String(r.diameter || '') === advFilters.diameter) &&
      (!advFilters.core || String(r.core || '') === advFilters.core) &&
      (!advFilters.weight || String(r.weight || '') === advFilters.weight) &&
      (!advFilters.cobb || String(r.cobb || '') === advFilters.cobb)
    )

    return matchSearch && matchStatus && matchQueue && matchQcStatus && matchReproduction && matchAdv
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
    const dataToExport = filtered && filtered.length > 0 ? filtered : rolls
    if (!dataToExport || dataToExport.length === 0) {
      SystemUI.toast({ message: 'No rolls available to export.', type: 'warning' })
      return
    }

    const headers = [
      'Roll Number',
      'Form Code',
      'Shift',
      'Entry Date',
      'Grade',
      'GSM',
      'Weight (kg)',
      'Width (mm)',
      'Warehouse Location',
      'JOP Number',
      'PIC / Operator',
      'Status',
      'Shipment Queued',
      'Visual',
      'Ex-Material'
    ]

    const csvRows = [
      'sep=,',
      headers.join(','),
      ...dataToExport.map(r => [
        `"${(r.no_roll || r.id || '').replace(/"/g, '""')}"`,
        `"${(r.form || '').replace(/"/g, '""')}"`,
        `"${(r.shift || '').replace(/"/g, '""')}"`,
        `"${r.date || ''}"`,
        `"${(r.grade || '').replace(/"/g, '""')}"`,
        r.gsm || 0,
        r.weight || 0,
        r.width || 0,
        `"${(r.location || 'Not Assigned').replace(/"/g, '""')}"`,
        `"${(r.jop || '').replace(/"/g, '""')}"`,
        `"${(r.pic || '').replace(/"/g, '""')}"`,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        r.in_shipment_queue ? '"Yes"' : '"No"',
        `"${(r.visual || 'OK').replace(/"/g, '""')}"`,
        `"${(r.exMaterial || 'IMPORT').replace(/"/g, '""')}"`
      ].join(','))
    ]

    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rollyn_roll_inventory_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    SystemUI.toast({
      message: `Exported ${dataToExport.length} roll records to CSV successfully.`,
      type: 'success'
    })
  }

  function openEdit(r: RollItem) {
    setEditingRoll(r)
    setEditForm({
      no_roll: r.no_roll || r.id,
      form: r.raw_form ? String(r.raw_form) : '',
      shifts_id: r.shifts_id || (shifts[0]?.id ?? 1),
      entry_date: r.date && r.date !== '—' ? r.date : new Date().toISOString().slice(0, 10),
      grades_id: r.grades_id || (grades[0]?.id ?? 1),
      gsms_id: r.gsms_id ? String(r.gsms_id) : '',
      weight: r.weight || 0,
      locations_id: r.locations_id ? String(r.locations_id) : '',
      jops_id: r.jops_id ? String(r.jops_id) : '',
      exmaterial: r.exMaterial || 'IMPORT',
      visual: r.visual || 'OK',
      status: r.roll_status || 'OK',
      reproduction_status: r.reproduction_status || 'none'
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
    setShowAssignModal(true)
  }

  function handleConfirmSpectrumSlot(selectedId: string, recommendedId: string | null, actionType: 'ASSIGN' | 'MOVE') {
    if (!assigningRoll) return
    const actionText = actionType === 'MOVE' ? 'moved' : 'assigned'

    router.put(`/rolls/${assigningRoll.raw_id}`, {
      locations_id: selectedId,
      recommended_locations_id: recommendedId,
      action_type: actionType
    }, {
      onSuccess: () => {
        SystemUI.toast({
          message: `Roll ${assigningRoll.id} successfully ${actionText}!`,
          type: 'success'
        })
        setShowAssignModal(false)
      },
      onError: () => {
        SystemUI.toast({ message: `Failed to ${actionType.toLowerCase()} location slot.`, type: 'error' })
      }
    })
  }

  // ----------------------------------------------------
  // SHIPMENTS & QC FUNCTIONS
  // ----------------------------------------------------
  function handleQCScan(scannedData: string) {
    if (!activeShipment || isProcessingScan || activeShipment.status === 'canceled') return

    let cleanVal = scannedData.trim()
    let rollNo = cleanVal
    try {
      const parsed = JSON.parse(cleanVal)
      if (parsed && typeof parsed === 'object') {
        rollNo = String(parsed.roll || parsed.no_roll || parsed.rollNumber || parsed.id || cleanVal)
      }
    } catch (e) {
      if (cleanVal.startsWith('*') && cleanVal.endsWith('*') && cleanVal.length > 2) {
        rollNo = cleanVal.slice(1, -1).trim()
      }
    }

    const q = rollNo.toLowerCase().replace(/^\*|\*$/g, '').trim()

    // Find roll in active shipment
    const targetRoll = activeShipment.rolls.find(r => {
      const nr = (r.no_roll || '').toLowerCase()
      const rno = String(r.roll_no || '').toLowerCase()
      const rPrefixed = ('r-' + rno).toLowerCase()
      return nr === q || rno === q || rPrefixed === q || nr.includes(q) || q.includes(nr)
    })

    if (targetRoll) {
      if (targetRoll.qc_status === 'passed') {
        SystemUI.toast({ message: `Roll "${targetRoll.no_roll}" already passed QC.`, type: 'info' })
        return
      }

      // Instead of submitting immediately, we open the QC Roll Detail Evaluator
      setActiveQcRoll(targetRoll)
      setQcEvaluationMode('decision')
      setSelectedQcIssues([])
      setQcIssueSearch('')
      setExpandedQcCategories([])
      setManualScanInput('')
    } else {
      // Check if roll belongs to another shipment
      const otherShipment = shipments.find(s =>
        s.id !== activeShipment.id &&
        s.status !== 'canceled' &&
        s.rolls.some(r => {
          const nr = (r.no_roll || '').toLowerCase()
          const rno = String(r.roll_no || '').toLowerCase()
          const rPrefixed = ('r-' + rno).toLowerCase()
          return nr === q || rno === q || rPrefixed === q || nr.includes(q) || q.includes(nr)
        })
      )

      if (otherShipment) {
        SystemUI.toast({
          message: `Roll "${rollNo}" belongs to ${otherShipment.shipment_number} (${otherShipment.customer}). Switching shipment...`,
          type: 'info'
        })
        setActiveShipmentId(otherShipment.id)
      } else {
        // Anti-spam camera frame throttle
        const now = Date.now()
        if (lastScannedThrottleRef.current.code === q && (now - lastScannedThrottleRef.current.time) < 2500) {
          return
        }
        lastScannedThrottleRef.current = { code: q, time: now }

        SystemUI.toast({
          message: `Roll "${rollNo}" is not in this shipment!`,
          type: 'warning'
        })
      }
    }
  }

  function submitQcScan(issues: string[] = []) {
    if (!activeShipment || !activeQcRoll || isProcessingScan) return

    setIsProcessingScan(true)
    router.post('/shipments/qc/scan', {
      shipment_id: activeShipment.id,
      no_roll: activeQcRoll.no_roll,
      qc_issues: issues.length > 0 ? issues : null
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsProcessingScan(false)
        setActiveQcRoll(null)
        setManualScanInput('')
        SystemUI.toast({ message: `✓ Roll ${activeQcRoll.no_roll} PASSED QC inspection!`, type: 'success' })
      },
      onError: () => {
        setIsProcessingScan(false)
        SystemUI.toast({ message: 'Failed to record QC scan.', type: 'error' })
      }
    })
  }

  function handleManualScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualScanInput.trim()) return
    handleQCScan(manualScanInput)
  }

  function submitQcReport(e: React.FormEvent) {
    e.preventDefault()
    if (!activeShipment || isProcessingScan) return

    setIsProcessingScan(true)

    const payload = {
      meta: qcReportMeta,
      issues: qcReportNotes,
      all_issues_found: aggregatedQcIssues
    }

    router.post(`/shipments/${activeShipment.id}/qc-report`, {
      qc_report_notes: payload
    }, {
      onSuccess: () => {
        setIsProcessingScan(false)
        setShowQcReportModal(false)
        window.open(`/shipments/${activeShipment.id}/print-qc`, '_blank')
        setActiveShipmentId(null)
        setQcReportNotes({})
        SystemUI.toast({ message: `QC Report submitted successfully!`, type: 'success' })
      },
      onError: () => {
        setIsProcessingScan(false)
        SystemUI.toast({ message: 'Failed to submit QC report.', type: 'error' })
      }
    })
  }

  function handleManualPassRoll(roll: ShipmentRollItem) {
    if (!activeShipment || activeShipment.status === 'canceled') return
    setIsProcessingScan(true)
    router.post('/shipments/qc/scan', {
      shipment_id: activeShipment.id,
      no_roll: roll.no_roll
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsProcessingScan(false)
        SystemUI.toast({ message: `✓ Roll ${roll.no_roll} verified as Passed!`, type: 'success' })
      },
      onError: () => {
        setIsProcessingScan(false)
        SystemUI.toast({ message: 'Failed to verify roll.', type: 'error' })
      }
    })
  }

  function openRejectModal(roll: ShipmentRollItem) {
    if (!activeShipment || activeShipment.status === 'canceled') return
    setRejectForm({
      shipment_id: String(activeShipment.id),
      roll_no: String(roll.roll_no),
      roll_display: roll.no_roll,
      reject_type: 'replace',
      notes: ''
    })
    setShowRejectModal(true)
  }

  function submitReject() {
    setIsSubmittingReject(true)
    router.post('/shipments/qc/reject', {
      shipment_id: Number(rejectForm.shipment_id),
      roll_no: Number(rejectForm.roll_no),
      reject_type: rejectForm.reject_type,
      notes: rejectForm.notes
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsSubmittingReject(false)
        setShowRejectModal(false)
        const msg = rejectForm.reject_type === 'replace'
          ? `Roll ${rejectForm.roll_display} marked as Rejected (Replace requested).`
          : `Roll ${rejectForm.roll_display} resolved on-site and Passed.`
        SystemUI.toast({ message: msg, type: 'success' })
      },
      onError: () => {
        setIsSubmittingReject(false)
        SystemUI.toast({ message: 'Failed to update roll rejection status.', type: 'error' })
      }
    })
  }

  // Admin/PPIC Cancellation Actions
  async function handleCancelShipment(shipment: ShipmentData) {
    const confirmed = await SystemUI.confirm({
      title: 'Cancel Shipment Order',
      message: `Are you sure you want to cancel shipment "${shipment.shipment_number}"? This will cancel the shipment order and release all ${shipment.total_rolls} rolls back to available storage.`,
      confirmText: 'Cancel Entire Shipment',
      cancelText: 'Keep Shipment'
    })

    if (confirmed) {
      router.delete(`/shipments/${shipment.id}/cancel`, {
        preserveScroll: true,
        onSuccess: () => {
          SystemUI.toast({ message: `Shipment ${shipment.shipment_number} has been canceled.`, type: 'success' })
        },
        onError: () => {
          SystemUI.toast({ message: 'Failed to cancel shipment.', type: 'error' })
        }
      })
    }
  }

  async function handleCancelRollFromShipment(roll: ShipmentRollItem) {
    if (!activeShipment) return
    const confirmed = await SystemUI.confirm({
      title: 'Remove Roll from Shipment',
      message: `Remove roll "${roll.no_roll}" from shipment "${activeShipment.shipment_number}"? The roll will be released back to available storage.`,
      confirmText: 'Remove Roll',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      router.delete(`/shipments/${activeShipment.id}/roll/${roll.roll_no}`, {
        preserveScroll: true,
        onSuccess: () => {
          SystemUI.toast({ message: `Roll ${roll.no_roll} removed from shipment.`, type: 'success' })
        },
        onError: () => {
          SystemUI.toast({ message: 'Failed to remove roll from shipment.', type: 'error' })
        }
      })
    }
  }

  // Filter Shipments
  const filteredShipments = shipments.filter(s => {
    const q = shipmentSearch.toLowerCase()
    const matchSearch = !q ||
      s.shipment_number.toLowerCase().includes(q) ||
      s.customer.toLowerCase().includes(q) ||
      s.qc_officer.toLowerCase().includes(q)

    if (shipmentFilter === 'pending') return matchSearch && s.status !== 'completed' && s.status !== 'canceled'
    if (shipmentFilter === 'completed') return matchSearch && s.status === 'completed'
    if (shipmentFilter === 'canceled') return matchSearch && s.status === 'canceled'
    return matchSearch
  })

  // Summary Metrics (Exclude canceled from active counts)
  const activeShipments = shipments.filter(s => s.status !== 'canceled')
  const totalShipmentsCount = shipments.length
  const pendingShipmentsCount = activeShipments.filter(s => s.status !== 'completed').length
  const completedShipmentsCount = shipments.filter(s => s.status === 'completed').length
  const totalShipmentRolls = activeShipments.reduce((acc, s) => acc + s.total_rolls, 0)
  const totalCheckedRolls = activeShipments.reduce((acc, s) => acc + s.checked_rolls, 0)

  const queuedRollsCount = rolls.filter(r => r.in_shipment_queue).length
  const unqueuedRollsCount = rolls.filter(r => !r.in_shipment_queue).length
  const holdRollsCount = rolls.filter(r => r.roll_status === 'HOLD').length

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
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-blue-600" size={24} />
            Roll Inventory & Shipments
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'inventory'
              ? 'Comprehensive physical roll inventory & shipment allocation'
              : (isQC ? 'QC Inspection & verification station for assigned shipments' : 'Track and monitor active shipment inspections')}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* Mode Switcher: Pill toggle for all roles */}
          <div className="relative flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 shadow-inner gap-0">
            <span
              className="absolute top-1 bottom-1 rounded-full bg-blue-600 shadow transition-all duration-300 ease-in-out"
              style={{
                width: 'calc(50% - 4px)',
                left: viewMode === 'inventory' ? '4px' : 'calc(50%)',
              }}
            />
            <button
              className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${viewMode === 'inventory' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              onClick={() => { setViewMode('inventory'); setPage(1) }}
            >
              <Layers size={13} />
              Storage ({rolls.length})
            </button>
            <button
              className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${viewMode === 'shipments' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              onClick={() => { setViewMode('shipments'); }}
            >
              <Truck size={13} />
              {isQC ? 'QC Station' : 'Shipments'}
              {pendingShipmentsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${viewMode === 'shipments' ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'}`}>
                  {pendingShipmentsCount}
                </span>
              )}
            </button>
          </div>

          {viewMode === 'inventory' && !isQC && (
            <button className="btn btn-secondary btn-sm cursor-pointer" onClick={handleExport}>
              <Download size={13} /> <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: STORAGE (INVENTORY) TAB */}
      {viewMode === 'inventory' && (
        <RollInventory_StorageTab
          rolls={rolls}
          filtered={filtered}
          paged={paged}
          totalPages={totalPages}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statuses={statuses}
          queueFilter={queueFilter}
          setQueueFilter={setQueueFilter}
          qcStatusFilter={qcStatusFilter}
          setQcStatusFilter={setQcStatusFilter}
          reproductionFilter={reproductionFilter}
          setReproductionFilter={setReproductionFilter}
          page={page}
          setPage={setPage}
          perPage={perPage}
          setPerPage={setPerPage}
          advFilters={advFilters}
          setAdvFilters={setAdvFilters}
          checkedRollIds={checkedRollIds}
          setCheckedRollIds={setCheckedRollIds}
          toggleRollChecked={toggleRollChecked}
          toggleSelectAllVisible={toggleSelectAllVisible}
          cols={cols}
          sort={sort}
          SortIcon={SortIcon}
          isQC={isQC}
          openEdit={openEdit}
          handleAssignClick={handleAssignClick}
          handleDelete={handleDelete}
          openShipmentModal={openShipmentModal}
          queuedRollsCount={queuedRollsCount}
          unqueuedRollsCount={unqueuedRollsCount}
          holdRollsCount={holdRollsCount}
        />
      )}

      {/* VIEW MODE 2: SHIPMENTS & QC TAB */}
      {viewMode === 'shipments' && (
        <RollInventory_ShipmentsTab
          totalShipmentsCount={totalShipmentsCount}
          totalShipmentRolls={totalShipmentRolls}
          pendingShipmentsCount={pendingShipmentsCount}
          completedShipmentsCount={completedShipmentsCount}
          totalCheckedRolls={totalCheckedRolls}
          isQC={isQC}
          isPpicOrAdmin={isPpicOrAdmin}
          filteredShipments={filteredShipments}
          shipmentSearch={shipmentSearch}
          setShipmentSearch={setShipmentSearch}
          shipmentFilter={shipmentFilter}
          setShipmentFilter={setShipmentFilter}
          activeShipmentId={activeShipmentId}
          setActiveShipmentId={setActiveShipmentId}
          activeShipment={activeShipment}
          handleCancelShipment={handleCancelShipment}
          setShowQcReportModal={setShowQcReportModal}
          handleQCScan={handleQCScan}
          manualScanInput={manualScanInput}
          setManualScanInput={setManualScanInput}
          isProcessingScan={isProcessingScan}
          handleManualScanSubmit={handleManualScanSubmit}
          handleManualPassRoll={handleManualPassRoll}
          openRejectModal={openRejectModal}
          openPpicDispositionModal={openPpicDispositionModal}
          handleCancelRollFromShipment={handleCancelRollFromShipment}
        />
      )}

      {/* MODALS */}

      {/* 1. Create Shipment Modal */}
      <RollInventory_CreateShipmentModal
        isOpen={showShipmentModal}
        onClose={() => setShowShipmentModal(false)}
        shipmentForm={shipmentForm}
        setShipmentForm={setShipmentForm}
        shipmentErrors={shipmentErrors}
        customers={customers}
        qcUsers={qcUsers}
        checkedRollIds={checkedRollIds}
        isSubmittingShipment={isSubmittingShipment}
        onConfirm={handleConfirmShipments}
      />

      {/* 2. QC Reject Decision Modal */}
      <RollInventory_QcRejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        rejectForm={rejectForm}
        setRejectForm={setRejectForm}
        isSubmittingReject={isSubmittingReject}
        onSubmit={submitReject}
      />

      {/* 3. Edit Roll Modal */}
      <RollInventory_EditRollModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingRoll={editingRoll}
        editForm={editForm}
        setEditForm={setEditForm}
        editErrors={editErrors}
        shifts={shifts}
        grades={grades}
        gsms={gsms}
        locations={locations}
        jops={jops}
        isQC={isQC}
        userRole={userRole}
        isPpicOrAdmin={isPpicOrAdmin}
        onSave={saveEdit}
      />

      {/* 4. PPIC Re-production Disposition Quick Modal */}
      <RollInventory_PpicDispositionModal
        isOpen={showPpicDispositionModal}
        onClose={() => setShowPpicDispositionModal(false)}
        roll={ppicDispositionRoll}
        status={ppicDispositionStatus}
        setStatus={setPpicDispositionStatus}
        notes={ppicDispositionNotes}
        setNotes={setPpicDispositionNotes}
        isSubmitting={isSubmittingPpicDisposition}
        onSubmit={submitPpicDisposition}
      />

      {/* 5. SPECTRUM AI Slot Selector Modal */}
      <SpectrumSlotSelectorModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onConfirm={handleConfirmSpectrumSlot}
        roll={assigningRoll}
        locations={locations}
        mode={modalMode}
        currentLocationId={assigningRoll?.locations_id}
        currentLocationCode={assigningRoll?.location}
      />

      {/* 6. QR Code Scanner Camera Modal (For Storage tab) */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleStorageQRScanSuccess}
      />

      {/* 7. Final QC Report Modal */}
      <RollInventory_QcReportModal
        isOpen={showQcReportModal}
        onClose={() => setShowQcReportModal(false)}
        activeShipment={activeShipment}
        aggregatedQcIssues={aggregatedQcIssues}
        qcReportNotes={qcReportNotes}
        setQcReportNotes={setQcReportNotes}
        isProcessingScan={isProcessingScan}
        onSubmit={submitQcReport}
      />

      {/* 8. QC Roll Evaluator Full Modal */}
      <RollInventory_QcRollEvaluatorModal
        activeQcRoll={activeQcRoll}
        onClose={() => setActiveQcRoll(null)}
        qcEvaluationMode={qcEvaluationMode}
        setQcEvaluationMode={setQcEvaluationMode}
        qcIssueSearch={qcIssueSearch}
        setQcIssueSearch={setQcIssueSearch}
        expandedQcCategories={expandedQcCategories}
        setExpandedQcCategories={setExpandedQcCategories}
        selectedQcIssues={selectedQcIssues}
        setSelectedQcIssues={setSelectedQcIssues}
        onSubmitQcScan={submitQcScan}
      />
    </div>
  )
}
