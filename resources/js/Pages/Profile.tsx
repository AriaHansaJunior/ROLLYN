import { useState } from 'react'
import { User, Lock, LogOut, Save } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'
import { router } from '@inertiajs/react'

export default function Profile() {
  const [name, setName] = useState('Budi Suprapto')
  const [email] = useState('budi.s@spectacore.id')
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({})

  function handleSave() {
    if (!name.trim()) {
      setNameError('Display name cannot be empty.')
      return
    }
    setNameError(null)
    SystemUI.toast({ message: 'Profile updated successfully.', type: 'success' })
  }

  function handleUpdatePassword() {
    const errs: { current?: string; new?: string; confirm?: string } = {}
    if (!currentPassword) {
      errs.current = 'Current password is required.'
    }
    if (!newPassword) {
      errs.new = 'New password is required.'
    } else if (newPassword.length < 6) {
      errs.new = 'Password must be at least 6 characters.'
    }
    if (!confirmPassword) {
      errs.confirm = 'Please confirm your new password.'
    } else if (newPassword !== confirmPassword) {
      errs.confirm = 'Passwords do not match.'
    }

    setPasswordErrors(errs)
    if (Object.keys(errs).length === 0) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      SystemUI.toast({ message: 'Password updated successfully.', type: 'success' })
    }
  }

  async function handleSignOut() {
    const confirmed = await SystemUI.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to end your current session and sign out of ROLLYN?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      SystemUI.toast({ message: 'Signed out successfully.', type: 'info' })
      router.visit('/login')
    }
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Administrator Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage your account credentials and personal preferences</p>
      </div>

      <div className="space-y-4">
        {}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-100">
            <User size={16} className="text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">Current Account</h3>
          </div>

          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              BS
            </div>
            <div>
              <div className="font-bold text-base text-slate-900">Budi Suprapto</div>
              <div className="text-xs font-semibold text-blue-700">System Administrator</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{email}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="form-label text-xs font-semibold block mb-1">Display Name</label>
              <input
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  if (nameError) setNameError(null)
                }}
                className={`form-input w-full ${nameError ? 'border-red-500' : ''}`}
              />
              {nameError && <p className="text-red-600 text-[11px] mt-1">{nameError}</p>}
            </div>

            <div>
              <label className="form-label text-xs font-semibold block mb-1">Email Address</label>
              <input
                value={email}
                className="form-input w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                disabled
              />
              <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed directly from this interface.</p>
            </div>
          </div>

          <button className="btn btn-primary mt-4 text-xs" onClick={handleSave}>
            <Save size={13} /> <span>Save Changes</span>
          </button>
        </div>

        {}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-100">
            <Lock size={16} className="text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="form-label text-xs font-semibold block mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => {
                  setCurrentPassword(e.target.value)
                  if (passwordErrors.current) setPasswordErrors(err => ({ ...err, current: undefined }))
                }}
                className={`form-input w-full ${passwordErrors.current ? 'border-red-500' : ''}`}
                placeholder="Enter current password"
              />
              {passwordErrors.current && <p className="text-red-600 text-[11px] mt-1">{passwordErrors.current}</p>}
            </div>

            <div>
              <label className="form-label text-xs font-semibold block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value)
                  if (passwordErrors.new) setPasswordErrors(err => ({ ...err, new: undefined }))
                }}
                className={`form-input w-full ${passwordErrors.new ? 'border-red-500' : ''}`}
                placeholder="Enter new password (min. 6 characters)"
              />
              {passwordErrors.new && <p className="text-red-600 text-[11px] mt-1">{passwordErrors.new}</p>}
            </div>

            <div>
              <label className="form-label text-xs font-semibold block mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value)
                  if (passwordErrors.confirm) setPasswordErrors(err => ({ ...err, confirm: undefined }))
                }}
                className={`form-input w-full ${passwordErrors.confirm ? 'border-red-500' : ''}`}
                placeholder="Repeat new password"
              />
              {passwordErrors.confirm && <p className="text-red-600 text-[11px] mt-1">{passwordErrors.confirm}</p>}
            </div>
          </div>

          <button className="btn btn-secondary mt-4 text-xs" onClick={handleUpdatePassword}>
            Update Password
          </button>
        </div>

        {}
        <div className="card p-4 sm:p-5 border-red-100">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-50">
            <LogOut size={16} className="text-red-600" />
            <h3 className="text-sm font-bold text-red-600">Sign Out</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">Sign out of the ROLLYN warehouse administration system.</p>
          <button className="btn btn-danger text-xs" onClick={handleSignOut}>
            <LogOut size={13} /> <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
