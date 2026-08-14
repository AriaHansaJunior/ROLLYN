import { useState } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { adminUsers as initialUsers } from '../data/dummy'
import { SystemUI } from '@/Utils/SystemUI'

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<typeof initialUsers[0] | null>(null)
  const [form, setForm] = useState({ name: '', email: '', status: 'Active' })
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  function openAdd() {
    setEditUser(null)
    setForm({ name: '', email: '', status: 'Active' })
    setErrors({})
    setShowModal(true)
  }

  function openEdit(user: typeof initialUsers[0]) {
    setEditUser(user)
    setForm({ name: user.name, email: user.email, status: user.status })
    setErrors({})
    setShowModal(true)
  }

  function validate() {
    const errs: { name?: string; email?: string } = {}
    if (!form.name.trim()) {
      errs.name = 'Full name is required.'
    }
    if (!form.email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function save() {
    if (!validate()) return

    if (editUser) {
      setUsers(u => u.map(x => x.id === editUser.id ? { ...x, ...form } : x))
      SystemUI.toast({ message: 'Administrator record updated successfully.', type: 'success' })
    } else {
      setUsers(u => [...u, { id: Date.now(), ...form, created: new Date().toISOString().slice(0, 10), lastActivity: '—' }])
      SystemUI.toast({ message: 'New administrator created successfully.', type: 'success' })
    }
    setShowModal(false)
  }

  async function handleDelete(user: typeof initialUsers[0]) {
    const confirmed = await SystemUI.confirm({
      title: 'Delete Administrator',
      message: `Are you sure you want to delete the administrator "${user.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      setUsers(u => u.filter(x => x.id !== user.id))
      SystemUI.toast({ message: 'Administrator deleted successfully.', type: 'success' })
    }
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage system administrator accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={14} /> <span>Add Admin</span>
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[950px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[280px]" />
            <col className="w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'center' }}>Email</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Created</th>
              <th style={{ textAlign: 'center' }}>Last Activity</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="font-semibold text-slate-900" style={{ textAlign: 'left' }}>{user.name}</td>
                <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{user.email}</td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex w-full justify-center">
                    <span className={`badge inline-flex min-w-[86px] justify-center ${user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {user.status}
                    </span>
                  </div>
                </td>
                <td className="text-xs text-slate-500" style={{ textAlign: 'center' }}>{user.created}</td>
                <td className="text-xs text-slate-500" style={{ textAlign: 'center' }}>{user.lastActivity}</td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex gap-1.5 justify-center">
                    <button className="btn btn-secondary btn-sm p-1.5" onClick={() => openEdit(user)} title="Edit">
                      <Edit size={13} />
                    </button>
                    <button className="btn btn-danger btn-sm p-1.5" onClick={() => handleDelete(user)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-5 bg-white rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editUser ? 'Edit Administrator' : 'Add Administrator'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  value={form.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }))
                    if (errors.name) setErrors(err => ({ ...err, name: undefined }))
                  }}
                  className={`form-input w-full ${errors.name ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="e.g. John Doe"
                />
                {errors.name && <p className="text-red-600 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  value={form.email}
                  onChange={e => {
                    setForm(f => ({ ...f, email: e.target.value }))
                    if (errors.email) setErrors(err => ({ ...err, email: undefined }))
                  }}
                  className={`form-input w-full ${errors.email ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="admin@spectacore.id"
                  type="email"
                />
                {errors.email && <p className="text-red-600 text-[11px] mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary text-xs px-3 py-1.5" onClick={save}>
                Save Administrator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
