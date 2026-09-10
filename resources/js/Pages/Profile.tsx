import { User, Lock, LogOut, Save } from "lucide-react";
import { SystemUI } from "@/Utils/SystemUI";
import { router, usePage, useForm } from "@inertiajs/react";

export default function Profile() {
    const { props } = usePage();
    const authUser = (props.auth as any)?.user || {};

    const profileForm = useForm({
        name: authUser.username || "",
    });

    const passwordForm = useForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
    });

    function handleSave() {
        profileForm.put("/profile/update", {
            preserveScroll: true,
            onSuccess: () => {
                SystemUI.toast({
                    message: "Profile updated successfully.",
                    type: "success",
                });
            },
        });
    }

    function handleUpdatePassword() {
        passwordForm.put("/profile/password", {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                SystemUI.toast({
                    message: "Password updated successfully.",
                    type: "success",
                });
            },
        });
    }

    async function handleSignOut() {
        const confirmed = await SystemUI.confirm({
            title: "Sign Out",
            message:
                "Are you sure you want to end your current session and sign out of ROLLYN?",
            confirmText: "Sign Out",
            cancelText: "Cancel",
        });

        if (confirmed) {
            router.post("/logout");
        }
    }

    return (
        <div className="py-3 sm:py-4 px-2.5 sm:px-6 space-y-3 sm:space-y-4 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
            <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Administrator Profile
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    Manage your account credentials and personal preferences
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {/* 1. Current Account */}
                <div className="card p-4 sm:p-5 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-2 mb-3.5 sm:mb-4 pb-2 sm:pb-2.5 border-b border-slate-100">
                            <User size={16} className="text-blue-700" />
                            <h3 className="text-sm font-bold text-slate-900">
                                Current Account
                            </h3>
                        </div>

                        <div className="flex items-center gap-3.5 mb-3.5 sm:mb-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0">
                                {authUser.username?.substring(0, 2).toUpperCase() ||
                                    "AD"}
                            </div>
                            <div>
                                <div className="font-bold text-base text-slate-900">
                                    {authUser.username}
                                </div>
                                <div className="text-xs font-semibold text-blue-700">
                                    {authUser.role === "admin"
                                        ? "System Administrator"
                                        : "Operator"}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                    {authUser.email}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5 sm:space-y-3">
                            <div>
                                <label className="form-label text-xs font-semibold block mb-1">
                                    Display Name
                                </label>
                                <input
                                    value={profileForm.data.name}
                                    onChange={(e) =>
                                        profileForm.setData("name", e.target.value)
                                    }
                                    className={`form-input w-full ${profileForm.errors.name ? "border-red-500" : ""}`}
                                />
                                {profileForm.errors.name && (
                                    <p className="text-red-600 text-[11px] mt-1">
                                        {profileForm.errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="form-label text-xs font-semibold block mb-1">
                                    Email Address
                                </label>
                                <input
                                    value={authUser.email}
                                    className="form-input w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                                    disabled
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Email cannot be changed directly from this
                                    interface.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-1">
                        <button
                            className="btn btn-primary text-xs disabled:opacity-50"
                            onClick={handleSave}
                            disabled={profileForm.processing}
                        >
                            <Save size={13} />{" "}
                            <span>
                                {profileForm.processing
                                    ? "Saving..."
                                    : "Save Changes"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 2. Reset Password */}
                <div className="card p-4 sm:p-5 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-2 mb-3.5 sm:mb-4 pb-2 sm:pb-2.5 border-b border-slate-100">
                            <Lock size={16} className="text-blue-700" />
                            <h3 className="text-sm font-bold text-slate-900">
                                Reset Password
                            </h3>
                        </div>

                        <div className="space-y-2.5 sm:space-y-3">
                            <div>
                                <label className="form-label text-xs font-semibold block mb-1">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.data.current_password}
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            "current_password",
                                            e.target.value,
                                        )
                                    }
                                    className={`form-input w-full ${passwordForm.errors.current_password ? "border-red-500" : ""}`}
                                    placeholder="Enter current password"
                                />
                                {passwordForm.errors.current_password && (
                                    <p className="text-red-600 text-[11px] mt-1">
                                        {passwordForm.errors.current_password}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="form-label text-xs font-semibold block mb-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.data.new_password}
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            "new_password",
                                            e.target.value,
                                        )
                                    }
                                    className={`form-input w-full ${passwordForm.errors.new_password ? "border-red-500" : ""}`}
                                    placeholder="Enter new password (min. 6 characters)"
                                />
                                {passwordForm.errors.new_password && (
                                    <p className="text-red-600 text-[11px] mt-1">
                                        {passwordForm.errors.new_password}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="form-label text-xs font-semibold block mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={
                                        passwordForm.data.new_password_confirmation
                                    }
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            "new_password_confirmation",
                                            e.target.value,
                                        )
                                    }
                                    className={`form-input w-full`}
                                    placeholder="Repeat new password"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-1">
                        <button
                            className="btn btn-secondary text-xs disabled:opacity-50"
                            onClick={handleUpdatePassword}
                            disabled={passwordForm.processing}
                        >
                            {passwordForm.processing
                                ? "Updating..."
                                : "Update Password"}
                        </button>
                    </div>
                </div>

                {/* 3. Sign Out */}
                <div className="card p-4 sm:p-5 border-red-100 md:col-span-2 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center gap-2 mb-2 pb-2 border-b border-red-50 w-full max-w-sm">
                        <LogOut size={16} className="text-red-600" />
                        <h3 className="text-sm font-bold text-red-600">
                            Sign Out
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 text-center">
                        Sign out of the ROLLYN warehouse administration system.
                    </p>
                    <button
                        className="btn btn-danger text-xs"
                        onClick={handleSignOut}
                    >
                        <LogOut size={13} /> <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
