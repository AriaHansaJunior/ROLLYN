import { Menu, Bell, Search, ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useState } from 'react'

const pageLabels: Record<string, string[]> = {
  'dashboard': ['Dashboard'],
  'warehouse-map': ['Warehouse', 'Warehouse Map'],
  'roll-inventory': ['Warehouse', 'Roll Inventory'],
  'slot-status': ['Warehouse', 'Slot Status'],
  'incoming-roll': ['Production', 'Incoming Roll'],
  'ocr-monitoring': ['Production', 'OCR Monitoring'],
  'target-order': ['Orders', 'Target Order'],
  'jop': ['Orders', 'JOP'],
  'spk-po': ['Orders', 'SPK / PO'],
  'reports': ['Reports'],
  'user-management': ['Administration', 'User Management'],
  'profile': ['Administration', 'Profile'],
}

interface HeaderProps {
  activePage: string
  onMenuClick: () => void
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
}

export default function Header({ activePage, onMenuClick, onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const crumbs = pageLabels[activePage] || ['Dashboard']

  return (
    <header style={{
      height: 56,
      background: '#ffffff',
      borderBottom: '1px solid #DDDDDD',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      {/* Mobile hamburger */}
      <button
        className="max-[679px]:flex hidden"
        onClick={onMenuClick}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#555' }}
      >
        <Menu size={20} />
      </button>

      {/* Desktop collapse toggle */}
      <button
        className="max-[679px]:hidden"
        onClick={onToggleSidebar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#777' }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flex: 1 }}>
        {crumbs.map((c, i) => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: '#CCCCCC' }}>/</span>}
            <span style={{ color: i === crumbs.length - 1 ? '#333333' : '#777777', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="max-[679px]:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', border: '1px solid #DDDDDD', borderRadius: 4, padding: '6px 10px', width: 200 }}>
        <Search size={14} style={{ color: '#999' }} />
        <input placeholder="Search..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%', fontFamily: 'inherit' }} />
      </div>

      {/* Notification */}
      <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#555' }}>
        <Bell size={18} />
        <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#C0392B', border: '2px solid #fff' }} />
      </button>

      {/* Profile */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
        >
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#286090', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            BS
          </div>
          <span className="max-[679px]:hidden" style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Budi S.</span>
          <ChevronDown size={14} style={{ color: '#777' }} />
        </button>
        {profileOpen && (
          <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #DDDDDD', borderRadius: 4, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50 }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #EEEEEE' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Budi Santoso</div>
              <div style={{ fontSize: 11, color: '#777' }}>Administrator</div>
            </div>
            <button style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#333' }}
              onClick={() => { setProfileOpen(false) }}>Profile Settings</button>
            <button style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', borderTop: '1px solid #EEEEEE' }}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
