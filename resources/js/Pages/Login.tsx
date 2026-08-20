import { type FormEvent, useEffect } from 'react'
import { useForm, router, usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

export default function Login() {
  const { flash } = usePage<any>().props

  useEffect(() => {
    if (flash?.success) {
      SystemUI.toast({ message: flash.success, type: 'success' })
    }
  }, [flash?.success])

  const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
    email: 'admin@spectacore.id',
    password: 'password',
    remember: true,
  })

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    clearErrors()
    
    let hasError = false
    if (!data.email.trim()) {
      setError('email', 'Email address is required.')
      hasError = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('email', 'Please enter a valid email address.')
      hasError = true
    }
    
    if (!data.password) {
      setError('password', 'Password is required.')
      hasError = true
    }

    if (!hasError) {
      post('/login', {
        onSuccess: (page) => {
          const user = (page.props.auth as any)?.user;
          const userName = user?.name || user?.username || '';
          SystemUI.toast({ message: `Welcome back${userName ? ', ' + userName : ''}!`, type: 'success' })
        },
      })
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
                value={data.email}
                onChange={e => {
                  setData('email', e.target.value)
                  if (errors.email) clearErrors('email')
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
                value={data.password}
                onChange={e => {
                  setData('password', e.target.value)
                  if (errors.password) clearErrors('password')
                }}
              />
              {errors.password && <p className="text-red-600 text-[11px] mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                id="remember" 
                checked={data.remember}
                onChange={e => setData('remember', e.target.checked)} 
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
              />
              <label htmlFor="remember" className="text-xs text-slate-600 font-medium cursor-pointer">Remember this session</label>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="btn btn-primary w-full justify-center py-2.5 text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 cursor-pointer mt-2 disabled:opacity-75"
          >
            {processing ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 font-medium">
          ROLLYN v1.0.0 — SPECTACORE Internal System
        </div>
      </div>
    </div>
  )
}
