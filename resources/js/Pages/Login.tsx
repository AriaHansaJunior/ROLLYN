import { router } from '@inertiajs/react'

export default function Login() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 8,
            background: 'linear-gradient(135deg, #337AB7, #1a4e80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>R</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1a4e80', letterSpacing: '0.06em' }}>ROLLYN</div>
          <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>Warehouse Administration System</div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333', margin: '0 0 20px' }}>Sign In</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="admin@spectacore.id" defaultValue="budi.s@spectacore.id" />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" defaultValue="password" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="remember" defaultChecked style={{ accentColor: '#337AB7' }} />
              <label htmlFor="remember" style={{ fontSize: 13, color: '#555' }}>Remember me</label>
            </div>
            <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '10px 14px', fontSize: 14, fontWeight: 600 }} onClick={() => router.visit('/dashboard')}>
              Sign In
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#999' }}>
          ROLLYN v1.0.0 — SPECTACORE Internal System
        </div>
      </div>
    </div>
  )
}
