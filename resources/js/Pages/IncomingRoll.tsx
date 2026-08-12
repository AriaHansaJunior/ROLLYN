import { useState } from 'react'
import { Camera, CheckCircle, AlertCircle, Loader, RefreshCw, Save } from 'lucide-react'

type OcrState = 'idle' | 'processing' | 'success' | 'error'
type OcrError = 'far' | 'blur' | 'obstructed' | 'undetected'

const ocrErrors: Record<OcrError, { title: string; message: string }> = {
  far: { title: 'Image Too Far', message: 'Move the camera closer to the weighing display.' },
  blur: { title: 'Camera Image Blurred', message: 'Clean the camera lens or reposition the camera.' },
  obstructed: { title: 'Display Obstructed', message: 'Make sure the weighing display is clearly visible.' },
  undetected: { title: 'Unable to Detect Weight', message: 'The displayed number could not be recognized.' },
}

const steps = ['Camera & Weight Detection', 'Roll Data Entry', 'Review & Save']

export default function IncomingRoll() {
  const [step, setStep] = useState(0)
  const [ocrState, setOcrState] = useState<OcrState>('idle')
  const [ocrError, setOcrError] = useState<OcrError>('blur')
  const [detectedWeight] = useState(1007)
  const [form, setForm] = useState({
    rollNumber: '', formNumber: '', shift: 'A', grade: 'KLB-150',
    gsm: '', plybond: '', thickness: '', bulk: '', width: '',
    diameter: '', core: '76', cobb: '', exMaterial: 'OCC', visual: 'OK', jop: '', pic: '',
  })
  const [saved, setSaved] = useState(false)

  function simulateOcr() {
    setOcrState('processing')
    setTimeout(() => {
      setOcrState('success')
    }, 2200)
  }

  function simulateError() {
    setOcrState('error')
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function Field({ label, name, type = 'text', options }: { label: string; name: keyof typeof form; type?: string; options?: string[] }) {
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

      {/* Step indicator */}
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

      {/* Step 0: Camera */}
      {step === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }} className="max-[679px]:grid-cols-1!">
          <div className="card" style={{ padding: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Camera Preview</h3>
            <div style={{
              background: '#1a2332', borderRadius: 6, height: 220, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative', overflow: 'hidden',
            }}>
              {ocrState === 'idle' && (
                <>
                  <Camera size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Camera feed not active</span>
                </>
              )}
              {ocrState === 'processing' && (
                <>
                  <div style={{ width: '80%', height: '60%', border: '2px dashed rgba(255,255,255,0.4)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: -2, borderRadius: 4, border: '2px solid #337AB7', animation: 'none', opacity: 0.8 }} />
                    <div style={{ background: '#1e1e1e', color: '#e0e0e0', fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, padding: '8px 20px', borderRadius: 4 }}>
                      1.007
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5CB85C', fontSize: 13 }}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Processing weight...
                  </div>
                </>
              )}
              {ocrState === 'success' && (
                <>
                  <CheckCircle size={32} style={{ color: '#5CB85C' }} />
                  <span style={{ color: '#5CB85C', fontSize: 14, fontWeight: 600 }}>Weight detected</span>
                </>
              )}
              {ocrState === 'error' && (
                <>
                  <AlertCircle size={32} style={{ color: '#e74c3c' }} />
                  <span style={{ color: '#e74c3c', fontSize: 14, fontWeight: 600 }}>Detection failed</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={simulateOcr} style={{ flex: 1, justifyContent: 'center' }} disabled={ocrState === 'processing'}>
                <Camera size={13} /> {ocrState === 'processing' ? 'Processing...' : 'Start Detection'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={simulateError} title="Simulate error"><RefreshCw size={13} /></button>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Weight Detection Result</h3>
            {ocrState === 'idle' && (
              <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>Start camera detection to read weight.</div>
            )}
            {ocrState === 'processing' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 10, color: '#777', fontSize: 13 }}>
                <Loader size={18} style={{ color: '#337AB7' }} /> Processing weight from camera...
              </div>
            )}
            {ocrState === 'success' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f2f9f2', border: '1px solid #d4edda', borderRadius: 4, marginBottom: 12 }}>
                  <CheckCircle size={16} style={{ color: '#5CB85C' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#3C763D' }}>Recognition Successful — 98.4% confidence</span>
                </div>
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>OCR Detected Weight</div>
                  <div style={{ fontSize: 48, fontWeight: 700, color: '#286090', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                    {detectedWeight.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 16, color: '#555', fontWeight: 500, marginTop: 4 }}>kg</div>
                </div>
                <div style={{ fontSize: 12, color: '#777', textAlign: 'center' }}>This value is auto-filled and cannot be manually changed.</div>
              </div>
            )}
            {ocrState === 'error' && (
              <div style={{ padding: '14px 16px', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle size={16} style={{ color: '#C0392B' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#C0392B' }}>{ocrErrors[ocrError].title}</span>
                </div>
                <p style={{ fontSize: 13, color: '#555', margin: 0 }}>{ocrErrors[ocrError].message}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {(['far', 'blur', 'obstructed', 'undetected'] as OcrError[]).map(e => (
                    <button key={e} className={`btn btn-sm ${ocrError === e ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setOcrError(e)} style={{ fontSize: 11 }}>{e}</button>
                  ))}
                </div>
              </div>
            )}

            {ocrState === 'success' && (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => setStep(1)}>
                Continue to Roll Data Entry →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Form */}
      {step === 1 && (
        <div style={{ maxWidth: 900 }}>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0f7ff', border: '1px solid #c5dff5', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#777' }}>OCR Detected Weight (read-only)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#286090', fontFamily: 'JetBrains Mono, monospace' }}>{detectedWeight.toLocaleString()} kg</div>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 14 }}>Manual Roll Data Entry</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
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

      {/* Step 2: Review */}
      {step === 2 && (
        <div style={{ maxWidth: 700 }}>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f2f9f2', border: '1px solid #d4edda', borderRadius: 4, marginBottom: 12 }}>
              <CheckCircle size={16} style={{ color: '#5CB85C' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#3C763D' }}>Roll information saved successfully.</span>
            </div>
          )}
          <div className="card" style={{ padding: 16 }}>
            <h3 className="section-title" style={{ marginBottom: 14 }}>Review Roll Entry</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {[
                ['Roll Number', form.rollNumber || '(not entered)'],
                ['Form Number', form.formNumber || '(not entered)'],
                ['Shift', form.shift],
                ['Grade', form.grade],
                ['GSM', form.gsm || '(not entered)'],
                ['Weight (OCR)', `${detectedWeight.toLocaleString()} kg`],
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
