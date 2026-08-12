import { useState } from 'react'
import { User, Lock, LogOut, Save, CheckCircle } from 'lucide-react'

export default function Profile() {
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('Budi Santoso')
  const [email] = useState('budi.s@spectacore.id')

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 className="page-title" style={{ marginBottom: 20 }}>Profile</h2>
      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f2f9f2', border: '1px solid #d4edda', borderRadius: 4 }}>
            <CheckCircle size={16} style={{ color: '#5CB85C' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: '#3C763D' }}>Profile updated successfully.</span>
          </div>
        )}

        {/* Account info */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <User size={18} style={{ color: '#286090' }} />
            <h3 className="section-title" style={{ margin: 0 }}>Current Account</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#286090', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700 }}>BS</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Budi Santoso</div>
              <div style={{ fontSize: 13, color: '#777' }}>Administrator</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>budi.s@spectacore.id</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input value={email} className="form-input" disabled style={{ background: '#F5F5F5', color: '#777' }} />
              <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>Email cannot be changed from this interface.</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={handleSave}><Save size={13} /> Save Changes</button>
        </div>

        {/* Reset password */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Lock size={18} style={{ color: '#286090' }} />
            <h3 className="section-title" style={{ margin: 0 }}>Reset Password</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" placeholder="Enter current password" />
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Enter new password" />
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" placeholder="Repeat new password" />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 14 }}>Update Password</button>
        </div>

        {/* Logout */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <LogOut size={18} style={{ color: '#C0392B' }} />
            <h3 className="section-title" style={{ margin: 0, color: '#C0392B' }}>Sign Out</h3>
          </div>
          <p style={{ fontSize: 13, color: '#777', margin: '0 0 14px' }}>Sign out of the ROLLYN administration system.</p>
          <button className="btn btn-danger"><LogOut size={13} /> Sign Out</button>
        </div>
      </div>
    </div>
  )
}
