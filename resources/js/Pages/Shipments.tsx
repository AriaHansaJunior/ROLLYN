import { useState } from 'react'
import { Search, Camera, CheckCircle2, XCircle, Clock, PackageCheck } from 'lucide-react'
import { router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import EmbeddedQRScanner from '@/Components/EmbeddedQRScanner'

interface ShipmentRoll {
  id: number
  roll_no: number
  no_roll: string
  grade: string
  gsm: number
  qc_status: string
  qc_notes: string | null
  qc_checked_at: string | null
}

interface Shipment {
  id: number
  shipment_number: string
  customer: string
  date: string
  status: string
  total_rolls: number
  checked_rolls: number
  rolls: ShipmentRoll[]
}

interface Props {
  shipments: Shipment[]
}

export default function Shipments({ shipments }: Props) {
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(shipments[0] || null)
  const [search, setSearch] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectForm, setRejectForm] = useState({
    shipment_id: '',
    roll_no: '',
    reject_type: 'replace',
    notes: ''
  })

  function handleScan(scannedData: string) {
    if (!activeShipment) return

    let rollNo = scannedData.trim()
    try {
      const parsed = JSON.parse(scannedData)
      if (parsed && typeof parsed === 'object') {
        rollNo = String(parsed.roll || parsed.no_roll || rollNo)
      }
    } catch (e) {}

    // Find the roll in the active shipment
    const roll = activeShipment.rolls.find(r => r.no_roll.toLowerCase() === rollNo.toLowerCase() || String(r.roll_no) === rollNo)

    if (roll) {
      if (roll.qc_status === 'passed') {
        SystemUI.toast({ message: 'Roll already passed QC.', type: 'info' })
        return
      }

      router.post('/shipments/qc/scan', {
        shipment_id: activeShipment.id,
        no_roll: roll.no_roll
      }, {
        preserveScroll: true,
        onSuccess: () => {
          SystemUI.toast({ message: `Roll ${roll.no_roll} passed!`, type: 'success' })
          const updated = shipments.find(s => s.id === activeShipment.id)
          if (updated) setActiveShipment(updated)
        },
        onError: () => SystemUI.toast({ message: 'Failed to pass roll.', type: 'error' })
      })
    } else {
      SystemUI.toast({ message: `Roll not found in this shipment.`, type: 'warning' })
    }
  }

  function openReject(roll: ShipmentRoll) {
    setRejectForm({
      shipment_id: String(activeShipment?.id),
      roll_no: String(roll.roll_no),
      reject_type: 'replace',
      notes: ''
    })
    setShowRejectModal(true)
  }

  function submitReject() {
    router.post('/shipments/qc/reject', rejectForm, {
      preserveScroll: true,
      onSuccess: () => {
        SystemUI.toast({ message: 'Roll rejected.', type: 'success' })
        setShowRejectModal(false)
        const updated = shipments.find(s => s.id === activeShipment?.id)
        if (updated) setActiveShipment(updated)
      },
      onError: () => SystemUI.toast({ message: 'Failed to reject roll.', type: 'error' })
    })
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">QC Checking</h2>
          <p className="text-xs text-slate-500 mt-0.5">Scan rolls to verify quality before shipment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sidebar: Shipment List */}
        <div className="col-span-1 space-y-3">
          <div className="card p-3">
            <h3 className="text-sm font-bold text-slate-800 mb-2">My Assigned Shipments</h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {shipments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No pending shipments assigned to you.</p>
              ) : (
                shipments.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => setActiveShipment(s)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeShipment?.id === s.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-900">{s.shipment_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {s.status === 'completed' ? 'Done' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">{s.customer}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-500">{s.date}</span>
                      <span className="text-[10px] font-bold text-blue-600">{s.checked_rolls} / {s.total_rolls} Checked</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Area: Active Shipment details & Scanner */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          {activeShipment ? (
            <>
              {activeShipment.status !== 'completed' && (
                <div className="card p-0 overflow-hidden border border-blue-100">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Camera size={14} /> Scan Roll Barcode</h3>
                  </div>
                  <EmbeddedQRScanner onScanSuccess={handleScan} />
                </div>
              )}

              <div className="card p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Rolls in {activeShipment.shipment_number}</h3>
                  <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-48">
                    <Search size={12} className="text-slate-400" />
                    <input 
                      className="bg-transparent border-none outline-none text-xs w-full" 
                      placeholder="Search roll..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-2 font-semibold">Roll No</th>
                        <th className="pb-2 font-semibold">Grade</th>
                        <th className="pb-2 font-semibold">GSM</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeShipment.rolls.filter(r => r.no_roll.toLowerCase().includes(search.toLowerCase())).map(r => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="py-2.5 font-bold text-slate-800">{r.no_roll}</td>
                          <td className="py-2.5 text-slate-600">{r.grade}</td>
                          <td className="py-2.5 text-slate-600">{r.gsm}</td>
                          <td className="py-2.5">
                            {r.qc_status === 'passed' ? (
                              <span className="flex items-center gap-1 text-green-600 font-semibold text-[10px]"><CheckCircle2 size={12}/> Passed</span>
                            ) : r.qc_status === 'rejected_replace' ? (
                              <span className="flex items-center gap-1 text-red-600 font-semibold text-[10px]"><XCircle size={12}/> Replace</span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-400 font-semibold text-[10px]"><Clock size={12}/> Pending</span>
                            )}
                            {r.qc_notes && <div className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[120px]" title={r.qc_notes}>{r.qc_notes}</div>}
                          </td>
                          <td className="py-2.5 text-right">
                            {r.qc_status === 'pending' && (
                              <button onClick={() => openReject(r)} className="text-red-600 hover:text-red-800 text-[10px] font-bold px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors cursor-pointer">
                                Reject
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-10 flex flex-col items-center justify-center text-slate-400">
              <PackageCheck size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-semibold text-slate-500">Select a shipment from the left to start checking.</p>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-5 bg-white rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Reject Roll</h3>
            
            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Reason / Action</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="radio" className="mt-0.5" name="reject_type" value="replace" checked={rejectForm.reject_type === 'replace'} onChange={e => setRejectForm(f => ({ ...f, reject_type: e.target.value }))} />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Meminta Ganti</div>
                      <div className="text-[10px] text-slate-500">Roll ini rusak parah dan perlu JOP pengganti.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="radio" className="mt-0.5" name="reject_type" value="fixed" checked={rejectForm.reject_type === 'fixed'} onChange={e => setRejectForm(f => ({ ...f, reject_type: e.target.value }))} />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Sudah Diperbaiki Sendiri</div>
                      <div className="text-[10px] text-slate-500">Rusak ringan, sudah diperbaiki di tempat dan siap dikirim (Passed).</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Notes (Optional)</label>
                <textarea 
                  className="form-input w-full text-xs" 
                  rows={2} 
                  value={rejectForm.notes} 
                  onChange={e => setRejectForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional context..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-primary bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 border-red-600" onClick={submitReject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
