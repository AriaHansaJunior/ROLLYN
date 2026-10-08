import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface RollInventory_QcRejectModalProps {
  isOpen: boolean
  onClose: () => void
  rejectForm: {
    roll_id: number | null
    roll_display: string
    reject_type: 'replace' | 'fixed'
    notes: string
  }
  setRejectForm: React.Dispatch<React.SetStateAction<{
    roll_id: number | null
    roll_display: string
    reject_type: 'replace' | 'fixed'
    notes: string
  }>>
  isSubmittingReject: boolean
  onSubmit: () => void
}

export default function RollInventory_QcRejectModal({
  isOpen,
  onClose,
  rejectForm,
  setRejectForm,
  isSubmittingReject,
  onSubmit,
}: RollInventory_QcRejectModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="card w-full max-w-[95vw] sm:max-w-lg md:max-w-xl p-6 sm:p-7 bg-white rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              Reject Roll QC Inspection
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">Roll: {rejectForm.roll_display}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-2">Action & Resolution</label>
            <div className="space-y-2.5">
              <label className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${rejectForm.reject_type === 'replace' ? 'bg-red-50/80 border-red-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  className="mt-1 text-red-600 accent-red-600 w-4 h-4"
                  name="reject_type"
                  value="replace"
                  checked={rejectForm.reject_type === 'replace'}
                  onChange={e => setRejectForm(f => ({ ...f, reject_type: e.target.value as any }))}
                />
                <div>
                  <div className="text-sm font-bold text-red-900">Request Replacement (Replace)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Roll is damaged/defective and unfit for shipping. It will be flagged for a replacement JOP.</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${rejectForm.reject_type === 'fixed' ? 'bg-green-50/80 border-green-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  className="mt-1 text-green-600 accent-green-600 w-4 h-4"
                  name="reject_type"
                  value="fixed"
                  checked={rejectForm.reject_type === 'fixed'}
                  onChange={e => setRejectForm(f => ({ ...f, reject_type: e.target.value as any }))}
                />
                <div>
                  <div className="text-sm font-bold text-green-900">Fixed Locally (Fixed)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Minor damage has been fixed locally by QC. Roll status is now Passed.</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Notes / Remarks (Optional)</label>
            <textarea
              className="form-input w-full text-sm rounded-lg p-3"
              rows={3}
              value={rejectForm.notes}
              onChange={e => setRejectForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Description of damage or repair action..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            className="btn btn-secondary text-sm px-4 py-2.5 rounded-lg"
            onClick={onClose}
            disabled={isSubmittingReject}
          >
            Cancel
          </button>
          <button
            className={`btn text-sm px-6 py-2.5 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm ${rejectForm.reject_type === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            onClick={onSubmit}
            disabled={isSubmittingReject}
          >
            {isSubmittingReject ? 'Submitting...' : 'Confirm Decision'}
          </button>
        </div>
      </div>
    </div>
  )
}
