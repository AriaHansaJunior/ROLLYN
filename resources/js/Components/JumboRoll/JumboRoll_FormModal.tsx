import React from 'react'
import { Disc, X } from 'lucide-react'
import { JopOption, JumboRollFormState } from './JumboRoll_types'

interface JumboRoll_FormModalProps {
  isOpen: boolean
  onClose: () => void
  editingId: number | null
  form: JumboRollFormState
  setForm: React.Dispatch<React.SetStateAction<JumboRollFormState>>
  formErrors: Record<string, string>
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  jopList: JopOption[]
  currentSelectedJop?: JopOption
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function JumboRoll_FormModal({
  isOpen,
  onClose,
  editingId,
  form,
  setForm,
  formErrors,
  setFormErrors,
  jopList,
  currentSelectedJop,
  saving,
  onSubmit,
}: JumboRoll_FormModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Disc size={22} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {editingId ? 'Edit Jumbo Roll' : 'Register New Jumbo Roll'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Record the initial large paper roll entering production
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="p-5 sm:p-7 space-y-5 overflow-y-auto">
          {/* JOP Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Associated JOP <span className="text-red-500">*</span>
            </label>
            <select
              value={form.jops_id}
              onChange={(e) => {
                setForm((f) => ({ ...f, jops_id: e.target.value }))
                if (formErrors.jops_id) setFormErrors((err) => ({ ...err, jops_id: '' }))
              }}
              className={`form-input w-full h-11 text-sm rounded-lg px-3.5 ${formErrors.jops_id ? 'border-red-500' : ''}`}
            >
              <option value="">-- Select JOP --</option>
              {jopList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jop} ({j.spk}) — {j.customer} — {j.grade} {j.gsm ? `${j.gsm} GSM` : ''}
                </option>
              ))}
            </select>
            {formErrors.jops_id && (
              <p className="text-red-600 text-xs mt-1">{formErrors.jops_id}</p>
            )}
          </div>

          {/* Auto-populated JOP Info Preview */}
          {currentSelectedJop && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-100 rounded-xl text-xs sm:text-sm">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  SPK / PO
                </span>
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  {currentSelectedJop.spk}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Customer
                </span>
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  {currentSelectedJop.customer}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Grade & GSM
                </span>
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  {currentSelectedJop.grade} {currentSelectedJop.gsm ? `${currentSelectedJop.gsm}g` : ''}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Target Weight
                </span>
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  {currentSelectedJop.weight ? `${currentSelectedJop.weight} kg` : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Jumbo Roll Number & Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Jumbo Roll Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. JR-001"
                value={form.jumbo_roll_number}
                onChange={(e) => {
                  setForm((f) => ({ ...f, jumbo_roll_number: e.target.value }))
                  if (formErrors.jumbo_roll_number)
                    setFormErrors((err) => ({ ...err, jumbo_roll_number: '' }))
                }}
                className={`form-input w-full h-11 text-sm sm:text-base font-mono font-bold rounded-lg px-3.5 ${
                  formErrors.jumbo_roll_number ? 'border-red-500' : ''
                }`}
              />
              {formErrors.jumbo_roll_number ? (
                <p className="text-red-600 text-xs mt-1">
                  {formErrors.jumbo_roll_number}
                </p>
              ) : (
                <p className="text-slate-400 text-xs mt-1">
                  Unique identifier for this jumbo paper roll
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Jumbo Roll Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 18500"
                value={form.weight}
                onChange={(e) => {
                  setForm((f) => ({ ...f, weight: e.target.value }))
                  if (formErrors.weight) setFormErrors((err) => ({ ...err, weight: '' }))
                }}
                className={`form-input w-full h-11 text-sm sm:text-base font-mono rounded-lg px-3.5 ${
                  formErrors.weight ? 'border-red-500' : ''
                }`}
              />
              {formErrors.weight ? (
                <p className="text-red-600 text-xs mt-1">{formErrors.weight}</p>
              ) : (
                <p className="text-slate-400 text-xs mt-1">
                  {form.weight && parseFloat(form.weight) > 0
                    ? `Equivalent to ${(parseFloat(form.weight) / 1000).toFixed(2)} Metric Tons`
                    : 'Weight in kilograms (typically 15,000–20,000 kg)'}
                </p>
              )}
            </div>
          </div>

          {/* Production Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Production Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.production_date}
                onChange={(e) => {
                  setForm((f) => ({ ...f, production_date: e.target.value }))
                  if (formErrors.production_date)
                    setFormErrors((err) => ({ ...err, production_date: '' }))
                }}
                className={`form-input w-full h-11 text-sm rounded-lg px-3.5 ${
                  formErrors.production_date ? 'border-red-500' : ''
                }`}
              />
              {formErrors.production_date && (
                <p className="text-red-600 text-xs mt-1">
                  {formErrors.production_date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="form-input w-full h-11 text-sm rounded-lg px-3.5 font-medium"
              >
                <option value="IN_PROGRESS">In Progress (Cutting / Rewinding)</option>
                <option value="COMPLETED">Completed (Fully Cut)</option>
                <option value="HOLD">On Hold</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Notes & Remarks (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add any production notes, machine details, or cutting instructions..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="form-input w-full text-sm rounded-lg p-3"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-sm px-4 py-2.5 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary text-sm font-bold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingId ? 'Update Jumbo Roll' : 'Register Jumbo Roll'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
