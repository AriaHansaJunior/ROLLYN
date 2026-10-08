import React from "react";
import { Save } from "lucide-react";

interface ConfirmSaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function IncomingRoll_ConfirmSaveModal({
    isOpen,
    onClose,
    onConfirm,
}: ConfirmSaveModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Save size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                    Confirm Data
                </h3>
                <p className="text-slate-500 text-center text-sm mb-6">
                    Are you sure all filled data is correct? This process will
                    save the data to the system and generate the QR Label.
                </p>
                <div className="flex gap-3">
                    <button
                        className="btn btn-secondary flex-1 flex justify-center"
                        onClick={onClose}
                    >
                        Review
                    </button>
                    <button
                        className="btn btn-primary flex-1 flex justify-center"
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                    >
                        Yes, Save
                    </button>
                </div>
            </div>
        </div>
    );
}
