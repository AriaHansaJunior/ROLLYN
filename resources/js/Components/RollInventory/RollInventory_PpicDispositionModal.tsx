import React from 'react'
import { RotateCcw, X, Truck, XCircle, Scale } from 'lucide-react'

interface RollInventory_PpicDispositionModalProps {
  isOpen: boolean
  onClose: () => void
  roll: any
  status: 'shipped' | 'reject' | 'reweigh' | 'reproduce_again'
  setStatus: (status: 'shipped' | 'reject' | 'reweigh' | 'reproduce_again') => void
  notes: string
  setNotes: (notes: string) => void
  isSubmitting: boolean
  onSubmit: () => void
}

export default function RollInventory_PpicDispositionModal({
  isOpen,
  onClose,
  roll,
  status,
  setStatus,
  notes,
  setNotes,
  isSubmitting,
  onSubmit,
}: RollInventory_PpicDispositionModalProps) {
  if (!isOpen || !roll) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="card w-full max-w-[95vw] sm:max-w-lg md:max-w-xl p-6 sm:p-7 bg-white rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 text-blue-600">
              <RotateCcw size={20} />
              Re-production Disposition (PPIC)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
              Roll: {roll.no_roll || roll.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-2">
              Disposition Choice for Re-produced Roll
            </label>
            <div className="space-y-2.5">
              <label className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${status === 'shipped' ? 'bg-emerald-50/80 border-emerald-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  className="mt-1 text-emerald-600 accent-emerald-600 w-4 h-4"
                  name="ppic_disposition"
                  value="shipped"
                  checked={status === 'shipped'}
                  onChange={() => setStatus('shipped')}
                />
                <div>
                  <div className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                    <Truck size={14} /> Shipped
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Roll has been successfully re-produced and is approved for shipping.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${status === 'reject' ? 'bg-red-50/80 border-red-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  className="mt-1 text-red-600 accent-red-600 w-4 h-4"
                  name="ppic_disposition"
                  value="reject"
                  checked={status === 'reject'}
                  onChange={() => setStatus('reject')}
                />
                <div>
                  <div className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                    <XCircle size={14} /> Reject
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Roll remains defective/unfit and is rejected / scrapped.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${status === 'reweigh' ? 'bg-amber-50/80 border-amber-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  className="mt-1 text-amber-600 accent-amber-600 w-4 h-4"
                  name="ppic_disposition"
                  value="reweigh"
                  checked={status === 'reweigh'}
                  onChange={() => setStatus('reweigh')}
                />
                <div>
                  <div className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <Scale size={14} /> Reweigh
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Roll requires re-weighing verification before final determination.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${status === 'reproduce_again' ? 'bg-purple-50/80 border-purple-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  className="mt-1 text-purple-600 accent-purple-600 w-4 h-4"
                  name="ppic_disposition"
                  value="reproduce_again"
                  checked={status === 'reproduce_again'}
                  onChange={() => setStatus('reproduce_again')}
                />
                <div>
                  <div className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                    <RotateCcw size={14} /> Reproduce Again
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Roll needs another round of re-production by the production team.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">
              PPIC Notes / Remarks (Optional)
            </label>
            <textarea
              className="form-input w-full text-sm rounded-lg p-3"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes for production or shipping..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            className="btn btn-secondary text-sm px-4 py-2.5 rounded-lg"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary text-sm px-6 py-2.5 font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Confirm Disposition'}
          </button>
        </div>
      </div>
    </div>
  )
}
