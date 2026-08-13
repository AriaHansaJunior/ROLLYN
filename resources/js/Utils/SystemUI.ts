export type ModalType = 'alert' | 'confirm' | 'prompt';

export interface ModalOptions {
    title: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string; // for prompt
    onConfirm?: (value?: string | boolean) => void;
    onCancel?: () => void;
}

export interface ToastOptions {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

type ModalListener = (options: ModalOptions | null) => void;
type ToastListener = (toast: ToastOptions & { id: string }) => void;
type ToastRemoveListener = (id: string) => void;

class SystemUIManager {
    private modalListeners: ModalListener[] = [];
    private toastListeners: ToastListener[] = [];
    private toastRemoveListeners: ToastRemoveListener[] = [];

    // --- Modal Methods ---
    subscribeModal(listener: ModalListener) {
        this.modalListeners.push(listener);
        return () => {
            this.modalListeners = this.modalListeners.filter(l => l !== listener);
        };
    }

    private triggerModal(options: ModalOptions | null) {
        this.modalListeners.forEach(listener => listener(options));
    }

    alert(options: Omit<ModalOptions, 'type'>): Promise<void> {
        return new Promise((resolve) => {
            this.triggerModal({
                ...options,
                type: 'alert',
                onConfirm: () => {
                    options.onConfirm?.();
                    resolve();
                },
                onCancel: () => {
                    options.onCancel?.();
                    resolve();
                }
            });
        });
    }

    confirm(options: Omit<ModalOptions, 'type'>): Promise<boolean> {
        return new Promise((resolve) => {
            this.triggerModal({
                ...options,
                type: 'confirm',
                onConfirm: () => {
                    options.onConfirm?.(true);
                    resolve(true);
                },
                onCancel: () => {
                    options.onCancel?.();
                    resolve(false);
                }
            });
        });
    }

    prompt(options: Omit<ModalOptions, 'type'>): Promise<string | null> {
        return new Promise((resolve) => {
            this.triggerModal({
                ...options,
                type: 'prompt',
                onConfirm: (value) => {
                    options.onConfirm?.(value);
                    resolve(value as string);
                },
                onCancel: () => {
                    options.onCancel?.();
                    resolve(null);
                }
            });
        });
    }

    closeModal() {
        this.triggerModal(null);
    }

    // --- Toast Methods ---
    subscribeToast(listener: ToastListener) {
        this.toastListeners.push(listener);
        return () => {
            this.toastListeners = this.toastListeners.filter(l => l !== listener);
        };
    }

    subscribeToastRemove(listener: ToastRemoveListener) {
        this.toastRemoveListeners.push(listener);
        return () => {
            this.toastRemoveListeners = this.toastRemoveListeners.filter(l => l !== listener);
        };
    }

    toast(options: ToastOptions | string) {
        const id = Math.random().toString(36).substring(2, 9);
        const opt = typeof options === 'string' ? { message: options } : options;
        
        this.toastListeners.forEach(listener => listener({ ...opt, id }));
        
        if (opt.duration !== Infinity) {
            setTimeout(() => {
                this.removeToast(id);
            }, opt.duration || 3000);
        }
        
        return id;
    }

    removeToast(id: string) {
        this.toastRemoveListeners.forEach(listener => listener(id));
    }
}

export const SystemUI = new SystemUIManager();
