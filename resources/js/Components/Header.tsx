import { Bell, Search, ChevronDown, PanelLeftClose, Menu, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { router, usePage } from '@inertiajs/react'

const pageLabels: Record<string, string[]> = {
  'dashboard': ['Dashboard'],
  'training': ['SPECTRUM', 'Scale Reader Calibration'],
  'warehouse-map': ['Warehouse', 'Warehouse Map'],
  'roll-inventory': ['Warehouse', 'Roll Inventory'],
  'slot-status': ['Warehouse', 'Slot Status'],
  'incoming-roll': ['Production', 'Incoming Roll'],
  'ocr-monitoring': ['Production', 'OCR Monitoring'],
  'target-order': ['Orders', 'Target Order'],
  'jop': ['Orders', 'JOP (Job Order Production)'],
  'reports': ['Reports'],
  'user-management': ['Administration', 'User Management'],
  'profile': ['Administration', 'Profile'],
  'notifications': ['Notifications'],
}

interface HeaderProps {
  activePage: string
  onMenuClick: () => void
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
  hideSidebar?: boolean
}

export default function Header({ activePage, onMenuClick, onToggleSidebar, sidebarCollapsed, hideSidebar = false }: HeaderProps) {
  const { props } = usePage()
  const authUser = (props.auth as any)?.user

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const crumbs = pageLabels[activePage] || ['Dashboard']
  const currentPageTitle = crumbs[crumbs.length - 1]

  const userName = authUser?.username || 'Admin User'
  const userRole = authUser?.role ? (authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)) : 'Administrator'
  const userInitials = userName.substring(0, 2).toUpperCase()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="h-14 bg-white/70 backdrop-blur-xl border-b border-white/60 sticky top-0 z-20 px-3 sm:px-5 flex items-center justify-between gap-2 shadow-[0_4px_24px_rgba(0,0,0,0.02)] select-none">
      <div className="flex sm:hidden items-center gap-2.5 min-w-0 flex-1">
        {!hideSidebar && (
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100/50 hover:bg-slate-200/50 active:bg-slate-300/50 text-slate-800 transition-colors shrink-0 shadow-sm border border-transparent hover:border-white/80"
            aria-label="Open mobile navigation"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <img src="/images/logo-rollyn.png" alt="Rollyn Logo" className="w-7 h-7 object-contain drop-shadow-sm" />
          <span className="font-extrabold text-sm tracking-tight text-slate-800 drop-shadow-sm truncate">ROLLYN</span>
        </div>

        <div className="hidden xs:flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold text-[11px] truncate max-w-[130px] border border-blue-100 shadow-[inset_0_0_8px_rgba(37,99,235,0.05)]">
          {currentPageTitle}
        </div>
      </div>

      {!hideSidebar && (
        <button
          onClick={onToggleSidebar}
          className="hidden sm:flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition-colors shadow-sm border border-transparent hover:border-white/80"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeftClose size={18} className={sidebarCollapsed ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      )}

      <div className="hidden sm:flex items-center gap-1.5 text-sm sm:text-base flex-1 min-w-0 ml-2">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-slate-800 font-bold drop-shadow-sm' : 'text-slate-500'}>
              {c}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {((userRole || '').toLowerCase() === 'admin' || (userRole || '').toLowerCase() === 'ppic' || (userRole || '').toLowerCase() === 'administrator') && (
          <button
            onClick={() => router.visit('/notifications')}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/80 active:bg-slate-100 transition-colors shadow-sm"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-transparent" />
          </button>
        )}


        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white/80 transition-colors shadow-sm border border-transparent hover:border-white/80"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
              {userInitials}
            </div>
            <span className="hidden sm:inline text-xs font-bold text-slate-800 ml-0.5">{userName}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl min-w-[170px] shadow-xl z-50 overflow-hidden py-1">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">{userName}</div>
                <div className="text-[11px] text-slate-500">{userRole}</div>
              </div>
              <button
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => {
                  setProfileOpen(false)
                  router.visit('/profile')
                }}
              >
                Profile Settings
              </button>
              <button
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border-t border-slate-100 transition-colors"
                onClick={() => {
                  setProfileOpen(false)
                  router.post('/logout')
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  )
}
