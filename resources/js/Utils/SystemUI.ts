export type ModalType = 'alert' | 'confirm' | 'prompt';

export interface ModalOptions {
    title: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
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
    private lastToastMap: Map<string, number> = new Map();
    private activeToastIds: string[] = [];

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
        const opt = typeof options === 'string' ? { message: options } : options;
        const msg = (opt.message || '').trim();
        const type = opt.type || 'info';
        const key = `${type}:${msg}`;
        const now = Date.now();

        // 1. Deduplicate & anti-spam: ignore identical toast message triggered within 3.5 seconds
        const lastTime = this.lastToastMap.get(key) || 0;
        if (now - lastTime < 3500) {
            return '';
        }
        this.lastToastMap.set(key, now);

        const id = Math.random().toString(36).substring(2, 9);
        this.activeToastIds.push(id);

        // 2. Limit maximum visible toasts to 3 (remove oldest if exceeding)
        if (this.activeToastIds.length > 3) {
            const oldestId = this.activeToastIds.shift();
            if (oldestId) {
                this.removeToast(oldestId);
            }
        }

        this.toastListeners.forEach(listener => listener({ ...opt, id }));

        if (opt.duration !== Infinity) {
            setTimeout(() => {
                this.removeToast(id);
            }, opt.duration || 3000);
        }

        return id;
    }

    removeToast(id: string) {
        this.activeToastIds = this.activeToastIds.filter(i => i !== id);
        this.toastRemoveListeners.forEach(listener => listener(id));
    }
}

export const SystemUI = new SystemUIManager();
