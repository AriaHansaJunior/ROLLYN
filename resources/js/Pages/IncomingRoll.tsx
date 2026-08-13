import { useState } from 'react'
import { CheckCircle, Save, Scale, Edit3 } from 'lucide-react'
import WeightDetectionEngine from '../OCR/WeightDetectionEngine'

// ─── ROI Configuration ────────────────────────────────────────────────────────
//
// Adjust these values once the camera is physically mounted above the scale:
//
//   x      — left edge of scale display as fraction of frame width  (0–1)
//   y      — top edge of scale display as fraction of frame height  (0–1)
//   width  — display width  as fraction of frame width   (0–1)
//   height — display height as fraction of frame height  (0–1)
//
// Example: scale display occupies centre horizontal band of frame:
//   { x: 0.05, y: 0.25, width: 0.90, height: 0.50 }
//
// Default (full frame — safe starting point during development):
const SCALE_ROI = { x: 0, y: 0, width: 1, height: 1 }

// ─────────────────────────────────────────────────────────────────────────────

const steps = ['Camera & Weight Detection', 'Roll Data Entry', 'Review & Save']

interface WeightState {
  value: number
  display: string
  source: 'ocr' | 'manual' | 'none'
}

export default function IncomingRoll() {
  const [step, setStep] = useState(0)

  // Persisted weight — survives step navigation until final Save
  const [weight, setWeight] = useState<WeightState>({ value: 0, display: '', source: 'none' })

  // Roll data form
  const [form, setForm] = useState({
    rollNumber: '', formNumber: '', shift: 'A', grade: 'KLB-150',
    gsm: '', plybond: '', thickness: '', bulk: '', width: '',
    diameter: '', core: '76', cobb: '', exMaterial: 'OCC', visual: 'OK', jop: '', pic: '',
  })

  const [saved, setSaved] = useState(false)

  // Called by WeightDetectionEngine when administrator confirms the weight
  function handleWeightConfirmed(value: number, display: string, source: 'ocr' | 'manual') {
    setWeight({ value, display, source })
    setStep(1)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function Field({ label, name, type = 'text', options }: {
    label: string; name: keyof typeof form; type?: string; options?: string[]
  }) {
    return (
      <div>
        <label className="form-label">{label}</label>
        {options ? (
          <select value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} className="form-input">
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} className="form-input" placeholder={`Enter ${label.toLowerCase()}`} />
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 20 }}>Incoming Roll</h2>

      {/* ── Step Indicator ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#5CB85C' : i === step ? '#286090' : '#EEEEEE',
                color: i <= step ? '#fff' : '#777',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? '#286090' : '#777', whiteSpace: 'nowrap' }} className="max-[679px]:hidden">{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#5CB85C' : '#EEEEEE', margin: '0 12px' }} />}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          STEP 0: Camera & Weight Detection
          WeightDetectionEngine handles the entire camera
          + OCR lifecycle. IncomingRoll only receives the
          confirmed weight via onWeightConfirmed().
          ════════════════════════════════════════════════════ */}
      {step === 0 && (
        <WeightDetectionEngine
          onWeightConfirmed={handleWeightConfirmed}
          roi={SCALE_ROI}
        />
      )}

      {/* ════════════════════════════════════════════════════
          STEP 1: Roll Data Entry
          Weight is prominently displayed and persisted.
          ════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={{ maxWidth: 900 }}>

          {/* ── Prominent Weight Display ── */}
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f3fc 100%)',
              border: '1px solid #c5dff5',
              borderRadius: 8,
            }}>
              {/* Scale icon */}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #286090, #337ab7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(40,96,144,0.3)',
              }}>
                <Scale size={22} color="#fff" />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  Roll Weight
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#286090', fontFamily: 'JetBrains Mono, Consolas, monospace', lineHeight: 1 }}>
                  {weight.display} <span style={{ fontSize: 16, fontWeight: 600, color: '#555' }}>kg</span>
                </div>
                <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {weight.source === 'ocr' ? (
                    <><CheckCircle size={10} style={{ color: '#5CB85C' }} />
                    <span style={{ color: '#5CB85C' }}>Detected by OCR</span></>
                  ) : (
                    <><Edit3 size={10} style={{ color: '#F0AD4E' }} />
                    <span style={{ color: '#F0AD4E' }}>Entered manually by administrator</span></>
                  )}
                </div>
              </div>

              {/* Back to re-detect */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setStep(0)}
                title="Go back to re-detect weight"
                style={{ fontSize: 11 }}
              >
                Re-detect
              </button>
            </div>
          </div>

          {/* ── Roll Data Form ── */}
          <div className="card" style={{ padding: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 16 }}>Roll Data Entry</h3>
            <div style={{ display: 'grid', gap: 16 }} className="grid-cols-1 min-[680px]:grid-cols-3 min-[1180px]:grid-cols-4">
              <Field label="Roll Number" name="rollNumber" />
              <Field label="Form Number" name="formNumber" />
              <Field label="Shift" name="shift" options={['A', 'B', 'C']} />
              <Field label="Grade" name="grade" options={['KLB-125', 'KLB-150', 'KLB-175', 'KLB-200', 'KIA-125', 'KIA-150']} />
              <Field label="GSM" name="gsm" type="number" />
              <Field label="Plybond" name="plybond" type="number" />
              <Field label="Thickness (mm)" name="thickness" type="number" />
              <Field label="Bulk" name="bulk" type="number" />
              <Field label="Roll Width (mm)" name="width" type="number" />
              <Field label="Roll Diameter (mm)" name="diameter" type="number" />
              <Field label="Core (mm)" name="core" type="number" />
              <Field label="Cobb" name="cobb" type="number" />
              <Field label="Ex Material" name="exMaterial" options={['OCC', 'NDLKP', 'DIP', 'Mixed']} />
              <Field label="Visual" name="visual" options={['OK', 'REJ', 'C/S']} />
              <Field label="JOP" name="jop" />
              <Field label="PIC" name="pic" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Review →</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 2: Review & Save
          Weight persisted from Step 0 through to final save.
          ════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={{ maxWidth: 700 }}>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f2f9f2', border: '1px solid #d4edda', borderRadius: 4, marginBottom: 12 }}>
              <CheckCircle size={16} style={{ color: '#5CB85C' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#3C763D' }}>Roll information saved successfully.</span>
            </div>
          )}

          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ marginBottom: 16 }}>Review & Save</h3>
            <div style={{ display: 'grid', gap: 16 }} className="grid-cols-1 min-[680px]:grid-cols-2">
              {[
                ['Roll Number', form.rollNumber || '(not entered)'],
                ['Form Number', form.formNumber || '(not entered)'],
                ['Shift', form.shift],
                ['Grade', form.grade],
                ['GSM', form.gsm || '(not entered)'],
                ['Weight', `${weight.display} kg`],
                ['Plybond', form.plybond || '(not entered)'],
                ['Thickness', form.thickness || '(not entered)'],
                ['Roll Width', form.width || '(not entered)'],
                ['Diameter', form.diameter || '(not entered)'],
                ['Core', form.core],
                ['Cobb', form.cobb || '(not entered)'],
                ['Ex Material', form.exMaterial],
                ['Visual', form.visual],
                ['JOP', form.jop || '(not entered)'],
                ['PIC', form.pic || '(not entered)'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #EEEEEE' }}>
                  <span style={{ fontSize: 12, color: '#777', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color: value.includes('(not entered)') ? '#C0392B' : '#333', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Edit</button>
              <button className="btn btn-success" onClick={handleSave}><Save size={13} /> Save Roll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
