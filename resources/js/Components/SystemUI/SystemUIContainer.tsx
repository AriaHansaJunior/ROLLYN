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
            {/* Modal Layer */}
            {modal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
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
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-md cursor-pointer"
                                >
                                    {modal.confirmText || (modal.type === 'alert' ? 'OK' : 'Confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Layer */}
            <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
                {toasts.map((toast) => {
                    const Icon = 
                        toast.type === 'success' ? CheckCircle2 :
                        toast.type === 'error' ? XCircle :
                        toast.type === 'warning' ? AlertCircle : Info;
                        
                    const colors = 
                        toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' :
                        toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' :
                        toast.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
                        'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';

                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start p-4 border rounded-xl shadow-lg backdrop-blur-xs transition-all ${colors}`}
                        >
                            <Icon className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                            <div className="flex-1 text-sm font-medium">
                                {toast.message}
                            </div>
                            <button 
                                onClick={() => SystemUI.removeToast(toast.id)}
                                className="ml-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
