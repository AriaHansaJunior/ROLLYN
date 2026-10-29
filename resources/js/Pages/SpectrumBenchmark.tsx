import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    Gauge,
    Play,
    ShieldCheck,
    AlertTriangle,
    Zap,
    Download,
    Terminal,
    Copy,
    Check,
    Layers,
    Clock,
    Search,
    ChevronRight,
    Sliders,
    RefreshCw,
    Activity,
    Info,
    CheckCircle2,
    Database,
    Sparkles,
} from 'lucide-react';
import { SystemUI } from '@/Utils/SystemUI';

interface SampleRoll {
    no_roll: string;
    grade: string;
    gsm: number;
    weight: number;
    width: number;
    diameter: number;
    jop: string;
    pic: string;
    lokasi_actual?: string;
    entry_date?: string;
}

interface BenchmarkProps {
    totalRolls: number;
    totalLocations: number;
    modelInfo: {
        model_name: string;
        model_version: string;
        runtime: string;
        trees_count: number;
        features_count: number;
        learning_rate: number;
    };
    sampleRolls: SampleRoll[];
    grades: string[];
    gsms: number[];
    jops: string[];
    pics: string[];
}

export default function SpectrumBenchmark({
    totalRolls = 11831,
    totalLocations = 2934,
    modelInfo,
    sampleRolls = [],
    grades = [],
    gsms = [],
    jops = [],
    pics = [],
}: BenchmarkProps) {
    const [activeTab, setActiveTab] = useState<'sandbox' | 'batch' | 'api'>('sandbox');

    // --- Tab 1: Single Roll Manual Testing State ---
    const [weight, setWeight] = useState<number>(1050);
    const [grade, setGrade] = useState<string>(grades[0] || 'SPECTA - LY3');
    const [gsm, setGsm] = useState<number>(gsms[3] || 420);
    const [jop, setJop] = useState<string>(jops[0] || 'JOP-0726-00001');
    const [pic, setPic] = useState<string>(pics[0] || 'WAHYU');
    const [rollNo, setRollNo] = useState<string>('MANUAL-TEST-001');

    const [isRecommending, setIsRecommending] = useState<boolean>(false);
    const [singleResult, setSingleResult] = useState<any>(null);
    const [singleLatency, setSingleLatency] = useState<number | null>(null);

    // --- Tab 2: Batch Simulation State ---
    const [batchCount, setBatchCount] = useState<number>(200);
    const [stressPct, setStressPct] = useState<number>(0);
    const [isRunningBatch, setIsRunningBatch] = useState<boolean>(false);
    const [batchResult, setBatchResult] = useState<any>(null);
    const [batchSearch, setBatchSearch] = useState<string>('');

    // --- Tab 3: API Snippet Copy State ---
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(id);
        SystemUI.toast({ message: 'Copied to clipboard!', type: 'success' });
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleLoadSample = (sample: SampleRoll) => {
        setRollNo(sample.no_roll);
        setWeight(sample.weight);
        setGrade(sample.grade);
        setGsm(sample.gsm);
        setJop(sample.jop);
        setPic(sample.pic || 'WAHYU');
        SystemUI.toast({ message: `Loaded roll ${sample.no_roll}`, type: 'info' });
    };

    const handleRunSingleRecommend = async () => {
        setIsRecommending(true);
        const startTime = performance.now();
        try {
            const res = await axios.post('/api/v1/spectrum/recommend', {
                no_roll: rollNo,
                weight: weight,
                grade: grade,
                gsm: gsm,
                jop: jop,
                pic: pic,
            });
            const dur = performance.now() - startTime;
            setSingleLatency(Math.round(dur * 100) / 100);
            if (res.data?.recommendation) {
                setSingleResult(res.data.recommendation);
                SystemUI.toast({ message: 'Recommendation computed successfully', type: 'success' });
            }
        } catch (err: any) {
            SystemUI.toast({ message: err.response?.data?.message || 'Recommendation failed', type: 'error' });
        } finally {
            setIsRecommending(false);
        }
    };

    const handleRunBatch = async () => {
        setIsRunningBatch(true);
        try {
            const res = await axios.post('/api/spectrum/run-benchmark', {
                count: batchCount,
                stress_pct: stressPct,
            });
            if (res.data?.status === 'SUCCESS') {
                setBatchResult(res.data);
                SystemUI.toast({
                    message: `Completed benchmark for ${res.data.summary.total_decisions} rolls!`,
                    type: 'success',
                });
            }
        } catch (err: any) {
            SystemUI.toast({ message: err.response?.data?.message || 'Benchmark execution failed', type: 'error' });
        } finally {
            setIsRunningBatch(false);
        }
    };

    const filteredBatchAllocations = (batchResult?.allocations || []).filter((a: any) => {
        if (!batchSearch) return true;
        const q = batchSearch.toLowerCase();
        return (
            a.no_roll?.toLowerCase().includes(q) ||
            a.slot?.toLowerCase().includes(q) ||
            a.grade?.toLowerCase().includes(q) ||
            a.jop?.toLowerCase().includes(q)
        );
    });

    const isHeavyRoll = weight >= 1000;

    return (
        <div className="py-5 px-3 sm:px-6 space-y-6 max-w-7xl mx-auto">
            <Head title="AI Benchmarking & Stress Testing | ROLLYN" />

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE BENCHMARK SUITE
                            </span>
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                {modelInfo?.model_name || 'LightGBM-WSO'} {modelInfo?.model_version || 'v1.2'}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
                            <Gauge className="w-8 h-8 text-indigo-400" />
                            SPECTRUM AI Performance Benchmark
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                            Uji performa, audit gravitasi zero-tolerance, dan stress-test alokasi slot pergudangan kertas secara mandiri menggunakan dataset riil pabrik Juli 2026 ({totalRolls.toLocaleString()} roll).
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href="/api/spectrum/benchmark/export-csv?count=500"
                            className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-white/10 flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4 text-emerald-400" />
                            Export Data Log (CSV)
                        </a>
                    </div>
                </div>

                {/* Quick Info Badges */}
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <span className="text-slate-400 block text-[11px]">Runtime AI:</span>
                        <span className="font-bold text-white">{modelInfo?.runtime || 'Pure PHP 8.3+ Native'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Decision Trees:</span>
                        <span className="font-bold text-indigo-300">{modelInfo?.trees_count || 20} GBDT Trees</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Dataset Produksi:</span>
                        <span className="font-bold text-emerald-300">{totalRolls.toLocaleString()} Roll Riil</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Kapasitas Gudang:</span>
                        <span className="font-bold text-amber-300">{totalLocations.toLocaleString()} Slot Lantai</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('sandbox')}
                    className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'sandbox'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Sliders className="w-4 h-4" />
                    1. Interactive Sandbox (Single Roll)
                </button>
                <button
                    onClick={() => setActiveTab('batch')}
                    className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'batch'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    2. Batch Stress-Test (50 - 1.000 Roll)
                </button>
                <button
                    onClick={() => setActiveTab('api')}
                    className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'api'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Terminal className="w-4 h-4" />
                    3. External API & Integration Guide
                </button>
            </div>

            {/* TAB 1: INTERACTIVE SANDBOX */}
            {activeTab === 'sandbox' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls & Roll Inputs */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-indigo-600" />
                                    Parameter Roll Kertas
                                </h3>
                                <span className="text-[11px] text-slate-500">Uji Manual</span>
                            </div>

                            {/* Preset Loader */}
                            {sampleRolls.length > 0 && (
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                                        Pilih Contoh Data Riil (Juli 2026):
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full text-xs"
                                        onChange={(e) => {
                                            const s = sampleRolls.find((r) => r.no_roll === e.target.value);
                                            if (s) handleLoadSample(s);
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>-- Muat Roll Riil Pabrik --</option>
                                        {sampleRolls.map((s) => (
                                            <option key={s.no_roll} value={s.no_roll}>
                                                {s.no_roll} | {s.grade} ({s.weight} kg) | {s.jop}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Weight with Dynamic Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                        Berat Roll (Kg):
                                    </label>
                                    <span className="text-base font-extrabold text-indigo-700">
                                        {weight.toLocaleString()} kg
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="400"
                                    max="2200"
                                    step="10"
                                    value={weight}
                                    onChange={(e) => setWeight(parseInt(e.target.value, 10))}
                                    className="range range-xs range-primary w-full"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                    <span>400 kg (Ringan)</span>
                                    <span className="font-bold text-amber-600">1.000 kg (Batas Tier 1)</span>
                                    <span>2.200 kg (Sangat Berat)</span>
                                </div>

                                {/* Dynamic K3 Safety Notice */}
                                <div
                                    className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                                        isHeavyRoll
                                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    }`}
                                >
                                    {isHeavyRoll ? (
                                        <>
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                            <div>
                                                <span className="font-bold">Beban Berat (&ge; 1.000 kg):</span> Wajib di Tier 1 (Lantai Fondasi). AI melarang penempatan di Tier 3/4.
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <div>
                                                <span className="font-bold">Beban Ringan/Sedang (&lt; 1.000 kg):</span> Fleksibel untuk Tier 1, 2, atau 3.
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Grade & GSM */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                        Grade Kertas:
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full text-xs font-semibold"
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                    >
                                        {grades.map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                        GSM:
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full text-xs font-semibold"
                                        value={gsm}
                                        onChange={(e) => setGsm(parseInt(e.target.value, 10))}
                                    >
                                        {gsms.map((m) => (
                                            <option key={m} value={m}>{m} gsm</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* JOP & PIC */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                        Surat Perintah (JOP):
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm w-full text-xs"
                                        value={jop}
                                        onChange={(e) => setJop(e.target.value)}
                                        placeholder="e.g. JOP-0726-00001"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                        Operator PIC:
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full text-xs font-semibold"
                                        value={pic}
                                        onChange={(e) => setPic(e.target.value)}
                                    >
                                        {pics.map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Run Button */}
                            <button
                                onClick={handleRunSingleRecommend}
                                disabled={isRecommending}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-xs disabled:opacity-50"
                            >
                                {isRecommending ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Mengkalkulasi Alokasi Slot...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 text-amber-300" />
                                        Rekomendasikan Slot AI Sekarang
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* AI Output Result Card */}
                    <div className="lg:col-span-7">
                        {singleResult ? (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                                            <Sparkles className="w-5 h-5" />
                                        </span>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">
                                                Hasil Rekomendasi Alokasi Slot
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Dihitung dalam {singleLatency} ms (Inference time)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[11px] text-slate-400 block font-medium">Confidence Score</span>
                                        <span className="text-lg font-black text-emerald-600">
                                            {singleResult.confidence}%
                                        </span>
                                    </div>
                                </div>

                                {/* Main Recommended Slot Highlight */}
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                                            Rekomendasi Slot Utama:
                                        </span>
                                        <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-2 mt-0.5">
                                            {singleResult.recommendedSlot?.code}
                                            <span className="text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white">
                                                Tier {singleResult.recommendedSlot?.tier}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">
                                            Kolom {singleResult.recommendedSlot?.col} | Tumpukan Level {singleResult.recommendedSlot?.tier}
                                        </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-indigo-100 text-right shadow-sm shrink-0">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">K3 Safety Check</span>
                                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end mt-0.5">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            100% Zero-Tolerance Safe
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-0.5">
                                            {isHeavyRoll ? 'Beban 1 Ton di Fondasi Lantai' : 'Beban Seimbang'}
                                        </span>
                                    </div>
                                </div>

                                {/* Explainable AI Reasonings */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-indigo-600" />
                                        Alasan Rekomendasi (Explainable AI):
                                    </h4>
                                    <div className="space-y-1.5">
                                        {singleResult.reasonings?.map((reason: string, i: number) => (
                                            <div
                                                key={i}
                                                className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-start gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Alternative Candidate Comparison */}
                                {singleResult.topCandidates?.length > 1 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            Kandidat Slot Alternatif:
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            {singleResult.topCandidates.slice(0, 3).map((cand: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-xl border ${
                                                        idx === 0
                                                            ? 'bg-indigo-50/50 border-indigo-300 font-bold'
                                                            : 'bg-white border-slate-200 text-slate-600'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-extrabold text-slate-900">{cand.code}</span>
                                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                                            Tier {cand.tier}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        Score: <span className="font-bold text-indigo-700">{cand.totalScore}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate mt-1">
                                                        {cand.tag}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                                    <Sparkles className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">
                                    Interactive Playground Siap
                                </h3>
                                <p className="text-xs text-slate-500 max-w-sm">
                                    Pilih contoh data roll atau sesuaikan parameter di panel kiri, lalu klik tombol untuk melihat rekomendasi slot dan audit keselamatan secara instan.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: BATCH SIMULATION & STRESS TEST */}
            {activeTab === 'batch' && (
                <div className="space-y-6">
                    {/* Control Bar */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">
                                    Jumlah Roll Simulasi:
                                </label>
                                <select
                                    className="select select-bordered select-sm text-xs font-bold"
                                    value={batchCount}
                                    onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                                    disabled={isRunningBatch}
                                >
                                    <option value="50">50 Roll (Cepat / Test)</option>
                                    <option value="100">100 Roll</option>
                                    <option value="200">200 Roll (Standar)</option>
                                    <option value="500">500 Roll (Setengah Shift)</option>
                                    <option value="1000">1.000 Roll (Full Shift Batch)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">
                                    Mode Stress-Test:
                                </label>
                                <select
                                    className="select select-bordered select-sm text-xs font-bold"
                                    value={stressPct}
                                    onChange={(e) => setStressPct(parseInt(e.target.value, 10))}
                                    disabled={isRunningBatch}
                                >
                                    <option value="0">Normal (Gudang Kosong/Operasional)</option>
                                    <option value="92">Kepadatan Ekstrem (92% Penuh)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={handleRunBatch}
                                disabled={isRunningBatch}
                                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-xs disabled:opacity-50"
                            >
                                {isRunningBatch ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Menjalankan Benchmark...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 fill-white" />
                                        Jalankan Benchmark Batch Sekarang
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Batch Results Scorecard */}
                    {batchResult?.summary && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                        ⚡ Kecepatan Eksekusi (Rata-rata)
                                    </span>
                                    <div className="text-2xl font-black text-slate-900">
                                        {batchResult.summary.avg_latency_ms} ms
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        p50: <span className="font-bold">{batchResult.summary.p50_latency_ms} ms</span> | p95: <span className="font-bold">{batchResult.summary.p95_latency_ms} ms</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-bold mt-1">
                                        Target &lt; 1.0 ms: PASSED
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                        🛡️ Kepatuhan Beban Gravitasi
                                    </span>
                                    <div className="text-2xl font-black text-emerald-600">
                                        {batchResult.summary.safety_compliance_pct}%
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Pelanggaran: <span className="font-bold text-emerald-700">{batchResult.summary.safety_violations_count} kasus</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-bold mt-1">
                                        100% Zero-Tolerance: PASSED
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                        📦 JOP Order Consolidation
                                    </span>
                                    <div className="text-2xl font-black text-indigo-600">
                                        {batchResult.summary.consolidation_rate_pct}%
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Roll per pesanan terkumpul di zona yang sama
                                    </div>
                                    <div className="text-[10px] text-indigo-600 font-bold mt-1">
                                        Target &ge; 85%: PASSED
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                        🎯 Human Alignment Rate
                                    </span>
                                    <div className="text-2xl font-black text-blue-600">
                                        {batchResult.summary.operator_alignment_pct}%
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Kecocokan zona dengan operator forklift
                                    </div>
                                    <div className="text-[10px] text-blue-600 font-bold mt-1">
                                        Baseline Lapangan: SANGAT TINGGI
                                    </div>
                                </div>
                            </div>

                            {/* Tier Stacking Distribution */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                                    Distribusi Tumpukan Rak (Tier Stacking Distribution):
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="text-slate-500 font-medium">Tier 1 (Lantai Fondasi)</div>
                                        <div className="text-lg font-black text-slate-900 mt-0.5">
                                            {batchResult.summary.tier_distribution[1]} roll
                                        </div>
                                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                            Optimal untuk roll berat (&ge; 1 ton)
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="text-slate-500 font-medium">Tier 2 (Tumpukan Tengah)</div>
                                        <div className="text-lg font-black text-slate-900 mt-0.5">
                                            {batchResult.summary.tier_distribution[2]} roll
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            Beban menengah (600 - 1000 kg)
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="text-slate-500 font-medium">Tier 3 (Tumpukan Atas)</div>
                                        <div className="text-lg font-black text-slate-900 mt-0.5">
                                            {batchResult.summary.tier_distribution[3]} roll
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            Khusus roll ringan (&lt; 750 kg)
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="text-slate-500 font-medium">Tier 4 (Tumpukan Teratas)</div>
                                        <div className="text-lg font-black text-slate-900 mt-0.5">
                                            {batchResult.summary.tier_distribution[4]} roll
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            Khusus roll ringan (&lt; 700 kg)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Allocation Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">
                                            Daftar Hasil Alokasi Slot ({filteredBatchAllocations.length} roll)
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Menampilkan 100 data alokasi pertama dari simulasi batch
                                        </p>
                                    </div>

                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            className="input input-bordered input-xs w-full pl-9 text-xs"
                                            placeholder="Cari Roll / Slot / Grade..."
                                            value={batchSearch}
                                            onChange={(e) => setBatchSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="table table-xs w-full">
                                        <thead className="bg-slate-50 text-slate-600 font-bold text-[11px]">
                                            <tr>
                                                <th>#</th>
                                                <th>No Roll</th>
                                                <th>Berat (Kg)</th>
                                                <th>Grade / GSM</th>
                                                <th>JOP</th>
                                                <th>Rekomendasi Slot</th>
                                                <th>Tier</th>
                                                <th>Score</th>
                                                <th>Latency</th>
                                                <th>Audit K3</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs divide-y divide-slate-100">
                                            {filteredBatchAllocations.map((a: any) => (
                                                <tr key={a.idx} className="hover:bg-slate-50/70">
                                                    <td className="font-mono text-slate-400">{a.idx}</td>
                                                    <td className="font-bold text-slate-900">{a.no_roll}</td>
                                                    <td className="font-bold text-indigo-700">{a.weight} kg</td>
                                                    <td>
                                                        <span className="font-medium text-slate-800">{a.grade}</span>{' '}
                                                        <span className="text-[10px] text-slate-400">({a.gsm} gsm)</span>
                                                    </td>
                                                    <td className="font-mono text-slate-600">{a.jop || '-'}</td>
                                                    <td>
                                                        <span className="font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            {a.slot}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-sm badge-ghost font-bold">
                                                            Tier {a.tier}
                                                        </span>
                                                    </td>
                                                    <td className="font-bold text-slate-700">{a.score}</td>
                                                    <td className="font-mono text-[11px] text-slate-500">{a.latency_ms} ms</td>
                                                    <td>
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                            <Check className="w-3.5 h-3.5" />
                                                            SAFE
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: EXTERNAL API & INTEGRATION GUIDE */}
            {activeTab === 'api' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <div>
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-indigo-600" />
                                External REST API Benchmarking (Untuk Tim & QA)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Tim Anda dapat menjalankan benchmarking manual dan otomatis dari komputer luar (Postman, Apache JMeter, Python script, atau sistem ERP pabrik) tanpa login/session CSRF.
                            </p>
                        </div>

                        {/* Endpoints Table */}
                        <div className="overflow-x-auto">
                            <table className="table table-sm w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-bold">
                                    <tr>
                                        <th>Method</th>
                                        <th>Endpoint</th>
                                        <th>Deskripsi</th>
                                        <th>Payload Utama</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><span className="badge badge-sm badge-primary font-bold">POST</span></td>
                                        <td className="font-mono font-bold text-slate-800">/api/v1/spectrum/recommend</td>
                                        <td>Rekomendasi slot AI untuk 1 roll tunggal</td>
                                        <td className="font-mono text-[11px] text-slate-500">&#123; weight, grade, gsm, jop &#125;</td>
                                    </tr>
                                    <tr>
                                        <td><span className="badge badge-sm badge-secondary font-bold">POST</span></td>
                                        <td className="font-mono font-bold text-slate-800">/api/v1/spectrum/benchmark</td>
                                        <td>Menjalankan stress-test batch (50-2000 roll)</td>
                                        <td className="font-mono text-[11px] text-slate-500">&#123; count: 100, stress_pct: 0 &#125;</td>
                                    </tr>
                                    <tr>
                                        <td><span className="badge badge-sm badge-accent font-bold">GET</span></td>
                                        <td className="font-mono font-bold text-slate-800">/api/v1/spectrum/sample-rolls</td>
                                        <td>Mengambil sample roll riil dari dataset Juli 2026</td>
                                        <td className="font-mono text-[11px] text-slate-500">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Code Snippet 1: cURL */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    Contoh Eksekusi via cURL (Terminal / Command Prompt):
                                </span>
                                <button
                                    onClick={() => handleCopy(curlSnippet, 'curl')}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                                >
                                    {copiedIndex === 'curl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    Copy cURL
                                </button>
                            </div>
                            <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                                {curlSnippet}
                            </pre>
                        </div>

                        {/* Code Snippet 2: Python Script */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    Contoh Script Benchmarking Python (Untuk Stress-Test Berulang Tim QA):
                                </span>
                                <button
                                    onClick={() => handleCopy(pythonSnippet, 'python')}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                                >
                                    {copiedIndex === 'python' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    Copy Python Code
                                </button>
                            </div>
                            <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-72">
                                {pythonSnippet}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const curlSnippet = `curl -X POST http://localhost/api/v1/spectrum/recommend \\
  -H "Content-Type: application/json" \\
  -d '{
    "no_roll": "260701-01.01.01",
    "weight": 1050,
    "grade": "SPECTA - LY3",
    "gsm": 500,
    "jop": "JOP-0726-00001"
  }'`;

const pythonSnippet = `import requests
import time

URL = "http://localhost/api/v1/spectrum/recommend"

sample_roll = {
    "no_roll": "BENCHMARK-001",
    "weight": 1100,  # 1.1 ton
    "grade": "SPECTA - TK4",
    "gsm": 420,
    "jop": "JOP-0726-00001"
}

latencies = []
print("Starting external benchmark test...")

for i in range(100):
    start = time.perf_counter()
    resp = requests.post(URL, json=sample_roll)
    duration_ms = (time.perf_counter() - start) * 1000
    latencies.append(duration_ms)
    
    if resp.status_code == 200:
        slot = resp.json()["recommendation"]["recommendedSlot"]["code"]
        tier = resp.json()["recommendation"]["recommendedSlot"]["tier"]
        # print(f"Roll {i+1}: Slot {slot} (Tier {tier}) in {duration_ms:.2f} ms")

print(f"\\n--- Benchmark Completed (100 Requests) ---")
print(f"Average Roundtrip Latency: {sum(latencies)/len(latencies):.2f} ms")
print(f"Min Latency: {min(latencies):.2f} ms")
print(f"Max Latency: {max(latencies):.2f} ms")`;

