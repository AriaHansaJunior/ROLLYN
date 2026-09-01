import { useState } from 'react'
import { Calendar, PackageCheck, FileText, X } from 'lucide-react'
import { router } from '@inertiajs/react'

interface Roll {
  id: number
  no: number
  no_roll: string
  grade: string
  gsm: number
  width: number
  length: number
  weight: number
  joint: number
  type: string
  core: string
  status: string
  locations_id: number | null
}

interface ShipmentRoll {
  id: number
  roll_no: number
  qc_status: string
  qc_notes: string | null
  qc_checked_at: string | null
  roll: Roll
}

interface Shipment {
  id: number
  shipment_number: string
  shipment_date: string
  status: string
  customer: { id: number; customer: string }
  admin: { id: number; username: string }
  qc: { id: number; username: string }
  shipment_rolls: ShipmentRoll[]
}

interface Props {
  shipments: Shipment[]
  selectedDate: string
}

export default function ShipmentHistory({ shipments, selectedDate }: Props) {
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(shipments[0] || null)
  const [date, setDate] = useState(selectedDate)
  const [selectedRoll, setSelectedRoll] = useState<Roll | null>(null)

  function handleDateChange(newDate: string) {
    setDate(newDate)
    router.get('/shipment-history', { date: newDate }, { preserveState: true })
    setActiveShipment(null) // Reset active shipment when date changes
  }

  // Effect to select first shipment if activeShipment is null and shipments exist after date change
  if (!activeShipment && shipments.length > 0) {
    setActiveShipment(shipments[0])
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-4 flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Shipment History</h2>
          <p className="text-xs text-slate-500 mt-0.5">View successfully completed shipments by date</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <Calendar size={14} className="text-slate-500" />
          <input 
            type="date" 
            className="border-none outline-none text-sm bg-transparent font-medium text-slate-700" 
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        {/* Left List: Shipments */}
        <div className="col-span-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-800">Shipments on {date}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {shipments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <PackageCheck size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No completed shipments found.</p>
              </div>
            ) : (
              shipments.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => setActiveShipment(s)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeShipment?.id === s.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-slate-900">{s.shipment_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Completed
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium line-clamp-1">{s.customer?.customer}</div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/50">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <FileText size={10} /> {s.shipment_rolls?.length || 0} Rolls
                    </span>
                    <span className="text-[10px] text-slate-400">QC: {s.qc?.username}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Details: Rolls in Active Shipment */}
        <div className="col-span-1 md:col-span-2 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {activeShipment ? (
            <>
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Shipment Details: {activeShipment.shipment_number}</h3>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <p><span className="font-semibold">Customer:</span> {activeShipment.customer?.customer}</p>
                    <p><span className="font-semibold">Admin:</span> {activeShipment.admin?.username}</p>
                    <p><span className="font-semibold">Total Rolls:</span> {activeShipment.shipment_rolls?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80 backdrop-blur-sm">
                      <th className="py-2.5 px-4 font-semibold">Roll No</th>
                      <th className="py-2.5 px-4 font-semibold">Grade</th>
                      <th className="py-2.5 px-4 font-semibold">GSM</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Weight (kg)</th>
                      <th className="py-2.5 px-4 font-semibold text-center">QC Status</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeShipment.shipment_rolls || []).map(sr => (
                      <tr key={sr.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{sr.roll?.no_roll || sr.roll_no}</td>
                        <td className="py-3 px-4 text-slate-600">{sr.roll?.grade || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{sr.roll?.gsm || '-'}</td>
                        <td className="py-3 px-4 text-slate-600 text-right">{sr.roll?.weight || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sr.qc_status === 'passed' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                            {sr.qc_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => setSelectedRoll(sr.roll)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <PackageCheck size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-semibold text-slate-500">Select a shipment to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Roll Detail Modal */}
      {selectedRoll && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-0 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Roll Details</h3>
                <p className="text-xs text-slate-500">No: {selectedRoll.no_roll}</p>
              </div>
              <button onClick={() => setSelectedRoll(null)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Grade</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.grade}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GSM</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.gsm}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Width (cm)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.width}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Length (m)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Weight (kg)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.weight}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Joint</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.joint}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{selectedRoll.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Core</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{selectedRoll.core}</p>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => setSelectedRoll(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
