import { X, LayoutDashboard, Warehouse, Package, MapPin, TruckIcon, Eye, Target, FileText, Settings, Users, User, ChevronRight, Layers } from 'lucide-react'
import { Link, usePage } from '@inertiajs/react'

const navSections = [
  {
    label: 'Main',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'Warehouse',
    items: [
      { id: 'warehouse-map', label: 'Warehouse Map', icon: MapPin },
      { id: 'roll-inventory', label: 'Roll Inventory', icon: Package },
      { id: 'slot-status', label: 'Slot Status', icon: Layers },
    ]
  },
  {
    label: 'Production',
    items: [
      { id: 'incoming-roll', label: 'Incoming Roll', icon: TruckIcon },
      { id: 'ocr-monitoring', label: 'OCR Monitoring', icon: Eye },
    ]
  },
  {
    label: 'Orders',
    items: [
      { id: 'target-order', label: 'Target Order', icon: Target },
      { id: 'jop', label: 'Job Order Production (JOP)', icon: FileText },
    ]
  },
  {
    label: 'Reports',
    items: [{ id: 'reports', label: 'Reports', icon: FileText }]
  },
  {
    label: 'Administration',
    items: [
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'profile', label: 'Profile', icon: User },
    ]
  },
]

interface SidebarProps {
  activePage: string
  collapsed: boolean
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ activePage, collapsed, mobileOpen, onClose }: SidebarProps) {
  const { props } = usePage()
  const authUser = (props.auth as any)?.user
  const isAdmin = authUser?.role === 'admin'

  return (
    <>
      {}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          style={{ display: 'block', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      <aside
        style={{
          width: collapsed && !mobileOpen ? 56 : 280,
          minWidth: collapsed && !mobileOpen ? 56 : 280,
          background: '#1e2d3d',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 40,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={mobileOpen ? "max-sm:translate-x-0" : "max-sm:-translate-x-full"}
      >
        {}
        <div style={{ padding: '0 12px', height: 56, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            background: 'linear-gradient(135deg, #337AB7, #286090)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontWeight: 700, color: '#fff', fontSize: 14
          }}>R</div>
          {(!collapsed || mobileOpen) && (
            <span style={{ fontWeight: 700, fontSize: 16, color: '#ffffff', letterSpacing: '0.04em' }}>ROLLYN</span>
          )}
          {mobileOpen && (
            <button
              className="max-sm:flex hidden ml-auto"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', paddingTop: 8 }}>
          {navSections.map(section => {
            const filteredItems = section.items.filter(item => {
              if (item.id === 'user-management' && !isAdmin) return false
              return true
            })
            
            if (filteredItems.length === 0) return null

            return (
              <div key={section.label} style={{ marginBottom: 12 }}>
                {(!collapsed || mobileOpen) && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 2 }}>
                    {section.label}
                  </div>
                )}
                {filteredItems.map(item => {
                  const Icon = item.icon
                  const isActive = activePage === item.id
                  return (
                    <Link
                      key={item.id}
                      href={`/${item.id}`}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      style={{ width: '100%', justifyContent: collapsed && !mobileOpen ? 'center' : 'flex-start', minHeight: 36 }}
                      onClick={() => mobileOpen && onClose()}
                      title={collapsed && !mobileOpen ? item.label : undefined}
                    >
                      <Icon size={18} style={{ flexShrink: 0 }} />
                      {(!collapsed || mobileOpen) && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
                      {(!collapsed || mobileOpen) && isActive && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {}
        {(!collapsed || mobileOpen) && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            ROLLYN v1.0.0 &copy; 2026 All Rights Reserved
          </div>
        )}
      </aside>
    </>
  )
}
