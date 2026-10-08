import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import { getCsrfToken } from '@/Utils/csrf';
import { SystemUI } from '@/Utils/SystemUI';
import {
    CheckCircle2,
    AlertCircle,
    RotateCw,
    Database,
    Sparkles,
    Sliders,
    Layers,
    ArrowLeft,
    Clock,
    ImageIcon,
    FlaskConical,
    TrendingUp,
    Upload,
    Camera,
    VideoOff,
    Check,
    X,
} from 'lucide-react';

import {
    detectSpectrumWeight,
    logSpectrumTest,
    type SpectrumResult,
} from '@/SPECTRUM/SpectrumService';

import {
    DatasetStats,
    TrainingResult,
    FrameSizeMode,
    RoiConfig,
    strToBool,
} from '@/Components/Training/Training_types';
import Training_LiveCamera from '@/Components/Training/Training_LiveCamera';
import Training_SampleHistory from '@/Components/Training/Training_SampleHistory';


interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    sub: string;
    color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
    return (
        <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: `${color}15`, color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                {value}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                {sub}
            </div>
        </div>
    );
}

export default function Training() {
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isRetraining, setIsRetraining] = useState(false);
    const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [retrainProgress, setRetrainProgress] = useState(0);
    const [retrainProgressMsg, setRetrainProgressMsg] = useState('');
    const [retrainPhase, setRetrainPhase] = useState('');
    const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [frameSizeMode, setFrameSizeMode] = useState<'small' | 'medium' | 'large' | 'full'>('medium');

    const getRoiConfig = () => {
        switch (frameSizeMode) {
            case 'small':
                return { x: 0.25, y: 0.32, width: 0.50, height: 0.36 };
            case 'medium':
                return { x: 0.175, y: 0.275, width: 0.65, height: 0.45 };
            case 'large':
                return { x: 0.10, y: 0.20, width: 0.80, height: 0.60 };
            case 'full':
            default:
                return { x: 0.0, y: 0.0, width: 1.0, height: 1.0 };
        }
    };

    const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
    const [spectrumData, setSpectrumData] = useState<SpectrumResult | null>(null);
    const [confirmedWeightInput, setConfirmedWeightInput] = useState<string>('');
    const [isCorrecting, setIsCorrecting] = useState(false);

    const fetchStats = async () => {
        setIsLoadingStats(true);
        try {
            const res = await fetch('/api/spectrum/stats', { headers: { Accept: 'application/json' } });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('[SPECTRUM Training UI] Failed to load stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => {
            clearInterval(interval);
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
            });
            streamRef.current = stream;
            setIsCameraOpen(true);
            setCapturedFrame(null);
            setSpectrumData(null);

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error("Video play error:", e));
                }
            }, 100);

            SystemUI.toast({ message: 'Live camera active! Position the LED numbers within the green frame.', type: 'info', duration: 3500 });
        } catch (err) {
            console.error('[Camera Error]', err);
            SystemUI.toast({ message: 'Failed to access camera. Ensure camera permissions are granted in the browser.', type: 'error' });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const handleCaptureAndDetect = async () => {
        const video = videoRef.current;
        if (!video) return;
        setIsCapturing(true);

        const roi = getRoiConfig();
        const srcW = video.videoWidth || 640;
        const srcH = video.videoHeight || 480;

        const sx = Math.floor(roi.x * srcW);
        const sy = Math.floor(roi.y * srcH);
        const sw = Math.max(10, Math.floor(roi.width * srcW));
        const sh = Math.max(10, Math.floor(roi.height * srcH));

        const captureFrame = () => {
            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
            }
            return canvas.toDataURL('image/jpeg', 0.95);
        };

        const frames: string[] = [];
        frames.push(captureFrame());
        await new Promise(r => setTimeout(r, 50));
        frames.push(captureFrame());
        await new Promise(r => setTimeout(r, 50));
        frames.push(captureFrame());

        setCapturedFrame(frames[0]);
        setIsCapturing(false);
        setIsDetecting(true);

        try {
            const data = await detectSpectrumWeight(frames);
            setSpectrumData(data);

            const detectedVal = data.weight_detected ? String(data.weight_detected) : '0';
            setConfirmedWeightInput(detectedVal);
            setIsCorrecting(false);

            if (data.weight_detected > 0) {
                SystemUI.toast({
                    message: `🎯 Weight Reading: ${detectedVal} kg (100% Multi-Frame Verified)`,
                    type: 'success',
                    duration: 4000,
                });
            } else {
                SystemUI.toast({
                    message: `System could not read the number clearly. Please enter the weight below.`,
                    type: 'warning',
                    duration: 4000,
                });
            }
        } catch (err) {
            SystemUI.toast({ message: 'An error occurred while processing the weight reading.', type: 'error' });
        } finally {
            setIsDetecting(false);
        }
    };

    const handleSaveCapturedToDataset = async () => {
        if (!capturedFrame || !confirmedWeightInput) {
            SystemUI.toast({ message: 'Please enter the correct weight first.', type: 'warning' });
            return;
        }

        const numericWeight = Number(confirmedWeightInput);
        if (isNaN(numericWeight) || numericWeight <= 0) {
            SystemUI.toast({ message: 'Weight format must be a positive number (e.g., 882 or 1500).', type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const result = await logSpectrumTest({
                image_base64: capturedFrame,
                spectrum_processed_image: spectrumData?.spectrum_processed_image,
                spectrum_result: String(spectrumData?.weight_detected ?? 0),
                spectrum_confidence: spectrumData?.confidence ?? 0,
                actual_manual_input: numericWeight,
                selected_source: String(numericWeight) === String(spectrumData?.weight_detected) ? 'spectrum' : 'manual',
            });

            if (result.status === 'success' || result.message) {
                SystemUI.toast({
                    message: `📸 Scale Photo & Weight [${numericWeight} kg] saved to sample data successfully!`,
                    type: 'success',
                    duration: 5000,
                });

                setCapturedFrame(null);
                setSpectrumData(null);
                setConfirmedWeightInput('');
                setIsCorrecting(false);

                fetchStats();
            } else {
                SystemUI.toast({ message: 'Failed to save sample photo.', type: 'error' });
            }
        } catch (err) {
            SystemUI.toast({ message: 'Connection error while saving sample photo.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const PHASE_LABELS: Record<string, string> = {
        INIT:              '⚙️ Initializing Weight Reading System...',
        AUTO_ANNOTATION:   '🔍 Cropping & mapping scale digits...',
        FEATURE_EXTRACTION:'📐 Processing LED number characteristics...',
        MLP_TRAINING:      '🧠 Adjusting weight reading precision...',
        SAVING_MODEL:      '💾 Saving reading configuration...',
        DONE:              '✅ Calibration complete!',
        SUCCESS:           '✅ Scale reading updated successfully!',
        ERROR:             '❌ Update failed.',
        NO_DATASET:        '⚠️ No sample photos saved yet.',
        IDLE:              '',
    };

    const stopPolling = () => {
        if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
        if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    };

    const handleRunRetrain = async () => {
        setIsRetraining(true);
        setTrainingResult(null);
        setRetrainProgress(2);
        setRetrainProgressMsg('⚙️ Processing weight reading system update...');
        setRetrainPhase('INIT');
        stopPolling();

        SystemUI.toast({ message: '🔄 Weight reading system update started...', type: 'info', duration: 5000 });

        try {
            const res = await fetch('/api/spectrum/retrain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });

            const startData = await res.json();
            if (startData.status === 'ALREADY_RUNNING') {
                SystemUI.toast({ message: 'Update process is running in the background.', type: 'info' });
            }

            pollTimer.current = setInterval(async () => {
                try {
                    const pollRes = await fetch('/api/spectrum/retrain-status', {
                        headers: { Accept: 'application/json' },
                    });
                    if (!pollRes.ok) return;

                    const pollData: TrainingResult = await pollRes.json();
                    const pct = pollData.progress_pct ?? 0;
                    const phase = pollData.phase ?? 'RUNNING';
                    const statusVal = pollData.status ?? 'RUNNING';

                    setRetrainProgress(pct);
                    setRetrainPhase(phase);
                    setRetrainProgressMsg(
                        (PHASE_LABELS[phase] ?? '') + (pollData.message ? ` — ${pollData.message}` : '')
                    );

                    if (statusVal === 'SUCCESS' || statusVal === 'ERROR' || statusVal === 'NO_DATASET') {
                        stopPolling();
                        setIsRetraining(false);
                        setTrainingResult(pollData);
                        setRetrainProgress(pct);

                        if (statusVal === 'SUCCESS') {
                            SystemUI.toast({
                                message: '✅ Scale reading updated and adjusted successfully!',
                                type: 'success',
                                duration: 7000,
                            });
                            fetchStats();
                        } else {
                            SystemUI.toast({
                                message: pollData.message || 'Update finished with status: ' + statusVal,
                                type: statusVal === 'ERROR' ? 'error' : 'warning',
                                duration: 5000,
                            });
                        }
                    }
                } catch (pollErr) {
                    console.warn('[SPECTRUM Poll]', pollErr);
                }
            }, 2000);

            setTimeout(() => {
                stopPolling();
                setIsRetraining(false);
            }, 15 * 60 * 1000);

        } catch (err) {
            stopPolling();
            setIsRetraining(false);
            setRetrainProgress(0);
            SystemUI.toast({ message: 'Connection to SPECTRUM system failed.', type: 'error' });
        }
    };

    const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const manualWeight = prompt('Enter the correct scale weight for this photo (kg):');
        if (!manualWeight || isNaN(Number(manualWeight))) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target?.result as string;
            try {
                const data = await detectSpectrumWeight(base64);
                await logSpectrumTest({
                    image_base64: base64,
                    spectrum_processed_image: data.spectrum_processed_image,
                    spectrum_result: String(data.weight_detected ?? 0),
                    spectrum_confidence: data.confidence ?? 0,
                    actual_manual_input: Number(manualWeight),
                    selected_source: String(manualWeight) === String(data.weight_detected) ? 'spectrum' : 'manual',
                });
                SystemUI.toast({ message: `Photo added to sample successfully! (Weight: ${manualWeight} kg)`, type: 'success', duration: 4000 });
                fetchStats();
            } catch {
                SystemUI.toast({ message: 'Failed to save photo to sample data.', type: 'error' });
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <>
            <Head title="SPECTRUM — Scale Reader Calibration" />

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse-bar { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
                .retrain-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35) !important; }
                .retrain-btn { transition: transform 0.15s, box-shadow 0.15s; }
                .cam-btn:hover { background: #1d4ed8 !important; }
                .upload-zone:hover { border-color: #2563eb !important; background: #eff6ff !important; }
                .entry-row:hover { background: #f8fafc; }
                .preview-thumb { cursor: zoom-in; transition: transform 0.15s; }
                .preview-thumb:hover { transform: scale(1.05); }
                .roi-btn-active { background: #2563eb !important; color: #fff !important; border-color: #3b82f6 !important; }
            `}</style>

            <div style={{ width: '100%', paddingTop: 16, paddingBottom: 32 }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    <a
                        href="/incoming-roll"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 12, fontWeight: 600, color: '#475569',
                            background: '#f1f5f9', border: '1px solid #e2e8f0',
                            padding: '5px 10px', borderRadius: 6, textDecoration: 'none',
                        }}
                    >
                        <ArrowLeft size={12} /> Incoming Roll
                    </a>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>←</div>
                    <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: '#1e40af', color: '#fff',
                        padding: '4px 10px', borderRadius: 5,
                        letterSpacing: '0.03em',
                    }}>
                        SPECTRUM / Scale Reader Calibration
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            onClick={fetchStats}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', border: '1px solid #e2e8f0', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: '#fff' }}
                        >
                            <RotateCw size={11} style={{ animation: isLoadingStats ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                        </button>
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)',
                    borderRadius: 14,
                    padding: '24px 28px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: 80, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

                    <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Sliders size={20} style={{ color: '#fff' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    SPECTRUM Engine 4.0 · Precision Scale Detection
                                </div>
                                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                                    Scale Reader Calibration & Update
                                </h1>
                            </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', maxWidth: 480 }}>
                            Capture live camera photo of the scale LED with precision targeting frame → confirm/correct weight → save to sample → update SPECTRUM reading system.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            className="cam-btn"
                            onClick={isCameraOpen ? stopCamera : startCamera}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '11px 18px',
                                fontSize: 13, fontWeight: 700,
                                background: isCameraOpen ? '#dc2626' : '#2563eb',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: 10,
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isCameraOpen ? <VideoOff size={16} /> : <Camera size={16} />}
                            {isCameraOpen ? 'Close Camera' : '📷 Open Live Camera'}
                        </button>

                        <button
                            className="retrain-btn"
                            onClick={handleRunRetrain}
                            disabled={isRetraining}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '11px 20px',
                                fontSize: 13, fontWeight: 700,
                                background: isRetraining ? 'rgba(255,255,255,0.1)' : '#fff',
                                color: isRetraining ? 'rgba(255,255,255,0.5)' : '#1e40af',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderRadius: 10,
                                cursor: isRetraining ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {isRetraining ? (
                                <>
                                    <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                    Processing {Math.round(retrainProgress)}%…
                                </>
                            ) : (
                                <>
                                    <Sparkles size={15} />
                                    🔄 Update Scale Reader
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {isRetraining && (
                    <div style={{ marginBottom: 20, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RotateCw size={13} style={{ color: '#0284c7', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>
                                    SPECTRUM 4.0 Scale Reader Update
                                </span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#0284c7' }}>
                                {Math.round(retrainProgress)}%
                            </span>
                        </div>
                        <div style={{ height: 10, background: '#e0f2fe', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{
                                height: '100%',
                                width: `${retrainProgress}%`,
                                background: retrainProgress >= 90
                                    ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                                    : 'linear-gradient(90deg, #2563eb, #7c3aed)',
                                borderRadius: 99,
                                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                            }} />
                        </div>
                        {retrainProgressMsg && (
                            <p style={{ fontSize: 11, color: '#0369a1', margin: 0, lineHeight: 1.5 }}>
                                {retrainProgressMsg}
                            </p>
                        )}
                        <p style={{ fontSize: 10, color: '#64748b', margin: '6px 0 0', fontStyle: 'italic' }}>
                            Process running in background — Please wait a moment
                        </p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}
                    className="min-[640px]:grid-cols-4!">
                    <StatCard
                        icon={<Database size={14} />}
                        label="Scale Photo Samples"
                        value={stats?.total_samples ?? 0}
                        sub="Photos saved in sample data"
                        color="#2563eb"
                    />
                    <StatCard
                        icon={<CheckCircle2 size={14} />}
                        label="Verified Samples"
                        value={stats?.corrections_count ?? 0}
                        sub="Corrections verified by operator"
                        color="#16a34a"
                    />
                    <StatCard
                        icon={<Sliders size={14} />}
                        label="Reading Version"
                        value={<span style={{ fontSize: 15 }}>v4.1.0</span>}
                        sub="Precision Scale LED Detection"
                        color="#7c3aed"
                    />
                    <StatCard
                        icon={<Clock size={14} />}
                        label="Last Calibration"
                        value={<span style={{ fontSize: 13 }}>{stats?.last_trained ?? 'Never'}</span>}
                        sub="Calibrated Configuration"
                        color="#f59e0b"
                    />
                </div>

                {trainingResult && (
                    <div style={{
                        marginBottom: 20,
                        borderRadius: 10,
                        border: `1px solid ${trainingResult.status === 'SUCCESS' ? '#bbf7d0' : trainingResult.status === 'ERROR' ? '#fecaca' : '#fde68a'}`,
                        background: trainingResult.status === 'SUCCESS' ? '#f0fdf4' : trainingResult.status === 'ERROR' ? '#fef2f2' : '#fffbeb',
                        padding: 16,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            {trainingResult.status === 'SUCCESS'
                                ? <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                                : <AlertCircle size={18} style={{ color: trainingResult.status === 'ERROR' ? '#dc2626' : '#d97706' }} />}
                            <span style={{ fontWeight: 700, fontSize: 14, color: trainingResult.status === 'SUCCESS' ? '#14532d' : trainingResult.status === 'ERROR' ? '#991b1b' : '#92400e' }}>
                                {trainingResult.message}
                            </span>
                        </div>
                        {trainingResult.status === 'SUCCESS' && (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Photos Processed', value: `${trainingResult.samples_processed ?? '—'}` },
                                    { label: 'Verified Samples', value: `${trainingResult.corrections_learned ?? '—'}` },
                                    { label: 'Number Samples', value: `${trainingResult.crops_saved ?? '—'}` },
                                    { label: 'Accuracy Level', value: trainingResult.val_accuracy ?? '—' },
                                    { label: 'Precision Gain', value: trainingResult.accuracy_gain ?? '—' },
                                    { label: 'Calibration Cycle', value: `${trainingResult.epochs ?? '—'}` },
                                ].map(item => (
                                    <div key={item.label} style={{ background: '#fff', padding: '6px 14px', borderRadius: 6, border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{item.label}</div>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <Training_LiveCamera
                    isCameraOpen={isCameraOpen}
                    videoRef={videoRef}
                    frameSizeMode={frameSizeMode}
                    setFrameSizeMode={setFrameSizeMode}
                    getRoiConfig={getRoiConfig}
                    handleCaptureAndDetect={handleCaptureAndDetect}
                    isCapturing={isCapturing}
                    isDetecting={isDetecting}
                    capturedFrame={capturedFrame}
                    spectrumData={spectrumData}
                    confirmedWeightInput={confirmedWeightInput}
                    setConfirmedWeightInput={setConfirmedWeightInput}
                    isCorrecting={isCorrecting}
                    setIsCorrecting={setIsCorrecting}
                    handleSaveCapturedToDataset={handleSaveCapturedToDataset}
                    isSaving={isSaving}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="min-[900px]:grid-cols-[320px_1fr]!">

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {!isCameraOpen && (
                            <div style={{
                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                border: '1px solid #bfdbfe',
                                borderRadius: 10,
                                padding: 18,
                            }}>
                                <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Camera size={15} style={{ color: '#2563eb' }} /> Take Live Scale Photo
                                </h3>
                                <p style={{ fontSize: 11, color: '#3b82f6', margin: '0 0 12px', lineHeight: 1.4 }}>
                                    Use webcam/phone camera directly with precision targeting frame to add sample data.
                                </p>
                                <button
                                    onClick={startCamera}
                                    style={{
                                        width: '100%',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        padding: '9px 14px',
                                        fontSize: 12, fontWeight: 700,
                                        background: '#2563eb', color: '#fff',
                                        border: 'none', borderRadius: 7,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                                    }}
                                >
                                    <Camera size={14} /> Open Live Camera Now
                                </button>
                            </div>
                        )}

                        <div style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: 18,
                        }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Upload size={14} style={{ color: '#2563eb' }} /> Upload Manual Photo File
                            </h3>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px' }}>
                                Upload scale LED camera photo from computer to add sample data.
                            </p>
                            <label
                                className="upload-zone"
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: 8, height: 100, borderRadius: 8, cursor: 'pointer',
                                    border: '2px dashed #cbd5e1', background: '#f8fafc',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <ImageIcon size={22} style={{ color: '#94a3b8' }} />
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Click or drag photo here</span>
                                <span style={{ fontSize: 10, color: '#cbd5e1' }}>JPG / PNG / WEBP</span>
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleManualImageUpload} />
                            </label>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)',
                            border: '1px solid #dbeafe',
                            borderRadius: 10,
                            padding: 18,
                        }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FlaskConical size={14} /> How Scale Calibration Works
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { step: '1', text: 'Position scale LED in green frame & capture photo', color: '#dbeafe', tc: '#1e40af' },
                                    { step: '2', text: 'Operator confirms/corrects detected weight number', color: '#dcfce7', tc: '#166534' },
                                    { step: '3', text: 'Photo and number saved as verified sample', color: '#fef9c3', tc: '#854d0e' },
                                    { step: '4', text: 'Click Update Scale Reader to make system more precise', color: '#fae8ff', tc: '#7c3aed' },
                                ].map(({ step, text, color, tc }) => (
                                    <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, color: tc, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                            {step}
                                        </div>
                                        <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: 18,
                        }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TrendingUp size={14} style={{ color: '#7c3aed' }} /> LED Precision Detection System
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {[
                                    { label: 'Number 6 vs 8', rule: 'Top Right Empty + Bottom Left Active → 6', badge: '#1e40af' },
                                    { label: 'Number 9 vs 4', rule: 'Bottom Left Empty + Top & Left Active → 9', badge: '#7c3aed' },
                                    { label: 'Number 0 vs 8', rule: 'Center Line Empty → 0', badge: '#059669' },
                                    { label: 'Number 3 vs 2', rule: 'Top Right + Bottom Right Active, Bottom Left Empty → 3', badge: '#d97706' },
                                ].map(({ label, rule, badge }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 9, fontWeight: 800, background: badge, color: '#fff', padding: '2px 5px', borderRadius: 3, whiteSpace: 'nowrap', marginTop: 1 }}>{label}</span>
                                        <span style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>{rule}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Training_SampleHistory
                        stats={stats}
                        isLoadingStats={isLoadingStats}
                        fetchStats={fetchStats}
                        setSelectedImage={setSelectedImage}
                    />
                </div>

                {selectedImage && (
                    <div
                        onClick={() => setSelectedImage(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(15,23,42,0.85)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 20,
                        }}
                    >
                        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <img
                                src={selectedImage}
                                alt="Full Preview"
                                style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '2px solid #38bdf8' }}
                            />
                            <button
                                onClick={() => setSelectedImage(null)}
                                style={{
                                    position: 'absolute', top: -14, right: -14,
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: '#ef4444', color: '#fff', border: '2px solid #fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
