import { useState, useEffect, ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import Sidebar from '../Components/Sidebar'
import Header from '../Components/Header'

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { url, props } = usePage()

  const authUser = (props.auth as any)?.user
  const userRole = (authUser?.role ?? 'admin').toLowerCase()
  const hideSidebar = userRole === 'production' || userRole === 'qc'

  const activePage = url === '/' ? 'dashboard' : url.split('/')[1] || 'dashboard'

  const sidebarWidth = hideSidebar ? 0 : (sidebarCollapsed ? 56 : 280)

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F5F5F5', width: '100vw', maxWidth: '100vw' }}>
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
          maxWidth: '100%',
          marginLeft: isMobile || hideSidebar ? 0 : sidebarWidth,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
        className={!hideSidebar ? "max-sm:ml-0!" : ""}
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
              maxWidth: 1420,
              minHeight: '100%',
              padding: isMobile ? '0 12px 24px' : '0 28px 28px',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
