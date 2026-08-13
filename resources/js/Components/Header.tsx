import { Bell, Search, ChevronDown, PanelLeftClose, Menu, X } from 'lucide-react'
import { router } from '@inertiajs/core'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const mobileNavItems = [
  { label: 'Dashboard', value: '/dashboard' },
  { label: 'Warehouse Map', value: '/warehouse-map' },
  { label: 'Roll Inventory', value: '/roll-inventory' },
  { label: 'Slot Status', value: '/slot-status' },
  { label: 'Incoming Roll', value: '/incoming-roll' },
  { label: 'OCR Monitoring', value: '/ocr-monitoring' },
  { label: 'Target Order', value: '/target-order' },
  { label: 'JOP', value: '/jop' },
  { label: 'SPK / PO', value: '/spk-po' },
  { label: 'Reports', value: '/reports' },
  { label: 'User Management', value: '/user-management' },
  { label: 'Profile', value: '/profile' },
]

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const crumbs = pageLabels[activePage] || ['Dashboard']

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 679)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <button
            onClick={onMenuClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: '#333',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Open mobile navigation"
          >
            <Menu size={22} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 4,
              background: 'linear-gradient(135deg, #337AB7, #286090)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontSize: 12
            }}>R</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1a4e80', letterSpacing: '0.02em' }}>ROLLYN</span>
          </div>
        </div>
      )}

      {/* Desktop collapse toggle */}
      <button
        className="max-[679px]:hidden"
        onClick={onToggleSidebar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#777' }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <PanelLeftClose size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* Breadcrumb */}
      <div className="max-[679px]:hidden" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flex: 1 }}>
        {crumbs.map((c, i) => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: '#CCCCCC' }}>/</span>}
            <span style={{ color: i === crumbs.length - 1 ? '#333333' : '#777777', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* Desktop Search */}
      <div className="max-[679px]:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', border: '1px solid #DDDDDD', borderRadius: 4, padding: '6px 10px', width: 200 }}>
        <Search size={14} style={{ color: '#999' }} />
        <input placeholder="Search..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%', fontFamily: 'inherit' }} />
      </div>

      {/* Mobile Search Toggle */}
      {isMobile && (
        <button onClick={() => setMobileSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#555' }}>
          <Search size={18} />
        </button>
      )}

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

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #DDD', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Search size={18} style={{ color: '#999' }} />
                <input autoFocus placeholder="Search something..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 16, width: '100%', color: '#333' }} />
              </div>
              <button onClick={() => setMobileSearchOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
