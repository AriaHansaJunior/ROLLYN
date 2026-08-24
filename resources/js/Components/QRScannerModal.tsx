import React, { useState, useEffect, useRef } from 'react'
import { Camera, X, RefreshCw, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (scannedData: string) => void
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null)

  const scanIntervalRef = useRef<any>(null)

  // Clean up camera stream on unmount or close
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  // Start camera stream
  const startCamera = async (deviceId?: string) => {
    stopCamera()
    setScanMessage(null)
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
      setIsScanning(true)

      // Fetch available camera devices
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
      setDevices(videoDevices)

      // Start scanning loop
      startScanningLoop()
    } catch (err: any) {
      console.warn('Camera access error:', err)
      setHasCameraPermission(false)
      setIsScanning(false)
      setScanMessage('Camera permission denied or camera not available on this device.')
    }
  }

  // Realtime scan loop using BarcodeDetector or canvas analysis
  const startScanningLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return

      const video = videoRef.current

      // Check if native BarcodeDetector API exists (Supported in Chrome, Edge, Android Chrome)
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await barcodeDetector.detect(video)
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue
            if (rawValue && rawValue !== lastScannedResult) {
              handleDetectedResult(rawValue)
            }
          }
        } catch (e) {
          // Fallback if BarcodeDetector fails on some frame
        }
      }
    }, 400)
  }

  const handleDetectedResult = (data: string) => {
    setLastScannedResult(data)
    setScanMessage(`Scanned: ${data.slice(0, 40)}...`)
    
    // Play audio beep feedback if available
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.1
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.15)
    } catch (e) {
      // Audio context might be restricted, ignore
    }

    onScanSuccess(data)
  }

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  // Handle image file upload for scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const img = new Image()
      img.onload = async () => {
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
            const barcodes = await detector.detect(img)
            if (barcodes && barcodes.length > 0) {
              handleDetectedResult(barcodes[0].rawValue)
              return
            }
          } catch (err) {
            console.error('Barcode detection on image failed', err)
          }
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="card w-full max-w-lg p-5 bg-white rounded-2xl shadow-2xl space-y-4 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">QR Code Camera Scanner</h3>
              <p className="text-xs text-slate-500">Scan QR label attached on physical roll core</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Feed Container */}
        <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center border border-slate-800 shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-[260px] object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Reticle Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-48 h-48 border-2 border-dashed border-blue-400/80 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                {/* Laser animation line */}
                <div className="w-full h-0.5 bg-blue-500/90 shadow-[0_0_8px_#3b82f6] animate-pulse" />
              </div>
              <span className="absolute bottom-3 bg-slate-900/80 text-blue-400 text-[11px] font-semibold px-3 py-1 rounded-full border border-blue-500/30 backdrop-blur-xs">
                Align QR Code within box
              </span>
            </div>
          )}

          {/* Permission Error / Warning Overlay */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-semibold text-white">Camera Access Disabled or Not Found</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Please allow camera access in browser permissions or use the manual code input / image upload below.
              </p>
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId)}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 cursor-pointer"
              >
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          )}
        </div>

        {/* Scan Status / Message Banner */}
        {scanMessage && (
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600 shrink-0" />
            <span className="font-semibold truncate">{scanMessage}</span>
          </div>
        )}

        {/* Controls & Camera Switch */}
        {devices.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Select Camera:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value)
                startCamera(e.target.value)
              }}
              className="form-input text-xs py-1.5 flex-1"
            >
              {devices.map((dev, idx) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fallbacks Section: Manual Input & File Upload */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or enter Roll / JOP Code manually (e.g. R-104)..."
              className="form-input text-xs py-2 flex-1"
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm text-xs font-bold px-3 py-2 cursor-pointer"
            >
              Submit Code
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <label className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
              <Upload size={14} />
              <span>Scan QR from Image File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm text-xs px-4 py-1.5 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
