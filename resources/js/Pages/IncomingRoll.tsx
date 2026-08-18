import { useState } from 'react'
import { CheckCircle, Save, Scale, Edit3, ArrowLeft, ArrowRight } from 'lucide-react'
import WeightDetectionEngine from '../SPECTRUM/SpectrumWeightDetectionEngine'
import { SystemUI } from '@/Utils/SystemUI'
import { router } from '@inertiajs/react'

const SCALE_ROI = { x: 0, y: 0, width: 1, height: 1 }
const steps = ['Camera & Weight Detection', 'Roll Data Entry', 'Review & Save']

interface WeightState {
  value: number
  display: string
  source: 'ocr' | 'spectrum' | 'manual' | 'none'
}

export default function IncomingRoll() {
  const [step, setStep] = useState(0)
  const [weight, setWeight] = useState<WeightState>({ value: 0, display: '', source: 'none' })

  const [form, setForm] = useState({
    rollNumber: '', formNumber: '', shift: 'A', grade: 'KLB-150',
    gsm: '', plybond: '', thickness: '', bulk: '', width: '',
    diameter: '', core: '76', cobb: '', exMaterial: 'OCC', visual: 'OK', jop: '', pic: '',
  })

  const [errors, setErrors] = useState<{ rollNumber?: string; formNumber?: string; gsm?: string }>({})

  function handleWeightConfirmed(value: number, display: string, source: 'ocr' | 'spectrum' | 'manual') {
    setWeight({ value, display, source })
    setStep(1)
  }

  function validateStep1() {
    const errs: { rollNumber?: string; formNumber?: string; gsm?: string } = {}
    if (!form.rollNumber.trim()) {
      errs.rollNumber = 'Roll number is required.'
    }
    if (!form.formNumber.trim()) {
      errs.formNumber = 'Form number is required.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goToStep2() {
    if (validateStep1()) {
      setStep(2)
    }
  }

  async function handleSave() {
    SystemUI.toast({ message: `Roll ${form.rollNumber || 'data'} saved successfully!`, type: 'success' })
    const confirmed = await SystemUI.confirm({
      title: 'Roll Saved Successfully',
      message: `Roll ${form.rollNumber} has been logged. Would you like to view the Roll Inventory now?`,
      confirmText: 'Go to Inventory',
      cancelText: 'Register Another Roll'
    })

    if (confirmed) {
      router.visit('/roll-inventory')
    } else {
      setStep(0)
      setWeight({ value: 0, display: '', source: 'none' })
      setForm({
        rollNumber: '', formNumber: '', shift: 'A', grade: 'KLB-150',
        gsm: '', plybond: '', thickness: '', bulk: '', width: '',
        diameter: '', core: '76', cobb: '', exMaterial: 'OCC', visual: 'OK', jop: '', pic: '',
      })
    }
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Incoming Roll</h2>
        <p className="text-xs text-slate-500 mt-0.5">Physical roll weight capture and specification logging</p>
      </div>

      {}
      <div className="flex items-center gap-2 w-full lg:max-w-4xl py-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i < step
                    ? 'bg-green-600 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap min-[680px]:inline hidden ${i === step ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-colors ${i < step ? 'bg-green-500' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {}
      {step === 0 && (
        <WeightDetectionEngine
          onWeightConfirmed={handleWeightConfirmed}
          roi={SCALE_ROI}
        />
      )}

      {}
      {step === 1 && (
        <div className="w-full 2xl:max-w-7xl space-y-4 lg:space-y-6">
          {}
          <div className="card p-4">
            <div className="flex items-center justify-between gap-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-xs text-white">
                  <Scale size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Confirmed Roll Weight
                  </div>
                  <div className="text-2xl font-extrabold text-blue-900 font-mono leading-tight">
                    {weight.display} <span className="text-sm font-semibold text-slate-500">kg</span>
                  </div>
                  <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
                    {weight.source === 'ocr' ? (
                      <>
                        <CheckCircle size={12} className="text-green-600 shrink-0" />
                        <span className="text-green-700 font-semibold">Detected via OCR</span>
                      </>
                    ) : (
                      <>
                        <Edit3 size={12} className="text-amber-600 shrink-0" />
                        <span className="text-amber-700 font-semibold">Entered manually by administrator</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm text-xs cursor-pointer shrink-0"
                onClick={() => setStep(0)}
                title="Go back to re-detect weight"
              >
                Re-detect
              </button>
            </div>
          </div>

          {}
          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">Roll Data Entry</h3>
            <div className="grid grid-cols-1 min-[680px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              <div>
                <label className="form-label text-xs font-semibold block mb-1">Roll Number <span className="text-red-500">*</span></label>
                <input
                  value={form.rollNumber}
                  onChange={e => {
                    setForm(f => ({ ...f, rollNumber: e.target.value }))
                    if (errors.rollNumber) setErrors(err => ({ ...err, rollNumber: undefined }))
                  }}
                  className={`form-input w-full ${errors.rollNumber ? 'border-red-500' : ''}`}
                  placeholder="e.g. R-10425"
                />
                {errors.rollNumber && <p className="text-red-600 text-[11px] mt-1">{errors.rollNumber}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Form Number <span className="text-red-500">*</span></label>
                <input
                  value={form.formNumber}
                  onChange={e => {
                    setForm(f => ({ ...f, formNumber: e.target.value }))
                    if (errors.formNumber) setErrors(err => ({ ...err, formNumber: undefined }))
                  }}
                  className={`form-input w-full ${errors.formNumber ? 'border-red-500' : ''}`}
                  placeholder="e.g. F-2241"
                />
                {errors.formNumber && <p className="text-red-600 text-[11px] mt-1">{errors.formNumber}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Shift</label>
                <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} className="form-input w-full">
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Grade</label>
                <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="form-input w-full">
                  {['KLB-125', 'KLB-150', 'KLB-175', 'KLB-200', 'KIA-125', 'KIA-150'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">GSM (g/m²)</label>
                <input type="number" value={form.gsm} onChange={e => setForm(f => ({ ...f, gsm: e.target.value }))} className="form-input w-full" placeholder="e.g. 150" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Plybond</label>
                <input type="number" value={form.plybond} onChange={e => setForm(f => ({ ...f, plybond: e.target.value }))} className="form-input w-full" placeholder="e.g. 1.8" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Thickness (mm)</label>
                <input type="number" value={form.thickness} onChange={e => setForm(f => ({ ...f, thickness: e.target.value }))} className="form-input w-full" placeholder="e.g. 0.22" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Bulk</label>
                <input type="number" value={form.bulk} onChange={e => setForm(f => ({ ...f, bulk: e.target.value }))} className="form-input w-full" placeholder="e.g. 1.47" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Roll Width (mm)</label>
                <input type="number" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} className="form-input w-full" placeholder="e.g. 1650" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Roll Diameter (mm)</label>
                <input type="number" value={form.diameter} onChange={e => setForm(f => ({ ...f, diameter: e.target.value }))} className="form-input w-full" placeholder="e.g. 1120" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Core (mm)</label>
                <input type="number" value={form.core} onChange={e => setForm(f => ({ ...f, core: e.target.value }))} className="form-input w-full" placeholder="e.g. 76" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Cobb</label>
                <input type="number" value={form.cobb} onChange={e => setForm(f => ({ ...f, cobb: e.target.value }))} className="form-input w-full" placeholder="e.g. 68" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Ex Material</label>
                <select value={form.exMaterial} onChange={e => setForm(f => ({ ...f, exMaterial: e.target.value }))} className="form-input w-full">
                  {['OCC', 'NDLKP', 'DIP', 'Mixed'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Visual</label>
                <select value={form.visual} onChange={e => setForm(f => ({ ...f, visual: e.target.value }))} className="form-input w-full">
                  {['OK', 'REJ', 'C/S'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">Job Order Production</label>
                <input value={form.jop} onChange={e => setForm(f => ({ ...f, jop: e.target.value }))} className="form-input w-full" placeholder="e.g. JOP-240710" />
              </div>

              <div>
                <label className="form-label text-xs font-semibold block mb-1">PIC</label>
                <input value={form.pic} onChange={e => setForm(f => ({ ...f, pic: e.target.value }))} className="form-input w-full" placeholder="e.g. Budi Santoso" />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 mt-3 border-t border-slate-100">
              <button className="btn btn-secondary text-xs" onClick={() => setStep(0)}>
                <ArrowLeft size={13} /> <span>Back</span>
              </button>
              <button className="btn btn-primary text-xs" onClick={goToStep2}>
                <span>Review</span> <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {step === 2 && (
        <div className="w-full 2xl:max-w-7xl space-y-4">
          <div className="card p-4 sm:p-6 lg:p-8">
            <h3 className="text-sm sm:text-base lg:text-xl font-extrabold text-slate-900 mb-4 pb-3 border-b border-slate-200">Review & Save</h3>
            <div className="grid grid-cols-1 min-[680px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-2 sm:gap-y-3 lg:gap-y-4 text-xs sm:text-sm lg:text-base">
              {[
                ['Roll Number', form.rollNumber || '(not entered)'],
                ['Form Number', form.formNumber || '(not entered)'],
                ['Shift', form.shift],
                ['Grade', form.grade],
                ['GSM', form.gsm ? `${form.gsm} g/m²` : '(not entered)'],
                ['Weight', `${weight.display} kg`],
                ['Plybond', form.plybond || '(not entered)'],
                ['Thickness', form.thickness ? `${form.thickness} mm` : '(not entered)'],
                ['Roll Width', form.width ? `${form.width} mm` : '(not entered)'],
                ['Diameter', form.diameter ? `${form.diameter} mm` : '(not entered)'],
                ['Core', `${form.core} mm`],
                ['Cobb', form.cobb || '(not entered)'],
                ['Ex Material', form.exMaterial],
                ['Visual', form.visual],
                ['Job Order Production', form.jop || '(not entered)'],
                ['PIC', form.pic || '(not entered)'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2 lg:py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className={`font-semibold text-right ${value.includes('(not entered)') ? 'text-amber-600' : 'text-slate-900'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-slate-200">
              <button className="btn btn-secondary text-xs sm:text-sm px-4 py-2 lg:px-6 lg:py-2.5" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> <span>Edit</span>
              </button>
              <button className="btn btn-primary text-xs sm:text-sm px-4 py-2 lg:px-6 lg:py-2.5" onClick={handleSave}>
                <Save size={16} /> <span>Save Roll</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
