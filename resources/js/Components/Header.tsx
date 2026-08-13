import { Bell, Search, ChevronDown, PanelLeftClose, Menu, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { router } from '@inertiajs/react'

const pageLabels: Record<string, string[]> = {
  'dashboard': ['Dashboard'],
  'warehouse-map': ['Warehouse', 'Warehouse Map'],
  'roll-inventory': ['Warehouse', 'Roll Inventory'],
  'slot-status': ['Warehouse', 'Slot Status'],
  'incoming-roll': ['Production', 'Incoming Roll'],
  'ocr-monitoring': ['Production', 'OCR Monitoring'],
  'target-order': ['Orders', 'Target Order'],
  'jop': ['Orders', 'JOP (Job Order Production)'],
  'spk-po': ['Orders', 'SPK / PO'],
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
}

export default function Header({ activePage, onMenuClick, onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const crumbs = pageLabels[activePage] || ['Dashboard']
  const currentPageTitle = crumbs[crumbs.length - 1]

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
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-20 px-3 min-[680px]:px-5 flex items-center justify-between gap-2 shadow-xs select-none">
      {/* Mobile Brand / Toggle */}
      <div className="flex min-[680px]:hidden items-center gap-2.5 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors shrink-0"
          aria-label="Open mobile navigation"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-extrabold text-white text-xs shadow-xs">
            R
          </div>
          <span className="font-extrabold text-sm tracking-tight text-blue-900 truncate">ROLLYN</span>
        </div>

        <div className="hidden xs:flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] truncate max-w-[130px] border border-blue-100">
          {currentPageTitle}
        </div>
      </div>

      {/* Desktop Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className="hidden min-[680px]:flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeftClose size={18} className={sidebarCollapsed ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {/* Desktop Breadcrumbs */}
      <div className="hidden min-[680px]:flex items-center gap-1.5 text-xs flex-1 min-w-0 ml-2">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Desktop Search Bar */}
        <div className="hidden min-[680px]:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 w-44 focus-within:w-56 focus-within:bg-white focus-within:border-blue-500 transition-all">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-xs text-slate-800 w-full placeholder:text-slate-400"
          />
        </div>

        {/* Mobile Search Icon Button */}
        <button
          onClick={() => setMobileSearchOpen(true)}
          className="flex min-[680px]:hidden items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Notification Bell */}
        <button 
          onClick={() => router.visit('/notifications')}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              BS
            </div>
            <span className="hidden min-[680px]:inline text-xs font-medium text-slate-700 ml-0.5">Budi S.</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl min-w-[170px] shadow-xl z-50 overflow-hidden py-1">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">Budi Santoso</div>
                <div className="text-[11px] text-slate-500">Administrator</div>
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
                  router.visit('/login')
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs p-3 flex flex-col">
          <div className="bg-white rounded-xl shadow-2xl p-2.5 flex items-center gap-2">
            <Search size={18} className="text-slate-400 ml-1 shrink-0" />
            <input
              autoFocus
              placeholder="Search warehouse, rolls, orders..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 py-1"
            />
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
