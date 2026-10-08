import React from 'react'
import { Truck, X, Package } from 'lucide-react'

interface RollInventory_CreateShipmentModalProps {
  isOpen: boolean
  onClose: () => void
  shipmentForm: {
    customers_id: string[]
    qc_users_id: string
    shipment_date: string
  }
  setShipmentForm: React.Dispatch<React.SetStateAction<{
    customers_id: string[]
    qc_users_id: string
    shipment_date: string
  }>>
  shipmentErrors: Record<string, string>
  customers: { id: number; customer: string }[]
  qcUsers: { id: number; username?: string; name?: string }[]
  checkedRollIds: string[]
  isSubmittingShipment: boolean
  onConfirm: () => void
}

export default function RollInventory_CreateShipmentModal({
  isOpen,
  onClose,
  shipmentForm,
  setShipmentForm,
  shipmentErrors,
  customers,
  qcUsers,
  checkedRollIds,
  isSubmittingShipment,
  onConfirm,
}: RollInventory_CreateShipmentModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-5 bg-white rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Truck size={17} className="text-blue-600" />
            Create New Shipment
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 text-sm">
          <div>
            <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
              Select Customer(s) <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {shipmentForm.customers_id.map((customerId, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={customerId}
                    onChange={e => {
                      const newCustomers = [...shipmentForm.customers_id];
                      newCustomers[index] = e.target.value;
                      setShipmentForm(f => ({ ...f, customers_id: newCustomers }));
                    }}
                    className="form-input w-full text-xs"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.customer}</option>
                    ))}
                  </select>
                  {shipmentForm.customers_id.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newCustomers = shipmentForm.customers_id.filter((_, i) => i !== index);
                        setShipmentForm(f => ({ ...f, customers_id: newCustomers }));
                      }}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-md cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShipmentForm(f => ({ ...f, customers_id: [...f.customers_id, ''] }))}
                className="text-blue-600 text-[11px] font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                + Add Customer
              </button>
            </div>
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
            onClick={onClose}
            disabled={isSubmittingShipment}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            onClick={onConfirm}
            disabled={isSubmittingShipment}
          >
            {isSubmittingShipment ? 'Creating...' : 'Create Shipment'}
          </button>
        </div>
      </div>
    </div>
  )
}
