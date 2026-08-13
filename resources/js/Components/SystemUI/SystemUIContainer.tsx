import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
            <AnimatePresence>
                {modal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-full max-w-md overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl"
                        >
                            <div className="p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {modal.title}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
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

                                <div className="flex justify-end space-x-3">
                                    {modal.type !== 'alert' && (
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                                        >
                                            {modal.cancelText || 'Cancel'}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleConfirm}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-md"
                                    >
                                        {modal.confirmText || (modal.type === 'alert' ? 'OK' : 'Confirm')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Layer */}
            <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
                <AnimatePresence>
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
                            <motion.div
                                key={toast.id}
                                layout
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                className={`pointer-events-auto flex items-start p-4 border rounded-xl shadow-lg backdrop-blur-sm ${colors}`}
                            >
                                <Icon className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                                <div className="flex-1 text-sm font-medium">
                                    {toast.message}
                                </div>
                                <button 
                                    onClick={() => SystemUI.removeToast(toast.id)}
                                    className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </>
    );
}
