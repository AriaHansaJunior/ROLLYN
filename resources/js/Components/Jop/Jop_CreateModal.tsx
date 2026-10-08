import React from 'react'
import { X, Plus } from 'lucide-react'
import {
  CustomerItem, GradeItem, GsmItem, PlybondItem, ThicknessItem, CoreItem, JopFormState
} from './Jop_types'

interface Jop_CreateModalProps {
  isOpen: boolean
  onClose: () => void
  form: JopFormState
  setForm: React.Dispatch<React.SetStateAction<JopFormState>>
  formErrors: Record<string, string>
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  customers: CustomerItem[]
  customCustomer: string
  setCustomCustomer: (v: string) => void
  gradesList: GradeItem[]
  customGrade: string
  setCustomGrade: (v: string) => void
  gsmsList: GsmItem[]
  customGsm: string
  setCustomGsm: (v: string) => void
  plybondsList: PlybondItem[]
  customPlybond: string
  setCustomPlybond: (v: string) => void
  thicknessesList: ThicknessItem[]
  customThickness: string
  setCustomThickness: (v: string) => void
  coresList: CoreItem[]
  customCore: string
  setCustomCore: (v: string) => void
  onSave: () => void
}

export default function Jop_CreateModal({
  isOpen,
  onClose,
  form,
  setForm,
  formErrors,
  setFormErrors,
  customers,
  customCustomer,
  setCustomCustomer,
  gradesList,
  customGrade,
  setCustomGrade,
  gsmsList,
  customGsm,
  setCustomGsm,
  plybondsList,
  customPlybond,
  setCustomPlybond,
  thicknessesList,
  customThickness,
  setCustomThickness,
  coresList,
  customCore,
  setCustomCore,
  onSave,
}: Jop_CreateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-5 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add Job Order Production</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Enter PPIC order and production specification recommendations</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
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

          {/* Customer Dropdown + Custom Manual Input Option */}
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
              <option value="NEW_CUSTOM" className="font-bold text-blue-600 bg-blue-50">+ Add New / Input Manual...</option>
            </select>
            {form.customers_id === 'NEW_CUSTOM' && (
              <input
                type="text"
                value={customCustomer}
                onChange={e => { setCustomCustomer(e.target.value); if (formErrors.customers_id) setFormErrors(err => ({ ...err, customers_id: '' })) }}
                className="form-input w-full mt-1.5 text-xs border-blue-300 focus:border-blue-500 bg-blue-50/40"
                placeholder="Type new customer name (e.g. PT Surya Indah)..."
              />
            )}
            {formErrors.customers_id && <p className="text-red-600 text-[11px] mt-1">{formErrors.customers_id}</p>}
          </div>

          {/* Rekomendasi Spesifikasi Roll (PPIC) */}
          <div className="pt-3 pb-1 border-t border-slate-200/80">
            {/* Grade, GSM, TPH Target */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px] gap-3">
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
                  <option value="NEW_CUSTOM" className="font-bold text-blue-600 bg-blue-50">+ Add New / Input Manual...</option>
                </select>
                {form.grades_id === 'NEW_CUSTOM' && (
                  <input
                    type="text"
                    value={customGrade}
                    onChange={e => { setCustomGrade(e.target.value); if (formErrors.grades_id) setFormErrors(err => ({ ...err, grades_id: '' })) }}
                    className="form-input w-full mt-1.5 text-xs border-blue-300 focus:border-blue-500 bg-blue-50/40"
                    placeholder="Type new grade name (e.g. SPECTA - TK5)..."
                  />
                )}
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
                  <option value="NEW_CUSTOM" className="font-bold text-blue-600 bg-blue-50">+ Add New / Input Manual...</option>
                </select>
                {form.gsms_id === 'NEW_CUSTOM' && (
                  <input
                    type="number"
                    value={customGsm}
                    onChange={e => { setCustomGsm(e.target.value); if (formErrors.gsms_id) setFormErrors(err => ({ ...err, gsms_id: '' })) }}
                    className="form-input w-full mt-1.5 text-xs border-blue-300 focus:border-blue-500 bg-blue-50/40"
                    placeholder="Type new GSM value (e.g. 180)..."
                  />
                )}
                {formErrors.gsms_id && <p className="text-red-600 text-[11px] mt-1">{formErrors.gsms_id}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">TPH Target</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tph}
                  onChange={e => { setForm(f => ({ ...f, tph: e.target.value })); if (formErrors.tph) setFormErrors(err => ({ ...err, tph: '' })) }}
                  className={`form-input w-full ${formErrors.tph ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="e.g. 5.00"
                />
                {formErrors.tph && <p className="text-red-600 text-[11px] mt-1">{formErrors.tph}</p>}
              </div>
            </div>

            {/* Plybond, Thickness, Core */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Plybond</label>
                <select
                  value={form.plybonds_id}
                  onChange={e => { setForm(f => ({ ...f, plybonds_id: e.target.value })); if (formErrors.plybonds_id) setFormErrors(err => ({ ...err, plybonds_id: '' })) }}
                  className="form-input w-full text-xs"
                >
                  <option value="">Select Plybond</option>
                  {plybondsList.map(p => (
                    <option key={p.id} value={p.id}>{p.plybonds}</option>
                  ))}
                  <option value="NEW_CUSTOM" className="font-bold text-blue-600 bg-blue-50">+ Add New / Manual...</option>
                </select>
                {form.plybonds_id === 'NEW_CUSTOM' && (
                  <input
                    type="number"
                    value={customPlybond}
                    onChange={e => setCustomPlybond(e.target.value)}
                    className="form-input w-full mt-1.5 text-xs border-blue-300 focus:border-blue-500 bg-blue-50/40"
                    placeholder="e.g. 400..."
                  />
                )}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Thickness</label>
                <select
                  value={form.thicknesses_id}
                  onChange={e => { setForm(f => ({ ...f, thicknesses_id: e.target.value })); if (formErrors.thicknesses_id) setFormErrors(err => ({ ...err, thicknesses_id: '' })) }}
                  className="form-input w-full text-xs"
                >
                  <option value="">Select Thickness</option>
                  {thicknessesList.map(t => (
                    <option key={t.id} value={t.id}>{t.thickness}</option>
                  ))}
                  <option value="NEW_CUSTOM" className="font-bold text-blue-600 bg-blue-50">+ Add New / Manual...</option>
                </select>
                {form.thicknesses_id === 'NEW_CUSTOM' && (
                  <input
                    type="number"
                    value={customThickness}
                    onChange={e => setCustomThickness(e.target.value)}
                    className="form-input w-full mt-1.5 text-xs border-blue-300 focus:border-blue-500 bg-blue-50/40"
                    placeholder="e.g. 600..."
                  />
                )}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Core</label>
                <select
                  value={form.cores_id}
                  onChange={e => { setForm(f => ({ ...f, cores_id: e.target.value })); if (formErrors.cores_id) setFormErrors(err => ({ ...err, cores_id: '' })) }}
                  className="form-input w-full text-xs"
                >
                  <option value="">Select Core</option>
                  {coresList.map(c => (
                    <option key={c.id} value={c.id}>{c.core}&quot;</option>
                  ))}
                  <option value="NEW_CUSTOM" className="font-bold text-blue-600 bg-blue-50">+ Add New / Manual...</option>
                </select>
                {form.cores_id === 'NEW_CUSTOM' && (
                  <input
                    type="text"
                    value={customCore}
                    onChange={e => setCustomCore(e.target.value)}
                    className="form-input w-full mt-1.5 text-xs border-blue-300 focus:border-blue-500 bg-blue-50/40"
                    placeholder="e.g. 3 or 76..."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Dynamic RW Targets Input */}
          <div className="pt-2">
            <label className="form-label text-xs font-semibold text-slate-700 block mb-2">RW Targets <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {form.rw_targets.map((tgt, idx) => (
                <div key={tgt.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={tgt.width}
                      onChange={(e) => {
                        const newTargets = [...form.rw_targets]
                        newTargets[idx].width = e.target.value
                        setForm(f => ({ ...f, rw_targets: newTargets }))
                        if (formErrors[`rw_targets_${idx}`]) setFormErrors(err => ({ ...err, [`rw_targets_${idx}`]: '' }))
                      }}
                      className={`form-input w-full text-xs ${formErrors[`rw_targets_${idx}`] ? 'border-red-500' : ''}`}
                      placeholder="e.g. 1200..."
                    />
                    {formErrors[`rw_targets_${idx}`] && <p className="text-red-600 text-[10px] mt-0.5">{formErrors[`rw_targets_${idx}`]}</p>}
                  </div>
                  <div className="w-[100px]">
                    <input
                      type="number"
                      min="1"
                      value={tgt.quantity}
                      onChange={(e) => {
                        const newTargets = [...form.rw_targets]
                        newTargets[idx].quantity = e.target.value
                        setForm(f => ({ ...f, rw_targets: newTargets }))
                        if (formErrors[`rw_targets_${idx}_qty`]) setFormErrors(err => ({ ...err, [`rw_targets_${idx}_qty`]: '' }))
                      }}
                      className={`form-input w-full text-xs ${formErrors[`rw_targets_${idx}_qty`] ? 'border-red-500' : ''}`}
                      placeholder="Rolls"
                    />
                    {formErrors[`rw_targets_${idx}_qty`] && <p className="text-red-600 text-[10px] mt-0.5">{formErrors[`rw_targets_${idx}_qty`]}</p>}
                  </div>
                  {form.rw_targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newTargets = form.rw_targets.filter((_, i) => i !== idx)
                        setForm(f => ({ ...f, rw_targets: newTargets }))
                      }}
                      className="btn btn-secondary p-1.5 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, rw_targets: [...f.rw_targets, { id: Date.now(), width: '', quantity: '1' }] }))}
              className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add another RW
            </button>
            {formErrors.quantity && <p className="text-red-600 text-[11px] mt-1">{formErrors.quantity}</p>}
          </div>

          {/* Notes Input */}
          <div>
            <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Notes / Remarks (Optional)</label>
            <textarea
              value={form.noted_order}
              onChange={e => setForm(f => ({ ...f, noted_order: e.target.value }))}
              className="form-input w-full min-h-[60px]"
              placeholder="Special instructions / notes for roll target combination..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary text-xs px-3 py-1.5" onClick={onSave}>
            Save JOP
          </button>
        </div>
      </div>
    </div>
  )
}
