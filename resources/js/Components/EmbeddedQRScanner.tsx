import React, { useState, useEffect, useRef } from 'react'
import { Camera, RefreshCw, Upload, CheckCircle2, AlertCircle, Sparkles, Video, VideoOff, ArrowRight } from 'lucide-react'
import jsQR from 'jsqr'
import { SystemUI } from '@/Utils/SystemUI'

interface EmbeddedQRScannerProps {
  onScanSuccess: (scannedData: string) => void
  lastScannedRoll?: {
    id: string
    grade: string
    gsm: number
    weight: number
    location?: string
  } | null
}

export default function EmbeddedQRScanner({ onScanSuccess, lastScannedRoll }: EmbeddedQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<any>(null)
  const lastScannedTimestampRef = useRef<number>(0)

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(true)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null)
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState<string | null>(null)

  // Stop camera stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Start camera stream
  const startCamera = async (deviceId?: string) => {
    stopCamera()
    setScanFeedbackMsg(null)
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setHasCameraPermission(true)
      setIsCameraActive(true)

      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
      setDevices(videoDevices)

      startScanningLoop()
    } catch (err: any) {
      console.warn('Camera access error:', err)
      setHasCameraPermission(false)
      setIsCameraActive(false)
    }
  }

  // Real-time Auto Scanning loop using native BarcodeDetector + jsQR fallback
  const startScanningLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return

      const video = videoRef.current
      if (video.videoWidth === 0 || video.videoHeight === 0) return

      // 1. Try native BarcodeDetector if available
      let detectedCode: string | null = null
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await barcodeDetector.detect(video)
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedCode = barcodes[0].rawValue
          }
        } catch (e) {
          // Ignore intermittent detector errors
        }
      }

      // 2. High-accuracy software fallback via jsQR on video canvas
      if (!detectedCode) {
        try {
          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas')
          }
          const canvas = canvasRef.current
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const result = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            })
            if (result && result.data) {
              detectedCode = result.data
            }
          }
        } catch (e) {
          // Ignore frame processing error
        }
      }

      if (detectedCode) {
        const now = Date.now()
        // Prevent duplicate trigger for same code within 2.5 seconds
        if (detectedCode !== lastScannedResult || (now - lastScannedTimestampRef.current > 2500)) {
          lastScannedTimestampRef.current = now
          handleDetectedResult(detectedCode)
        }
      }
    }, 250)
  }

  const handleDetectedResult = (data: string) => {
    setLastScannedResult(data)
    setScanFeedbackMsg(`Scanned: ${data.slice(0, 45)}`)

    // Audio tone feedback
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.12
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.15)
    } catch (e) {
      // Audio context restricted or unavailable
    }

    onScanSuccess(data)

    // Reset last scanned result cache after 2.5 seconds to allow rescanning
    setTimeout(() => {
      setLastScannedResult(null)
    }, 2500)
  }

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  // Handle image upload with dual detection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const img = new Image()
      img.onload = async () => {
        // 1. Try native BarcodeDetector
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
            const barcodes = await detector.detect(img)
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetectedResult(barcodes[0].rawValue)
              return
            }
          } catch (err) {
            console.error('Barcode detection on file failed', err)
          }
        }

        // 2. Try jsQR
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            })
            if (qrResult && qrResult.data) {
              handleDetectedResult(qrResult.data)
              return
            }
          }
        } catch (err) {
          console.error('jsQR file decoding failed', err)
        }

        SystemUI.toast({ message: 'Could not detect QR code in uploaded image.', type: 'warning' })
      }
      img.src = evt.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleDetectedResult(manualCode.trim())
    setManualCode('')
  }

  return (
    <div className="card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-700/80 mb-4 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch">
        
        {/* Left: Camera Feed Viewfinder */}
        <div className="relative w-full lg:w-[380px] shrink-0 bg-black rounded-xl overflow-hidden min-h-[220px] max-h-[260px] flex items-center justify-center border border-slate-700 shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Scanner Overlay Guide */}
          {isCameraActive && hasCameraPermission !== false && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-40 h-40 border-2 border-dashed border-blue-400/70 rounded-xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-3 border-l-3 border-blue-500 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-3 border-r-3 border-blue-500 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-3 border-l-3 border-blue-500 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-3 border-r-3 border-blue-500 rounded-br" />

                {/* Laser animation */}
                <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse" />
              </div>
              
              <span className="absolute bottom-2 bg-slate-900/90 text-blue-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                Align QR Code Here
              </span>
            </div>
          )}

          {/* Camera Permission / Error Fallback */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-3 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <p className="text-xs font-semibold text-white">Camera Access Disabled / Not Found</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Allow browser camera permission or use manual roll ID entry on the right.
              </p>
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId)}
                className="btn btn-secondary btn-sm text-[11px] bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 cursor-pointer mt-1"
              >
                <RefreshCw size={12} className="inline mr-1" /> Retry Camera
              </button>
            </div>
          )}

          {/* Top Camera Indicator Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-700/60 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-200">LIVE SCANNER</span>
          </div>
        </div>

        {/* Right: Info & Controls Panel */}
        <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera size={18} className="text-blue-400" />
                  QC Roll QR Code Scanner
                </h3>
                <p className="text-xs text-slate-400">
                  Point camera at the QR code on the roll core to automatically queue into Shipments.
                </p>
              </div>

              {devices.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Camera:</span>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value)
                      startCamera(e.target.value)
                    }}
                    className="bg-slate-800 text-white text-xs border border-slate-600 rounded-lg px-2 py-1 outline-none"
                  >
                    {devices.map((dev, idx) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Last Scanned Roll Info Card */}
            {lastScannedRoll ? (
              <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex flex-wrap items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm font-mono">{lastScannedRoll.id}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {lastScannedRoll.grade}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      Weight: {lastScannedRoll.weight} kg • Location: {lastScannedRoll.location || '—'}
                    </span>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold text-[11px] uppercase tracking-wider bg-emerald-900/60 px-2 py-1 rounded-md border border-emerald-500/30">
                  Added to Shipments ✓
                </span>
              </div>
            ) : scanFeedbackMsg ? (
              <div className="mt-3 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs flex items-center gap-2 text-blue-200">
                <Sparkles size={14} className="text-blue-400 shrink-0" />
                <span className="truncate">{scanFeedbackMsg}</span>
              </div>
            ) : (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>Ready to scan. Move QR Code in front of camera or type below.</span>
              </div>
            )}
          </div>

          {/* Quick Manual Code Input & Image Upload */}
          <div className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row gap-2 items-center">
            <form onSubmit={handleManualSubmit} className="flex-1 flex gap-1.5 w-full">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type Roll / JOP Code (e.g. R-104)..."
                className="bg-slate-800 text-white placeholder:text-slate-500 border border-slate-700 rounded-lg px-3 py-1.5 text-xs w-full outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shrink-0"
              >
                Add Code
              </button>
            </form>

            <label className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-slate-800 border border-slate-700 shrink-0">
              <Upload size={12} />
              <span>Upload QR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

        </div>
      </div>
    </div>
  )
}
