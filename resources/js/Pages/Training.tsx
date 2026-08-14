import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
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


interface DatasetStats {
    total_samples: number;
    corrections_count: number;
    last_trained: string;
    recent_entries: Array<{
        filename: string;
        correct_weight: string;
        spectrum_predicted_weight: string;
        is_corrected: string | boolean;
    }>;
}

interface TrainingResult {
    status: string;
    samples_processed?: number;
    corrections_learned?: number;
    accuracy_gain?: string;
    val_accuracy?: string;
    crops_saved?: number;
    epochs?: number;
    model_version?: string;
    message?: string;
    phase?: string;
    progress_pct?: number;
}


function strToBool(val: string | boolean): boolean {
    if (typeof val === 'boolean') return val;
    return String(val).toLowerCase() === 'true';
}

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
        const interval = setInterval(fetchStats, 30000); // Auto-refresh every 30s
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

            SystemUI.toast({ message: 'Kamera live aktif! Posisikan angka LED di dalam bingkai hijau.', type: 'info', duration: 3500 });
        } catch (err) {
            console.error('[Camera Error]', err);
            SystemUI.toast({ message: 'Gagal mengakses kamera. Pastikan izin kamera diberikan di browser.', type: 'error' });
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
                    message: `🎯 Pembacaan Timbangan: ${detectedVal} kg (Terverifikasi 100% Multi-Frame)`,
                    type: 'success',
                    duration: 4000,
                });
            } else {
                SystemUI.toast({
                    message: `Sistem belum membaca angka dengan jelas. Silakan masukkan angka berat di bawah.`,
                    type: 'warning',
                    duration: 4000,
                });
            }
        } catch (err) {
            SystemUI.toast({ message: 'Terjadi kesalahan saat memproses pembacaan timbangan.', type: 'error' });
        } finally {
            setIsDetecting(false);
        }
    };


    const handleSaveCapturedToDataset = async () => {
        if (!capturedFrame || !confirmedWeightInput) {
            SystemUI.toast({ message: 'Masukkan angka berat yang benar terlebih dahulu.', type: 'warning' });
            return;
        }

        const numericWeight = Number(confirmedWeightInput);
        if (isNaN(numericWeight) || numericWeight <= 0) {
            SystemUI.toast({ message: 'Format berat harus berupa angka positif (misal: 882 atau 1500).', type: 'error' });
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
                    message: `📸 Foto Timbangan & Berat [${numericWeight} kg] berhasil disimpan ke data sampel!`,
                    type: 'success',
                    duration: 5000,
                });

                setCapturedFrame(null);
                setSpectrumData(null);
                setConfirmedWeightInput('');
                setIsCorrecting(false);

                fetchStats();
            } else {
                SystemUI.toast({ message: 'Gagal menyimpan sampel foto.', type: 'error' });
            }
        } catch (err) {
            SystemUI.toast({ message: 'Error koneksi saat menyimpan sampel foto.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };


    const PHASE_LABELS: Record<string, string> = {
        INIT:              '⚙️ Inisialisasi Sistem Pembacaan...',
        AUTO_ANNOTATION:   '🔍 Pemotongan & pemetaan digit timbangan...',
        FEATURE_EXTRACTION:'📐 Pengolahan karakteristik angka LED...',
        MLP_TRAINING:      '🧠 Penyesuaian presisi pembacaan timbangan...',
        SAVING_MODEL:      '💾 Menyimpan konfigurasi pembacaan...',
        DONE:              '✅ Kalibrasi selesai!',
        SUCCESS:           '✅ Pembacaan timbangan berhasil diperbarui!',
        ERROR:             '❌ Pembaruan gagal.',
        NO_DATASET:        '⚠️ Belum ada sampel foto tersimpan.',
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
        setRetrainProgressMsg('⚙️ Memproses pembaruan sistem pembacaan timbangan...');
        setRetrainPhase('INIT');
        stopPolling();

        SystemUI.toast({ message: '🔄 Pembaruan sistem pembacaan timbangan dimulai...', type: 'info', duration: 5000 });

        try {
            const res = await fetch('/api/spectrum/retrain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            });

            const startData = await res.json();
            if (startData.status === 'ALREADY_RUNNING') {
                SystemUI.toast({ message: 'Proses pembaruan sedang berjalan di background.', type: 'info' });
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
                                message: '✅ Pembacaan timbangan berhasil diperbarui dan disesuaikan!',
                                type: 'success',
                                duration: 7000,
                            });
                            fetchStats();
                        } else {
                            SystemUI.toast({
                                message: pollData.message || 'Pembaruan selesai dengan status: ' + statusVal,
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
            SystemUI.toast({ message: 'Koneksi ke sistem SPECTRUM gagal.', type: 'error' });
        }
    };


    const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const manualWeight = prompt('Masukkan berat timbangan yang benar untuk foto ini (kg):');
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
                SystemUI.toast({ message: `Foto berhasil ditambahkan ke sampel! (Berat: ${manualWeight} kg)`, type: 'success', duration: 4000 });
                fetchStats();
            } catch {
                SystemUI.toast({ message: 'Gagal menyimpan foto ke data sampel.', type: 'error' });
            }
        };
        reader.readAsDataURL(file);
    };


    return (
        <>
            <Head title="SPECTRUM — Kalibrasi Pembaca Timbangan" />

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
                        SPECTRUM / Kalibrasi Pembaca Timbangan
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
                                    SPECTRUM Engine 4.0 · Deteksi Timbangan Presisi
                                </div>
                                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                                    Kalibrasi & Pembaruan Pembaca Timbangan
                                </h1>
                            </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', maxWidth: 480 }}>
                            Ambil foto kamera live LED timbangan dengan bingkai penargetan presisi → konfirmasi/koreksi berat → simpan ke sampel → perbarui sistem pembacaan SPECTRUM.
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
                            {isCameraOpen ? 'Tutup Kamera' : '📷 Buka Kamera Live'}
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
                                    Memproses {Math.round(retrainProgress)}%…
                                </>
                            ) : (
                                <>
                                    <Sparkles size={15} />
                                    🔄 Perbarui Pembaca Timbangan
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
                                    Pembaruan Pembacaan Timbangan SPECTRUM 4.0
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
                            Proses berjalan di background — Mohon tunggu sebentar
                        </p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}
                    className="min-[640px]:grid-cols-4!">
                    <StatCard
                        icon={<Database size={14} />}
                        label="Sampel Foto Timbangan"
                        value={stats?.total_samples ?? 0}
                        sub="Foto tersimpan di data sampel"
                        color="#2563eb"
                    />
                    <StatCard
                        icon={<CheckCircle2 size={14} />}
                        label="Sampel Terverifikasi"
                        value={stats?.corrections_count ?? 0}
                        sub="Koreksi terverifikasi oleh operator"
                        color="#16a34a"
                    />
                    <StatCard
                        icon={<Sliders size={14} />}
                        label="Versi Pembacaan"
                        value={<span style={{ fontSize: 15 }}>v4.1.0</span>}
                        sub="Deteksi Presisi LED Timbangan"
                        color="#7c3aed"
                    />
                    <StatCard
                        icon={<Clock size={14} />}
                        label="Kalibrasi Terakhir"
                        value={<span style={{ fontSize: 13 }}>{stats?.last_trained ?? 'Belum Pernah'}</span>}
                        sub="Konfigurasi Terkalibrasi"
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
                                    { label: 'Foto Diproses', value: `${trainingResult.samples_processed ?? '—'}` },
                                    { label: 'Sampel Terverifikasi', value: `${trainingResult.corrections_learned ?? '—'}` },
                                    { label: 'Sampel Angka', value: `${trainingResult.crops_saved ?? '—'}` },
                                    { label: 'Tingkat Akurasi', value: trainingResult.val_accuracy ?? '—' },
                                    { label: 'Peningkatan Presisi', value: trainingResult.accuracy_gain ?? '—' },
                                    { label: 'Siklus Kalibrasi', value: `${trainingResult.epochs ?? '—'}` },
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

                {isCameraOpen && (
                    <div style={{
                        background: '#0f172a',
                        border: '2px solid #3b82f6',
                        borderRadius: 14,
                        padding: 20,
                        marginBottom: 20,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontSize: 14, fontWeight: 800 }}>
                                <Camera size={18} /> TAMPILAN KAMERA LIVE — BINGKAI PENARGETAN PRESI
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Ukuran Bingkai:</span>
                                {[
                                    { id: 'small', label: '📱 Kecil (50%)' },
                                    { id: 'medium', label: '📷 Sedang (65%)' },
                                    { id: 'large', label: '🖼️ Besar (80%)' },
                                    { id: 'full', label: '🖥️ Full' },
                                ].map(size => (
                                    <button
                                        key={size.id}
                                        onClick={() => setFrameSizeMode(size.id as any)}
                                        style={{
                                            fontSize: 10, fontWeight: 700,
                                            padding: '4px 8px', borderRadius: 5, cursor: 'pointer',
                                            background: frameSizeMode === size.id ? '#2563eb' : '#1e293b',
                                            color: frameSizeMode === size.id ? '#fff' : '#94a3b8',
                                            border: `1px solid ${frameSizeMode === size.id ? '#3b82f6' : '#334155'}`,
                                        }}
                                    >
                                        {size.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="min-[900px]:grid-cols-[1fr_360px]!">
                            <div style={{
                                position: 'relative',
                                background: '#000',
                                borderRadius: 10,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 320,
                                border: '1px solid #334155',
                            }}>
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />

                                {(() => {
                                    const roi = getRoiConfig();
                                    return (
                                        <div style={{
                                            position: 'absolute',
                                            top: `${roi.y * 100}%`,
                                            left: `${roi.x * 100}%`,
                                            width: `${roi.width * 100}%`,
                                            height: `${roi.height * 100}%`,
                                            border: '2px solid #22c55e',
                                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                                            borderRadius: 8,
                                            pointerEvents: 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            padding: 6,
                                            boxSizing: 'border-box',
                                            transition: 'all 0.3s ease',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div style={{ width: 14, height: 14, borderTop: '3px solid #4ade80', borderLeft: '3px solid #4ade80' }} />
                                                <div style={{ width: 14, height: 14, borderTop: '3px solid #4ade80', borderRight: '3px solid #4ade80' }} />
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 800,
                                                    background: 'rgba(22, 163, 74, 0.9)', color: '#fff',
                                                    padding: '3px 8px', borderRadius: 4,
                                                    letterSpacing: '0.04em',
                                                }}>
                                                    🎯 Posisikan LED Timbangan di Sini
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div style={{ width: 14, height: 14, borderBottom: '3px solid #4ade80', borderLeft: '3px solid #4ade80' }} />
                                                <div style={{ width: 14, height: 14, borderBottom: '3px solid #4ade80', borderRight: '3px solid #4ade80' }} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{
                                    position: 'absolute', bottom: 12, left: 12, right: 12,
                                    display: 'flex', justifyContent: 'center', gap: 10,
                                }}>
                                    <button
                                        onClick={handleCaptureAndDetect}
                                        disabled={isCapturing || isDetecting}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 8,
                                            padding: '10px 22px', fontSize: 13, fontWeight: 800,
                                            background: '#22c55e', color: '#fff',
                                            border: 'none', borderRadius: 8,
                                            cursor: isCapturing || isDetecting ? 'wait' : 'pointer',
                                            boxShadow: '0 4px 14px rgba(34,197,94,0.4)',
                                        }}
                                    >
                                        {isCapturing || isDetecting ? (
                                            <>
                                                <RotateCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                Memproses Foto...
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={16} /> 📸 Tangkap Foto LED
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                background: '#1e293b',
                                borderRadius: 10,
                                border: '1px solid #334155',
                                padding: 14,
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={14} style={{ color: '#38bdf8' }} /> Hasil Pembacaan Foto
                                </h4>

                                {capturedFrame ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>Foto Asli Crop</div>
                                                <img src={capturedFrame} alt="Cropped Frame" style={{ width: '100%', height: 100, objectFit: 'contain', background: '#000', borderRadius: 6, border: '1px solid #475569' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, color: '#38bdf8', marginBottom: 4, fontWeight: 600 }}>Deteksi Presisi</div>
                                                {spectrumData?.spectrum_processed_image ? (
                                                    <img src={spectrumData.spectrum_processed_image} alt="Mask Processed" style={{ width: '100%', height: 100, objectFit: 'contain', background: '#000', borderRadius: 6, border: '1px solid #0284c7' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: 100, background: '#090d16', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 10 }}>
                                                        {isDetecting ? 'Memproses...' : 'Tanda LED'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, border: '1px solid #334155' }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Angka Hasil Pembacaan:</div>
                                            {isCorrecting ? (
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <input
                                                        type="number"
                                                        value={confirmedWeightInput}
                                                        onChange={(e) => setConfirmedWeightInput(e.target.value)}
                                                        placeholder="Ketik angka berat..."
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            background: '#1e293b',
                                                            border: '1px solid #3b82f6',
                                                            color: '#fff',
                                                            padding: '6px 10px',
                                                            borderRadius: 6,
                                                            fontSize: 16,
                                                            fontWeight: 800,
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                                    <div style={{ fontSize: 24, fontWeight: 900, color: confirmedWeightInput !== '0' ? '#4ade80' : '#f59e0b' }}>
                                                        {confirmedWeightInput || '0'} <span style={{ fontSize: 14, fontWeight: 600 }}>kg</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsCorrecting(true)}
                                                        style={{ fontSize: 11, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                                    >
                                                        ✏️ Ubah Angka
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleSaveCapturedToDataset}
                                            disabled={isSaving}
                                            style={{
                                                marginTop: 'auto',
                                                width: '100%',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                padding: '10px 14px',
                                                fontSize: 12, fontWeight: 800,
                                                background: isSaving ? '#64748b' : '#16a34a',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 8,
                                                cursor: isSaving ? 'wait' : 'pointer',
                                                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                                            }}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                                    Menyimpan Foto Sampel...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} />
                                                    💾 Simpan Sampel & Perbarui Sistem
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '30px 10px', textAlign: 'center', border: '2px dashed #334155', borderRadius: 8 }}>
                                        <Camera size={32} style={{ color: '#475569', marginBottom: 8 }} />
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Belum ada foto ditangkap</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Posisikan layar HP / timbangan di dalam bingkai hijau, lalu klik "📸 Tangkap Foto LED".</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
                                    <Camera size={15} style={{ color: '#2563eb' }} /> Ambil Foto Timbangan Live
                                </h3>
                                <p style={{ fontSize: 11, color: '#3b82f6', margin: '0 0 12px', lineHeight: 1.4 }}>
                                    Gunakan webcam/kamera HP langsung dengan bingkai penargetan presisi untuk menambah data sampel.
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
                                    <Camera size={14} /> Buka Kamera Live Now
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
                                <Upload size={14} style={{ color: '#2563eb' }} /> Upload File Foto Manual
                            </h3>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px' }}>
                                Upload foto kamera LED timbangan dari komputer untuk menambah data sampel.
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
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Klik atau drag foto ke sini</span>
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
                                <FlaskConical size={14} /> Cara Kerja Kalibrasi Timbangan
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { step: '1', text: 'Posisikan LED timbangan di bingkai hijau & tangkap foto', color: '#dbeafe', tc: '#1e40af' },
                                    { step: '2', text: 'Operator konfirmasi/koreksi angka berat yang terdeteksi', color: '#dcfce7', tc: '#166534' },
                                    { step: '3', text: 'Foto dan angka disimpan sebagai sampel terverifikasi', color: '#fef9c3', tc: '#854d0e' },
                                    { step: '4', text: 'Klik Perbarui Pembaca Timbangan agar sistem semakin presisi', color: '#fae8ff', tc: '#7c3aed' },
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
                                <TrendingUp size={14} style={{ color: '#7c3aed' }} /> Sistem Deteksi Presisi LED
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {[
                                    { label: 'Angka 6 vs 8', rule: 'Atas Kanan Kosong + Bawah Kiri Aktif → 6', badge: '#1e40af' },
                                    { label: 'Angka 9 vs 4', rule: 'Bawah Kiri Kosong + Atas & Kiri Aktif → 9', badge: '#7c3aed' },
                                    { label: 'Angka 0 vs 8', rule: 'Garis Tengah Kosong → 0', badge: '#059669' },
                                    { label: 'Angka 3 vs 2', rule: 'Kanan Atas + Kanan Bawah Aktif, Bawah Kiri Kosong → 3', badge: '#d97706' },
                                ].map(({ label, rule, badge }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 9, fontWeight: 800, background: badge, color: '#fff', padding: '2px 5px', borderRadius: 3, whiteSpace: 'nowrap', marginTop: 1 }}>{label}</span>
                                        <span style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>{rule}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <div style={{
                            padding: '14px 18px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                        }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Layers size={14} style={{ color: '#2563eb' }} />
                                Riwayat Sampel Foto Timbangan
                                {stats?.total_samples != null && (
                                    <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '2px 7px', borderRadius: 10 }}>
                                        {stats.total_samples} sampel
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={fetchStats}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}
                            >
                                <RotateCw size={11} style={{ animation: isLoadingStats ? 'spin 1s linear infinite' : 'none' }} />
                                Refresh
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto', flex: 1 }}>
                            {isLoadingStats ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#94a3b8', gap: 8 }}>
                                    <RotateCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontSize: 13 }}>Memuat data sampel…</span>
                                </div>
                            ) : stats?.recent_entries && stats.recent_entries.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                                Foto
                                            </th>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Nama File
                                            </th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                                Konfirmasi Operator
                                            </th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                                Hasil Deteksi Sistem
                                            </th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recent_entries.map((row, idx) => {
                                            const isCorr = strToBool(row.is_corrected);
                                            const imgSrc = `/storage/dataset/images/${row.filename}`;
                                            return (
                                                <tr key={idx} className="entry-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 14px' }}>
                                                        <img
                                                            src={imgSrc}
                                                            alt={row.filename}
                                                            className="preview-thumb"
                                                            onClick={() => setSelectedImage(imgSrc)}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="35" viewBox="0 0 50 35"><rect width="50" height="35" fill="%23f1f5f9"/><text x="25" y="20" font-size="9" text-anchor="middle" fill="%2394a3b8">No Image</text></svg>';
                                                            }}
                                                            style={{ width: 50, height: 35, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f1f5f9' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                                                        {row.filename}
                                                    </td>
                                                    <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 800, color: '#16a34a', fontSize: 13 }}>
                                                        {row.correct_weight} <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>kg</span>
                                                    </td>
                                                    <td style={{ padding: '8px 14px', textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                                                        {row.spectrum_predicted_weight || '—'} kg
                                                    </td>
                                                    <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                                        {isCorr ? (
                                                            <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 99 }}>
                                                                Dikoreksi
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 99 }}>
                                                                Sesuai
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', textAlign: 'center' }}>
                                    <Database size={36} style={{ color: '#cbd5e1', marginBottom: 10 }} />
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Belum ada sampel foto tersimpan</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 360 }}>
                                        Ambil foto timbangan via bingkai kamera live di atas atau upload file foto untuk mulai mengumpulkan sampel.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
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
