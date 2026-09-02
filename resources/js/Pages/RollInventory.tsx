import { useState, useRef, useEffect } from 'react'
import {
  Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, X,
  Download, MapPin, Package, Camera, QrCode, CheckCircle2, XCircle, Clock,
  AlertTriangle, UserCheck, Calendar, Building2, Truck, Check, RefreshCw, Layers,
  Ban, ShieldCheck, ShieldAlert
} from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import QRScannerModal from '@/Components/QRScannerModal'
import EmbeddedQRScanner from '@/Components/EmbeddedQRScanner'
import SpectrumSlotSelectorModal from '@/Components/SpectrumSlotSelectorModal'

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
  roll_status?: string
  in_shipment_queue?: boolean
  shipment_queue_number?: string | null
  shipment_queue_status?: string | null
  shipment_queue_qc_status?: string | null
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

interface ShipmentRollItem {
  id: number
  roll_no: number
  no_roll: string
  grade: string
  gsm: number
  weight: number
  location: string
  qc_status: string // 'pending' | 'passed' | 'rejected_replace'
  qc_notes: string | null
  qc_checked_at: string | null
}

interface ShipmentData {
  id: number
  shipment_number: string
  customer: string
  admin: string
  qc_officer: string
  qc_users_id: number
  date: string
  status: string // 'pending' | 'qc_in_progress' | 'completed' | 'canceled'
  total_rolls: number
  checked_rolls: number
  passed_rolls: number
  rejected_rolls: number
  rolls: ShipmentRollItem[]
}

interface Props {
  rolls?: RollItem[]
  shifts?: OptionItem[]
  grades?: OptionItem[]
  locations?: OptionItem[]
  jops?: OptionItem[]
  customers?: { id: number, customer: string }[]
  qcUsers?: { id: number, username?: string, name?: string }[]
  shipments?: ShipmentData[]
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
  jops = [],
  customers = [],
  qcUsers = [],
  shipments = []
}: Props) {
  const { props } = usePage()
  const authUser = (props.auth as any)?.user
  const userRole = (authUser?.role ?? '').toLowerCase()
  const isQC = userRole === 'qc'

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
  const [sortKey, setSortKey] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Checkboxes for creating new shipment
  const [checkedRollIds, setCheckedRollIds] = useState<string[]>([])

  // Shipment Creation Modal
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [shipmentForm, setShipmentForm] = useState({
    customers_id: '',
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
    weight: 0,
    locations_id: '',
    jops_id: '',
    exmaterial: 'IMPORT',
    visual: 'OK',
    status: 'OK'
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Assign / Move Location Modal State
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [modalMode, setModalMode] = useState<'assign' | 'move'>('assign')
  const [assigningRoll, setAssigningRoll] = useState<RollItem | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const lastNotifyRef = useRef<number>(0)

  // Storage Scanner Modal
  const [showQRScanner, setShowQRScanner] = useState(false)

  // ----------------------------------------------------
  // SHIPMENTS & QC TAB STATE
  // ----------------------------------------------------
  const [activeShipmentId, setActiveShipmentId] = useState<number | null>(shipments[0]?.id || null)
  const [shipmentSearch, setShipmentSearch] = useState('')
  const [shipmentFilter, setShipmentFilter] = useState<'all' | 'pending' | 'completed' | 'canceled'>('all')
  const [manualScanInput, setManualScanInput] = useState('')
  const [isProcessingScan, setIsProcessingScan] = useState(false)
  const [consecutiveQcErrors, setConsecutiveQcErrors] = useState<number>(0)
  const consecutiveQcErrorsRef = useRef<number>(0)
  const [showSuspendedModal, setShowSuspendedModal] = useState<boolean>(false)
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

  const activeShipment = shipments.find(s => s.id === activeShipmentId) || null

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
    // Only select rolls that are NOT in shipment queue
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
    if (!shipmentForm.customers_id || !shipmentForm.qc_users_id || !shipmentForm.shipment_date) {
      setShipmentErrors({
        customers_id: !shipmentForm.customers_id ? 'Customer is required' : '',
        qc_users_id: !shipmentForm.qc_users_id ? 'QC Officer is required' : '',
        shipment_date: !shipmentForm.shipment_date ? 'Shipment date is required' : '',
      })
      return
    }

    setIsSubmittingShipment(true)
    router.post('/shipments', {
      rolls: checkedRollIds,
      customers_id: shipmentForm.customers_id,
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

    return matchSearch && matchStatus && matchQueue && matchQcStatus
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
      weight: r.weight || 0,
      locations_id: r.locations_id ? String(r.locations_id) : '',
      jops_id: r.jops_id ? String(r.jops_id) : '',
      exmaterial: r.exMaterial || 'IMPORT',
      visual: r.visual || 'OK',
      status: r.roll_status || 'OK'
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
    if (!activeShipment || isProcessingScan || activeShipment.status === 'canceled' || showSuspendedModal) return

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

      setIsProcessingScan(true)
      router.post('/shipments/qc/scan', {
        shipment_id: activeShipment.id,
        no_roll: targetRoll.no_roll
      }, {
        preserveScroll: true,
        onSuccess: () => {
          setIsProcessingScan(false)
          setManualScanInput('')
          consecutiveQcErrorsRef.current = 0
          setConsecutiveQcErrors(0) // Reset consecutive errors on successful valid scan
          SystemUI.toast({ message: `✓ Roll ${targetRoll.no_roll} PASSED QC inspection!`, type: 'success' })
        },
        onError: () => {
          setIsProcessingScan(false)
          SystemUI.toast({ message: 'Failed to record QC scan.', type: 'error' })
        }
      })
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
        consecutiveQcErrorsRef.current = 0
        setConsecutiveQcErrors(0)
      } else {
        // Anti-spam camera frame throttle
        const now = Date.now()
        if (lastScannedThrottleRef.current.code === q && (now - lastScannedThrottleRef.current.time) < 2500) {
          return
        }
        lastScannedThrottleRef.current = { code: q, time: now }

        consecutiveQcErrorsRef.current += 1
        const newErrors = consecutiveQcErrorsRef.current
        setConsecutiveQcErrors(newErrors)

        if (newErrors >= 10) {
          setShowSuspendedModal(true)
          return
        }

        SystemUI.toast({
          message: `Roll "${rollNo}" is not in this shipment! (Invalid attempts: ${newErrors}/10)`,
          type: 'warning'
        })
      }
    }
  }

  function handleManualScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualScanInput.trim()) return
    handleQCScan(manualScanInput.trim())
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
                className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'inventory' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => { setViewMode('inventory'); setPage(1) }}
              >
                <Layers size={13} />
                Storage ({rolls.length})
              </button>
              <button
                className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'shipments' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
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

      {/* ========================================================================= */}
      {/* VIEW MODE 1: STORAGE (INVENTORY) TAB */}
      {/* ========================================================================= */}
      {viewMode === 'inventory' && (
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
                  <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
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
                    className="form-input text-xs py-1.5 min-w-[110px] w-auto"
                  >
                    <option value="All">All QC Status</option>
                    <option value="OK">OK</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shipment Queue Switch Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setQueueFilter('all'); setPage(1) }}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    queueFilter === 'all' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Rolls ({rolls.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setQueueFilter('not_queued'); setPage(1) }}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    queueFilter === 'not_queued' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Available ({unqueuedRollsCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setQueueFilter('queued'); setPage(1) }}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    queueFilter === 'queued' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Shipment Queued ({queuedRollsCount})
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
                {!isQC && <col className="w-[45px]" />}  {/* Checkbox */}
                <col className="w-[85px]" />  {/* SHIFT */}
                <col className="w-[105px]" /> {/* ENTRY DATE */}
                <col className="w-[140px]" /> {/* GRADE */}
                <col className="w-[70px]" />  {/* GSM */}
                <col className="w-[110px]" /> {/* WEIGHT (KG) */}
                <col className="w-[100px]" /> {/* WIDTH (MM) */}
                <col className="w-[110px]" /> {/* LOCATION */}
                <col className="w-[130px]" /> {/* JOP */}
                <col className="w-[95px]" />  {/* PIC */}
                <col className="w-[130px]" /> {/* STATUS */}
                <col className="w-[140px]" /> {/* ACTIONS */}
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
                      className={`transition-colors border-b border-slate-100 ${
                        isQueued
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
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="badge inline-flex justify-center px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap rounded-md"
                            style={{ backgroundColor: sc.bg, color: sc.color }}
                          >
                            {r.status}
                          </span>
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
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            onClick={() => openEdit(r)}
                            title="Edit Roll Data"
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
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: SHIPMENTS & QC TAB */}
      {/* ========================================================================= */}
      {viewMode === 'shipments' && (
        <div className="space-y-4">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3.5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Shipments</span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><Truck size={15} /></div>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{totalShipmentsCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{totalShipmentRolls} rolls in total</div>
            </div>

            <div className="card p-3.5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Pending QC</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><Clock size={15} /></div>
              </div>
              <div className="text-xl font-extrabold text-amber-600 mt-1">{pendingShipmentsCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Awaiting complete verification</div>
            </div>

            <div className="card p-3.5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Completed</span>
                <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><CheckCircle2 size={15} /></div>
              </div>
              <div className="text-xl font-extrabold text-green-600 mt-1">{completedShipmentsCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ready for final dispatch</div>
            </div>

            <div className="card p-3.5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">QC Verified</span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><UserCheck size={15} /></div>
              </div>
              <div className="text-xl font-extrabold text-indigo-600 mt-1">
                {totalCheckedRolls} <span className="text-xs font-normal text-slate-400">/ {totalShipmentRolls}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {totalShipmentRolls > 0 ? `${Math.round((totalCheckedRolls / totalShipmentRolls) * 100)}% verified` : '0%'}
              </div>
            </div>
          </div>

          {/* Main 2-Column Split: Shipments Sidebar & Inspection View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Shipment List (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="card p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck size={15} className="text-blue-600" />
                    {isQC ? 'My Assigned Shipments' : 'All Shipments'}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {filteredShipments.length}
                  </span>
                </div>

                {/* Search & Filter pills */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      value={shipmentSearch}
                      onChange={e => setShipmentSearch(e.target.value)}
                      placeholder="Search SHP, customer, QC..."
                      className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
                    />
                    {shipmentSearch && (
                      <button onClick={() => setShipmentSearch('')} className="text-slate-400 hover:text-slate-600">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                    <button
                      className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      onClick={() => setShipmentFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'pending' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      onClick={() => setShipmentFilter('pending')}
                    >
                      Pending
                    </button>
                    <button
                      className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'completed' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      onClick={() => setShipmentFilter('completed')}
                    >
                      Completed
                    </button>
                    {!isQC && (
                      <button
                        className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'canceled' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        onClick={() => setShipmentFilter('canceled')}
                      >
                        Canceled
                      </button>
                    )}
                  </div>
                </div>

                {/* Shipment Cards List */}
                <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {filteredShipments.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <Truck size={28} className="mx-auto opacity-30" />
                      <p className="text-xs font-semibold">No shipments found</p>
                      <p className="text-[10px] text-slate-400">
                        {isQC ? 'No shipments currently assigned to your account.' : 'Create a shipment from the Storage tab.'}
                      </p>
                    </div>
                  ) : (
                    filteredShipments.map(s => {
                      const isActive = activeShipmentId === s.id
                      const isComplete = s.status === 'completed'
                      const isCanceled = s.status === 'canceled'
                      const progressPct = s.total_rolls > 0 ? Math.round((s.checked_rolls / s.total_rolls) * 100) : 0

                      return (
                        <div
                          key={s.id}
                          onClick={() => setActiveShipmentId(s.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-300'
                              : isCanceled
                                ? 'bg-slate-50/60 border-slate-200 opacity-75'
                                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-xs font-bold text-slate-900 font-mono flex items-center gap-1">
                              {s.shipment_number}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCanceled
                                ? 'bg-slate-200 text-slate-600'
                                : isComplete
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isCanceled ? 'Canceled' : isComplete ? 'Completed' : 'QC Pending'}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 mb-1">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{s.customer}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              {s.date}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <UserCheck size={11} className="text-blue-500" />
                              {s.qc_officer}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {!isCanceled && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">QC Progress</span>
                                <span className="font-bold text-slate-700">
                                  {s.checked_rolls} / {s.total_rolls} Rolls ({progressPct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-blue-600'}`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Active Shipment QC Station (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {activeShipment ? (
                <>
                  {/* Shipment Header Banner */}
                  <div className="card p-4 bg-white border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900 font-mono">
                            {activeShipment.shipment_number}
                          </h3>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            activeShipment.status === 'canceled'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : activeShipment.status === 'completed'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {activeShipment.status === 'canceled'
                              ? '✕ Canceled'
                              : activeShipment.status === 'completed'
                                ? '✓ Completed'
                                : 'QC In Progress'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Created by <strong>{activeShipment.admin}</strong> • Target Date: <strong>{activeShipment.date}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Customer</div>
                          <div className="text-xs font-bold text-slate-900">{activeShipment.customer}</div>
                        </div>
                        <div className="h-7 w-px bg-slate-200" />
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">QC Officer</div>
                          <div className="text-xs font-bold text-blue-700">{activeShipment.qc_officer}</div>
                        </div>

                        {/* Admin/PPIC Cancel Shipment Button */}
                        {!isQC && activeShipment.status !== 'canceled' && activeShipment.status !== 'completed' && (
                          <div className="pl-2 border-l border-slate-200">
                            <button
                              onClick={() => handleCancelShipment(activeShipment)}
                              className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                              title="Cancel entire shipment order"
                            >
                              <Ban size={13} />
                              Cancel Shipment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cancel notice if shipment is canceled */}
                    {activeShipment.status === 'canceled' && (
                      <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600 shrink-0" />
                        <span>
                          <strong>This shipment order was canceled.</strong> All rolls have been unlinked and returned to available inventory.
                        </span>
                      </div>
                    )}

                    {/* Progress summary stats */}
                    {activeShipment.status !== 'canceled' && (
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="text-[10px] text-slate-500 font-semibold">Total Rolls</div>
                          <div className="text-sm font-extrabold text-slate-800">{activeShipment.total_rolls}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                          <div className="text-[10px] text-green-700 font-semibold">Passed</div>
                          <div className="text-sm font-extrabold text-green-700">{activeShipment.passed_rolls}</div>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                          <div className="text-[10px] text-red-700 font-semibold">Replaced / Rejected</div>
                          <div className="text-sm font-extrabold text-red-700">{activeShipment.rejected_rolls}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR Scanner Station (Shown for QC users when shipment is active) */}
                  {isQC && activeShipment.status !== 'completed' && activeShipment.status !== 'canceled' && (
                    <div className="card p-0 overflow-hidden border border-blue-200 shadow-xs">
                      <div className="bg-blue-600 px-4 py-2.5 text-white flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Camera size={15} />
                          Live QC Barcode Scanner
                        </span>
                        <span className="text-[11px] text-blue-100">
                          Scan barcode to verify quality
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900">
                        <EmbeddedQRScanner onScanSuccess={handleQCScan} />
                      </div>

                      {/* Manual Barcode Input Fallback */}
                      <form onSubmit={handleManualScanSubmit} className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                        <QrCode size={16} className="text-slate-400 shrink-0" />
                        <input
                          value={manualScanInput}
                          onChange={e => setManualScanInput(e.target.value)}
                          placeholder="Or type roll barcode (e.g. 260731-11.04.04) and press Enter..."
                          disabled={isProcessingScan}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!manualScanInput.trim() || isProcessingScan}
                          className="btn btn-primary text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                          Verify Roll
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Rolls Table for Active Shipment */}
                  <div className="card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Rolls in Shipment ({activeShipment.rolls.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {activeShipment.checked_rolls} of {activeShipment.total_rolls} checked
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold">
                            <th className="pb-2 pl-1">Roll Number</th>
                            <th className="pb-2">Grade & GSM</th>
                            <th className="pb-2">Weight</th>
                            <th className="pb-2">Location</th>
                            <th className="pb-2">QC Status</th>
                            <th className="pb-2 text-right pr-1">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeShipment.rolls.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-slate-400">
                                No rolls assigned to this shipment.
                              </td>
                            </tr>
                          ) : activeShipment.rolls.map((r, idx) => {
                            const isPassed = r.qc_status === 'passed'
                            const isReplace = r.qc_status === 'rejected_replace'
                            const isPending = r.qc_status === 'pending'
                            const isShipmentCanceled = activeShipment.status === 'canceled'

                            return (
                              <tr key={r.id || idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 pl-1 font-bold text-slate-900 font-mono">
                                  {r.no_roll}
                                </td>
                                <td className="py-3 text-slate-700">
                                  <span className="font-semibold text-slate-900">{r.grade}</span>
                                  <span className="text-[11px] text-slate-500 block">{r.gsm} GSM</span>
                                </td>
                                <td className="py-3 text-slate-700 font-medium">
                                  {r.weight ? r.weight.toLocaleString('id-ID') : 0} kg
                                </td>
                                <td className="py-3">
                                  <span className="inline-block font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                                    {r.location || '—'}
                                  </span>
                                </td>
                                <td className="py-3">
                                  {isPassed ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-green-200">
                                        <CheckCircle2 size={12} /> Passed
                                      </span>
                                      {r.qc_notes && (
                                        <div className="text-[10px] text-slate-500 italic truncate max-w-[150px]" title={r.qc_notes}>
                                          {r.qc_notes}
                                        </div>
                                      )}
                                      {r.qc_checked_at && (
                                        <div className="text-[9px] text-slate-400">{r.qc_checked_at}</div>
                                      )}
                                    </div>
                                  ) : isReplace ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-red-200">
                                        <XCircle size={12} /> Replace Requested
                                      </span>
                                      {r.qc_notes && (
                                        <div className="text-[10px] text-red-600 truncate max-w-[150px]" title={r.qc_notes}>
                                          {r.qc_notes}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-200">
                                      <Clock size={12} /> Pending Scan
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-right pr-1">
                                  {isQC && isPending && !isShipmentCanceled ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleManualPassRoll(r)}
                                        disabled={isProcessingScan}
                                        className="btn btn-sm bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors"
                                        title="Mark roll as passed"
                                      >
                                        Pass
                                      </button>
                                      <button
                                        onClick={() => openRejectModal(r)}
                                        disabled={isProcessingScan}
                                        className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors"
                                        title="Report defect or roll issue"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : !isQC && !isShipmentCanceled && isPending ? (
                                    <button
                                      onClick={() => handleCancelRollFromShipment(r)}
                                      className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ml-auto"
                                      title="Remove roll from this shipment"
                                    >
                                      <Trash2 size={11} />
                                      Remove
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200">
                  <Package size={40} className="mx-auto opacity-30 text-slate-400" />
                  <h4 className="text-sm font-bold text-slate-600">No Shipment Selected</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Select a shipment from the list on the left to inspect rolls or manage the order.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Create Shipment Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-5 bg-white rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Truck size={17} className="text-blue-600" />
                Create New Shipment
              </h3>
              <button onClick={() => setShowShipmentModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={shipmentForm.customers_id}
                  onChange={e => setShipmentForm(f => ({ ...f, customers_id: e.target.value }))}
                  className="form-input w-full text-xs"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.customer}</option>
                  ))}
                </select>
                {shipmentErrors.customers_id && <p className="text-red-600 text-[11px] mt-0.5">{shipmentErrors.customers_id}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Assign QC Officer <span className="text-red-500">*</span>
                </label>
                <select
                  value={shipmentForm.qc_users_id}
                  onChange={e => setShipmentForm(f => ({ ...f, qc_users_id: e.target.value }))}
                  className="form-input w-full text-xs"
                >
                  <option value="">-- Choose QC Officer --</option>
                  {qcUsers.map(qc => (
                    <option key={qc.id} value={qc.id}>{qc.username || qc.name || `QC User #${qc.id}`}</option>
                  ))}
                </select>
                {shipmentErrors.qc_users_id && <p className="text-red-600 text-[11px] mt-0.5">{shipmentErrors.qc_users_id}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Shipment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={shipmentForm.shipment_date}
                  onChange={e => setShipmentForm(f => ({ ...f, shipment_date: e.target.value }))}
                  className="form-input w-full text-xs"
                />
                {shipmentErrors.shipment_date && <p className="text-red-600 text-[11px] mt-0.5">{shipmentErrors.shipment_date}</p>}
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Package size={14} className="text-blue-600 shrink-0" />
                  <span>{checkedRollIds.length} Rolls Selected</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-1">
                  These rolls will be bundled into a new shipment order and assigned to the selected QC Officer for verification.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn btn-secondary text-xs px-3.5 py-1.5"
                onClick={() => setShowShipmentModal(false)}
                disabled={isSubmittingShipment}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                onClick={handleConfirmShipments}
                disabled={isSubmittingShipment}
              >
                {isSubmittingShipment ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. QC Reject Decision Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-5 bg-white rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 text-red-600">
                  <AlertTriangle size={16} />
                  Reject Roll QC Inspection
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Roll: {rejectForm.roll_display}</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1.5">Action & Resolution</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-colors ${rejectForm.reject_type === 'replace' ? 'bg-red-50/80 border-red-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      className="mt-1 text-red-600 accent-red-600"
                      name="reject_type"
                      value="replace"
                      checked={rejectForm.reject_type === 'replace'}
                      onChange={e => setRejectForm(f => ({ ...f, reject_type: e.target.value as any }))}
                    />
                    <div>
                      <div className="text-xs font-bold text-red-900">Meminta Ganti (Replace)</div>
                      <div className="text-[11px] text-slate-500">Roll is damaged/defective and unfit for shipping. It will be flagged for a replacement JOP.</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-colors ${rejectForm.reject_type === 'fixed' ? 'bg-green-50/80 border-green-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      className="mt-1 text-green-600 accent-green-600"
                      name="reject_type"
                      value="fixed"
                      checked={rejectForm.reject_type === 'fixed'}
                      onChange={e => setRejectForm(f => ({ ...f, reject_type: e.target.value as any }))}
                    />
                    <div>
                      <div className="text-xs font-bold text-green-900">Fixed Locally (Fixed)</div>
                      <div className="text-[11px] text-slate-500">Minor damage has been fixed locally by QC. Roll status is now Passed.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Catatan / Keterangan (Optional)</label>
                <textarea
                  className="form-input w-full text-xs"
                  rows={2}
                  value={rejectForm.notes}
                  onChange={e => setRejectForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Description of damage or repair action..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="btn btn-secondary text-xs px-3 py-1.5"
                onClick={() => setShowRejectModal(false)}
                disabled={isSubmittingReject}
              >
                Cancel
              </button>
              <button
                className={`btn text-xs px-4 py-1.5 text-white font-bold cursor-pointer transition-colors ${rejectForm.reject_type === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                onClick={submitReject}
                disabled={isSubmittingReject}
              >
                {isSubmittingReject ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Roll Modal */}
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
                <select
                  className="form-input w-full bg-white border border-slate-300 rounded-lg shadow-sm"
                  value={editForm.visual}
                  onChange={e => setEditForm(f => ({ ...f, visual: e.target.value }))}
                >
                  <option value="OK">OK</option>
                  <option value="PKP">PKP</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>
              
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Roll Status</label>
                <select
                  className="form-input w-full bg-white border border-slate-300 rounded-lg shadow-sm disabled:bg-slate-100 disabled:opacity-75 disabled:cursor-not-allowed"
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  disabled={!isQC && editingRoll?.roll_status === 'HOLD'}
                >
                  <option value="OK">OK</option>
                  <option value="HOLD">HOLD</option>
                </select>
                {!isQC && editingRoll?.roll_status === 'HOLD' && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    Only QC can release HOLD status
                  </p>
                )}
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

      {/* 4. SPECTRUM AI Slot Selector Modal */}
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

      {/* 5. QR Code Scanner Camera Modal (For Storage tab) */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleStorageQRScanSuccess}
      />

      {/* 6. QC Security Lockout & Account Suspension Modal */}
      {showSuspendedModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl space-y-4 border-2 border-red-500 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                AKUN DITANGGUHKAN
              </h3>
              <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-0.5 rounded-full mt-1 inline-block">
                Security Lockout Activated
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              The system detected <strong>10 consecutive barcode scan errors</strong> in this inspection session. To maintain warehouse integrity and prevent shipment anomalies, your account session has been <strong>suspended</strong>.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium text-left flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Please <strong>contact the Administrator</strong> to verify physical rolls and restore your account access.</span>
            </div>
            <button
              onClick={() => {
                router.post('/logout', {}, {
                  onFinish: () => {
                    window.location.href = '/login?suspended=1'
                  }
                })
              }}
              className="btn btn-primary w-full py-2.5 font-bold text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>OK, I Understand (Log Out)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
