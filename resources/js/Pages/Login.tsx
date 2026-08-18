import { useState, type FormEvent } from 'react'
import { router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

export default function Login() {
  const [email, setEmail] = useState('budi.s@spectacore.id')
  const [password, setPassword] = useState('password')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.'
    }
    if (!password) {
      errs.password = 'Password is required.'
    }

    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      SystemUI.toast({ message: 'Welcome back, Budi Santoso!', type: 'success' })
      router.visit('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {}
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white text-2xl font-black">R</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-blue-900">ROLLYN</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Warehouse Administration System</p>
        </div>

        {}
        <form onSubmit={handleLogin} className="card p-6 sm:p-7 space-y-4 shadow-xl rounded-2xl bg-white border border-slate-200/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-0.5">Sign In</h2>
            <p className="text-xs text-slate-400">Access administrator console</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="form-label text-xs font-semibold block mb-1">Email Address</label>
              <input
                className={`form-input w-full ${errors.email ? 'border-red-500 focus:ring-red-200' : ''}`}
                type="email"
                placeholder="admin@spectacore.id"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors(err => ({ ...err, email: undefined }))
                }}
              />
              {errors.email && <p className="text-red-600 text-[11px] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="form-label text-xs font-semibold block mb-1">Password</label>
              <input
                className={`form-input w-full ${errors.password ? 'border-red-500 focus:ring-red-200' : ''}`}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors(err => ({ ...err, password: undefined }))
                }}
              />
              {errors.password && <p className="text-red-600 text-[11px] mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="remember" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="remember" className="text-xs text-slate-600 font-medium cursor-pointer">Remember this session</label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full justify-center py-2.5 text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 cursor-pointer mt-2"
          >
            Sign In to Dashboard
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 font-medium">
          ROLLYN v1.0.0 — SPECTACORE Internal System
        </div>
      </div>
    </div>
  )
}
