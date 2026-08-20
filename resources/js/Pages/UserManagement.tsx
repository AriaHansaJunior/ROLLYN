import { useState } from 'react'
import { Plus, Edit, Trash2, X, Search, Filter } from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

interface UserItem {
  id: number
  name: string
  username: string
  email: string
  role: string
  status: string
  created: string
  lastActivity: string
}

interface Props {
  users?: UserItem[]
}

const ROLE_OPTIONS = ['Admin', 'Production', 'QC', 'PPIC']

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  production: 'bg-amber-50 text-amber-700 border-amber-200',
  qc: 'bg-purple-50 text-purple-700 border-purple-200',
  ppic: 'bg-teal-50 text-teal-700 border-teal-200',
}

export default function UserManagement({ users = [] }: Props) {
  const { props } = usePage()
  const authUser = (props.auth as any)?.user
  const currentUserRole = (authUser?.role ?? 'admin').toLowerCase()
  const canDelete = currentUserRole === 'admin'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'admin',
    status: 'Active'
  })
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    password_confirmation?: string
  }>({})

  const filteredUsers = users.filter(user => {
    const q = search.toLowerCase()
    const matchSearch = !q || (user.name && user.name.toLowerCase().includes(q)) || (user.email && user.email.toLowerCase().includes(q))
    const matchStatus = statusFilter === 'All' || user.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filteredUsers.length / perPage)
  const pagedUsers = filteredUsers.slice((page - 1) * perPage, page * perPage)

  function openAdd() {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'admin', status: 'Active' })
    setErrors({})
    setShowModal(true)
  }

  function openEdit(user: UserItem) {
    setEditUser(user)
    setForm({
      name: user.name || user.username || '',
      email: user.email === 'N/A' ? '' : user.email,
      password: '',
      password_confirmation: '',
      role: user.role ? user.role.toLowerCase() : 'admin',
      status: user.status || 'Active'
    })
    setErrors({})
    setShowModal(true)
  }

  function validate() {
    const errs: { name?: string; email?: string; password?: string; password_confirmation?: string } = {}
    if (!form.name.trim()) {
      errs.name = 'Full name (username) is required.'
    }
    if (!form.email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }

    if (!editUser) {
      if (!form.password) {
        errs.password = 'Password is required for new user.'
      } else if (form.password.length < 6) {
        errs.password = 'Password must be at least 6 characters.'
      }
      if (form.password !== form.password_confirmation) {
        errs.password_confirmation = 'Passwords do not match.'
      }
    } else {
      if (form.password && form.password.length < 6) {
        errs.password = 'Password must be at least 6 characters.'
      }
      if (form.password && form.password !== form.password_confirmation) {
        errs.password_confirmation = 'Passwords do not match.'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function save() {
    if (!validate()) return

    if (editUser) {
      router.put(`/user-management/${editUser.id}`, form, {
        onSuccess: () => {
          SystemUI.toast({ message: 'User record updated successfully.', type: 'success' })
          setShowModal(false)
        },
        onError: (errs) => {
          setErrors(errs as any)
        }
      })
    } else {
      router.post('/user-management', form, {
        onSuccess: () => {
          SystemUI.toast({ message: 'New user created successfully.', type: 'success' })
          setShowModal(false)
        },
        onError: (errs) => {
          setErrors(errs as any)
        }
      })
    }
  }

  async function handleDelete(user: UserItem) {
    const confirmed = await SystemUI.confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete the user "${user.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      router.delete(`/user-management/${user.id}`, {
        onSuccess: () => {
          SystemUI.toast({ message: 'User deleted successfully.', type: 'success' })
        }
      })
    }
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage system user accounts and roles</p>
        </div>
        <button className="btn btn-primary text-xs py-1.5 px-3 sm:text-[13px] sm:py-[7px] sm:px-[14px] shrink-0" onClick={openAdd}>
          <Plus size={13} className="sm:w-3.5 sm:h-3.5" /> <span>Add User</span>
        </button>
      </div>

      <div className="card p-3 sm:p-4 grid grid-cols-1 min-[760px]:grid-cols-[minmax(0,1fr)_220px] gap-2.5 items-center">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full min-[760px]:flex-1 min-w-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or email..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 justify-between w-full min-[760px]:w-auto min-[760px]:justify-end">
          <div className="flex items-center gap-1.5 min-w-0">
            <Filter size={13} className="text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="form-input text-xs py-1.5 min-w-[130px] w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="min-[760px]:col-span-2 mt-1 min-[760px]:mt-0">
          <span className="text-sm sm:text-base font-semibold text-slate-500">Total: {filteredUsers.length} users</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full min-w-[1100px] lg:min-w-[900px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[160px] lg:w-[130px]" />
            <col className="w-[240px] lg:w-[180px]" />
            <col className="w-[100px] lg:w-[90px]" />
            <col className="w-[100px] lg:w-[80px]" />
            <col className="w-[130px] lg:w-[100px]" />
            <col className="w-[170px] lg:w-[130px]" />
            <col className={canDelete ? "w-[120px] lg:w-[100px]" : "w-[80px] lg:w-[70px]"} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'center' }}>Email</th>
              <th style={{ textAlign: 'center' }}>Role</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Created</th>
              <th style={{ textAlign: 'center' }}>Last Activity</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  No users found in database.
                </td>
              </tr>
            ) : (
              pagedUsers.map(user => (
                <tr key={user.id}>
                  <td className="font-semibold text-slate-900" style={{ textAlign: 'left' }}>{user.name}</td>
                  <td className="font-mono text-xs text-slate-600" style={{ textAlign: 'center' }}>{user.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      <span className={`badge inline-flex min-w-[70px] justify-center text-[11px] font-semibold ${roleBadgeStyles[user.role.toLowerCase()] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex w-full justify-center">
                      <span className={`badge inline-flex min-w-[70px] justify-center ${user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-500" style={{ textAlign: 'center' }}>{user.created}</td>
                  <td className="text-xs text-slate-500 font-mono" style={{ textAlign: 'center' }}>{user.lastActivity}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex gap-1.5 justify-center">
                      <button className="btn btn-secondary btn-sm p-1.5 cursor-pointer" onClick={() => openEdit(user)} title="Edit">
                        <Edit size={13} />
                      </button>
                      {canDelete && (
                        <button className="btn btn-danger btn-sm p-1.5 cursor-pointer" onClick={() => handleDelete(user)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Showing {filteredUsers.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filteredUsers.length)} of {filteredUsers.length}
          </span>
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-xs text-slate-500">Rows per page:</span>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="text-xs border-slate-200 rounded-md py-1 px-2 pr-7 text-slate-600 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {[5, 10, 20, 50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'} min-w-[30px] justify-center`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-5 bg-white rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Full Name (Username) <span className="text-red-500">*</span></label>
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
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Email Address <span className="text-red-500">*</span></label>
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
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="form-input w-full"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r.toLowerCase()}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Password {!editUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => {
                    setForm(f => ({ ...f, password: e.target.value }))
                    if (errors.password) setErrors(err => ({ ...err, password: undefined }))
                  }}
                  className={`form-input w-full ${errors.password ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder={editUser ? 'Leave blank to keep unchanged' : 'Enter password'}
                />
                {errors.password && <p className="text-red-600 text-[11px] mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Confirm Password {!editUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={e => {
                    setForm(f => ({ ...f, password_confirmation: e.target.value }))
                    if (errors.password_confirmation) setErrors(err => ({ ...err, password_confirmation: undefined }))
                  }}
                  className={`form-input w-full ${errors.password_confirmation ? 'border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="Re-enter password"
                />
                {errors.password_confirmation && <p className="text-red-600 text-[11px] mt-1">{errors.password_confirmation}</p>}
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
                Save User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
