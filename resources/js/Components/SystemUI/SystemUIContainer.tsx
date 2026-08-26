import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { SystemUI, ModalOptions, ToastOptions } from '@/Utils/SystemUI';

export default function SystemUIContainer() {
    const [modal, setModal] = useState<ModalOptions | null>(null);
    const [toasts, setToasts] = useState<(ToastOptions & { id: string })[]>([]);
    const [promptValue, setPromptValue] = useState('');

    useEffect(() => {
        const unsubModal = SystemUI.subscribeModal((options) => {
            setModal(options);
            if (options?.type === 'prompt') {
                setPromptValue(options.defaultValue || '');
            }
        });

        const unsubToast = SystemUI.subscribeToast((toast) => {
            setToasts((prev) => [...prev, toast]);
        });

        const unsubToastRemove = SystemUI.subscribeToastRemove((id) => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        });

        return () => {
            unsubModal();
            unsubToast();
            unsubToastRemove();
        };
    }, []);

    const handleConfirm = () => {
        if (modal?.type === 'prompt') {
            modal.onConfirm?.(promptValue);
        } else {
            modal?.onConfirm?.(true);
        }
        SystemUI.closeModal();
    };

    const handleCancel = () => {
        modal?.onCancel?.();
        SystemUI.closeModal();
    };

    return (
        <>
            {}
            {modal && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
                >
                    <div
                        className="w-full max-w-md mx-auto overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl transition-transform duration-200"
                    >
                        <div className="p-6 text-center">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
                                {modal.title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center leading-relaxed">
                                {modal.message}
                            </p>

                            {modal.type === 'prompt' && (
                                <input
                                    type="text"
                                    autoFocus
                                    value={promptValue}
                                    onChange={(e) => setPromptValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirm();
                                        if (e.key === 'Escape') handleCancel();
                                    }}
                                    className="w-full px-4 py-2 mb-6 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                />
                            )}

                            <div className="flex justify-center items-center gap-3">
                                {modal.type !== 'alert' && (
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                                    >
                                        {modal.cancelText || 'Cancel'}
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-md cursor-pointer ${
                                        modal.confirmText?.toLowerCase().includes('delete')
                                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                    }`}
                                >
                                    {modal.confirmText || (modal.type === 'alert' ? 'OK' : 'Confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {}
            <div
                style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    width: 'calc(100% - 40px)',
                    maxWidth: 420,
                    pointerEvents: 'none',
                }}
            >
                {toasts.map((toast) => {
                    const Icon =
                        toast.type === 'success' ? CheckCircle2 :
                        toast.type === 'error' ? XCircle :
                        toast.type === 'warning' ? AlertCircle : Info;
                    const bg =
                        toast.type === 'success' ? '#064e3b' :
                        toast.type === 'error' ? '#7f1d1d' :
                        toast.type === 'warning' ? '#78350f' : '#1e3a8a';

                    const border =
                        toast.type === 'success' ? '#10b981' :
                        toast.type === 'error' ? '#ef4444' :
                        toast.type === 'warning' ? '#f59e0b' : '#3b82f6';

                    const iconColor =
                        toast.type === 'success' ? '#34d399' :
                        toast.type === 'error' ? '#f87171' :
                        toast.type === 'warning' ? '#fbbf24' : '#60a5fa';

                    return (
                        <div
                            key={toast.id}
                            style={{
                                background: bg,
                                border: `1px solid ${border}`,
                                color: '#ffffff',
                                padding: '12px 16px',
                                borderRadius: 10,
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                fontSize: 13,
                                fontWeight: 600,
                                lineHeight: 1.4,
                                pointerEvents: 'auto',
                                wordBreak: 'break-word',
                            }}
                        >
                            <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
                            <div style={{ flex: 1 }}>
                                {toast.message}
                            </div>
                            <button
                                onClick={() => SystemUI.removeToast(toast.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    marginLeft: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
