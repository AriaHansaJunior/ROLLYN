import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, X, CheckCircle } from 'lucide-react'
import { adminUsers as initialUsers } from '../data/dummy'

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<typeof initialUsers[0] | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', status: 'Active' })
  const [saved, setSaved] = useState(false)

  function openAdd() {
    setEditUser(null)
    setForm({ name: '', email: '', status: 'Active' })
    setShowModal(true)
  }
  function openEdit(user: typeof initialUsers[0]) {
    setEditUser(user)
    setForm({ name: user.name, email: user.email, status: user.status })
    setShowModal(true)
  }
  function save() {
    if (editUser) {
      setUsers(u => u.map(x => x.id === editUser.id ? { ...x, ...form } : x))
    } else {
      setUsers(u => [...u, { id: Date.now(), ...form, created: new Date().toISOString().slice(0, 10), lastActivity: '—' }])
    }
    setShowModal(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }
  function confirmDelete() {
    setUsers(u => u.filter(x => x.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="page-title">User Management</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={13} /> Add Admin</button>
      </div>

      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f2f9f2', border: '1px solid #d4edda', borderRadius: 4, marginBottom: 12 }}>
          <CheckCircle size={16} style={{ color: '#5CB85C' }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: '#3C763D' }}>Administrator record saved successfully.</span>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th>Created</th><th>Last Activity</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 600 }}>{user.name}</td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{user.email}</td>
                <td>
                  <span className="badge" style={{ background: user.status === 'Active' ? '#d4edda' : '#EEEEEE', color: user.status === 'Active' ? '#3C763D' : '#777' }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{user.created}</td>
                <td style={{ fontSize: 12 }}>{user.lastActivity}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(user)}><Edit size={12} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(user.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="card"
              style={{ width: '100%', maxWidth: 400, padding: 20, margin: 16, borderRadius: 18, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="section-title">{editUser ? 'Edit Administrator' : 'Add Administrator'}</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" placeholder="Full name" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="form-input" placeholder="email@company.id" type="email" />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="form-input">
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="card"
              style={{ width: '100%', maxWidth: 360, padding: 20, margin: 16, borderRadius: 18, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)' }}
            >
              <h3 className="section-title" style={{ color: '#C0392B', marginBottom: 10 }}>Delete Administrator</h3>
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px' }}>Are you sure you want to delete this administrator account? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete}><Trash2 size={13} /> Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
