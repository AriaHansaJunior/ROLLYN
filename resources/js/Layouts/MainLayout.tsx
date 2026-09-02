import { useState, useEffect, ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import Sidebar from '../Components/Sidebar'
import Header from '../Components/Header'

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { url, props } = usePage()

  const authUser = (props.auth as any)?.user
  const userRole = (authUser?.role ?? 'admin').toLowerCase()
  const hideSidebar = false

  const activePage = url === '/' ? 'dashboard' : url.split('/')[1] || 'dashboard'

  const sidebarWidth = hideSidebar ? 0 : (sidebarCollapsed ? 56 : 280)

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 680
      setIsMobile(nextIsMobile)
      if (!nextIsMobile) {
        setMobileMenuOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative bg-slate-50" style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      {/* Background Atmosphere for Light Glass UI */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-cyan-50/50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] bg-indigo-50/50 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full h-full">
        {!hideSidebar && (
          <Sidebar
            activePage={activePage}
            collapsed={sidebarCollapsed}
            mobileOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        )}

      {}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
          paddingLeft: isMobile || hideSidebar ? 0 : sidebarWidth,
          transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
        className={!hideSidebar ? "max-sm:pl-0" : ""}
      >
        <Header
          activePage={activePage}
          onMenuClick={() => setMobileMenuOpen(prev => !prev)}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          sidebarCollapsed={sidebarCollapsed}
          hideSidebar={hideSidebar}
        />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              minHeight: '100%',
              padding: isMobile ? '0 12px 24px' : '0 28px 28px',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
    </div>
  )
}
