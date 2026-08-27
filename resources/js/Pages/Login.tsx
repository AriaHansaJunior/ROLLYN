import { type FormEvent, useEffect, useState, useRef } from 'react'
import { useForm, router, usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, ChevronRight } from 'lucide-react'

export default function Login() {
  const { flash } = usePage<any>().props
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const focusedFieldRef = useRef<string | null>(null)
  const isHovering = useRef(false)
  const [showForm, setShowForm] = useState(false)

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

  const handleMouseEnter = () => {
    isHovering.current = true
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowForm(true)
    }
  }

  const handleMouseLeave = () => {
    isHovering.current = false
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      if (focusedFieldRef.current) return // Prevent closing if an input is focused
      setShowForm(false)
    }
  }

  const handleInputFocus = (field: string) => {
    setFocusedField(field)
    focusedFieldRef.current = field
  }

  const handleInputBlur = () => {
    setFocusedField(null)
    focusedFieldRef.current = null
    // Slight delay allows autofill clicks or tab navigation to complete before checking state
    setTimeout(() => {
      if (!isHovering.current && focusedFieldRef.current === null && typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setShowForm(false)
      }
    }, 150)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="min-h-screen dynamic-bg flex items-center justify-center p-4 sm:p-8 lg:p-0 xl:p-8 relative overflow-hidden font-sans">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -60, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px]" 
        />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwaDIwdjIwSDIwdi0yMHptLTIwIDBoMjB2MjBIMHYtMjB6bTIwLTIwaDIwdjIwSDIwdjIweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjAzIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-20"></div>
      </div>

      <motion.div 
        layout
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className={`mx-auto flex flex-col lg:flex-row rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-900/20 bg-white/5 backdrop-blur-xl border border-white/10 z-10 relative ${
          showForm ? 'w-full max-w-5xl min-h-[600px]' : 'w-full max-w-lg min-h-[500px]'
        }`}
      >
        
        {/* Left Side: Branding / Visual */}
        <motion.div 
          layout
          className="relative overflow-hidden bg-slate-900/60 flex flex-col justify-between p-8 sm:p-12 shrink-0 w-full lg:w-[32rem]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900/80 mix-blend-overlay z-0"></div>
          
          <div className="relative z-10 flex flex-col h-full lg:block items-center lg:items-start text-center lg:text-left">
            <div className="flex items-center gap-3 mb-10">
              <img src="/images/logo-rollyn.png" alt="Rollyn Logo" className="w-12 h-12 object-contain" />
              <span className="text-2xl font-black tracking-widest text-white">ROLLYN</span>
            </div>

            <div className="flex-1 flex flex-col justify-center lg:block">
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                Intelligent <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mx-2 lg:mx-0">
                  Warehouse
                </span> <br className="hidden lg:block" />
                Management.
              </h1>
              <p className="text-slate-300 text-lg max-w-md leading-relaxed mb-10">
                Streamline your inventory, monitor shipments in real-time, and optimize your entire supply chain with our cutting-edge administration system.
              </p>
              
              <AnimatePresence>
                {!showForm && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-center lg:hidden"
                  >
                    <button
                      onClick={() => setShowForm(true)}
                      className="group relative inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 px-10 rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all active:scale-[0.98] overflow-hidden"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      <span>Login</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Desktop hint text (visible only when not expanded on desktop) */}
              <AnimatePresence>
                {!showForm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hidden lg:block mt-8 text-blue-300/80 text-sm font-medium animate-pulse"
                  >
                    Hover to login →
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-400 font-medium mt-12">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span>Secure Enterprise Architecture</span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-2 hidden sm:block"></div>
            <span className="hidden sm:inline">v1.0.0</span>
          </div>
        </motion.div>

        {/* Right Side: Form */}
        <AnimatePresence mode="wait">
          {showForm && (
            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.3 } }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 lg:static z-20 lg:z-auto w-full lg:w-[32rem] shrink-0 p-8 sm:p-12 lg:p-16 bg-white flex flex-col justify-center rounded-[2rem] lg:rounded-none lg:rounded-r-[2rem] overflow-y-auto"
            >
              
              {/* Mobile Logo & Back button */}
              <div className="lg:hidden flex items-center justify-between mb-10 mt-4">
                <div className="flex items-center gap-3">
                  <img src="/images/logo-rollyn.png" alt="Rollyn Logo" className="w-10 h-10 object-contain" />
                  <h1 className="text-xl font-black tracking-widest text-slate-900">ROLLYN</h1>
                </div>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Back
                </button>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-md mx-auto"
              >
                <motion.div variants={itemVariants} className="mb-8 text-left">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome back</h2>
                  <p className="text-slate-500">Please enter your credentials to access the console.</p>
                </motion.div>

                {new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('suspended') && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-900 text-sm flex items-start gap-3 shadow-sm"
                  >
                    <div className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                      <span className="font-bold">!</span>
                    </div>
                    <div className="leading-relaxed">
                      <strong className="block font-bold mb-1">Account Suspended</strong>
                      10 consecutive scanning errors detected. Please contact the Administrator to restore your access.
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                    <div className={`relative flex items-center rounded-xl border ${focusedField === 'email' ? 'border-blue-500 ring-4 ring-blue-500/10' : errors.email ? 'border-red-400 ring-4 ring-red-400/10' : 'border-slate-200'} bg-white transition-all duration-200`}>
                      <div className="pl-4 pr-3 text-slate-400">
                        <Mail className={`w-5 h-5 transition-colors ${focusedField === 'email' ? 'text-blue-500' : ''}`} />
                      </div>
                      <input
                        type="email"
                        placeholder="admin@spectacore.id"
                        value={data.email}
                        onFocus={() => handleInputFocus('email')}
                        onBlur={handleInputBlur}
                        onChange={e => {
                          setData('email', e.target.value)
                          if (errors.email) clearErrors('email')
                        }}
                        className="w-full py-3.5 pr-4 bg-transparent border-none focus:ring-0 outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                      />
                    </div>
                    <AnimatePresence>
                      {errors.email && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-xs mt-1.5 font-medium ml-1"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-700">Password</label>
                      <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot password?</a>
                    </div>
                    <div className={`relative flex items-center rounded-xl border ${focusedField === 'password' ? 'border-blue-500 ring-4 ring-blue-500/10' : errors.password ? 'border-red-400 ring-4 ring-red-400/10' : 'border-slate-200'} bg-white transition-all duration-200`}>
                      <div className="pl-4 pr-3 text-slate-400">
                        <Lock className={`w-5 h-5 transition-colors ${focusedField === 'password' ? 'text-blue-500' : ''}`} />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={data.password}
                        onFocus={() => handleInputFocus('password')}
                        onBlur={handleInputBlur}
                        onChange={e => {
                          setData('password', e.target.value)
                          if (errors.password) clearErrors('password')
                        }}
                        className="w-full py-3.5 pr-4 bg-transparent border-none focus:ring-0 outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                      />
                    </div>
                    <AnimatePresence>
                      {errors.password && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-xs mt-1.5 font-medium ml-1"
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex items-center gap-3 pt-1">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        id="remember" 
                        checked={data.remember}
                        onChange={e => setData('remember', e.target.checked)} 
                        className="peer w-5 h-5 rounded-[6px] border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer transition-all" 
                      />
                    </div>
                    <label htmlFor="remember" className="text-sm text-slate-600 font-medium cursor-pointer select-none">
                      Keep me signed in
                    </label>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-4">
                    <button
                      type="submit"
                      disabled={processing}
                      className="group relative w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all active:scale-[0.98] overflow-hidden disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Secure Sign In</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>

                <motion.div variants={itemVariants} className="mt-10 text-center lg:text-left">
                  <p className="text-xs font-medium text-slate-400">
                    &copy; {new Date().getFullYear()} SPECTACORE Internal System. All rights reserved.
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes moveGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .dynamic-bg {
          background: linear-gradient(-45deg, #0f172a, #1e3a8a, #0b1120, #172554);
          background-size: 400% 400%;
          animation: moveGradient 15s ease infinite;
        }
      `}} />
    </div>
  )
}
