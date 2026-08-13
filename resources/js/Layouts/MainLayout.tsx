import { useState, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const { url } = usePage()

  // Derive activePage from URL (e.g., "/dashboard" -> "dashboard")
  const activePage = url === '/' ? 'dashboard' : url.split('/')[1] || 'dashboard'

  const sidebarWidth = sidebarCollapsed ? 56 : 220

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 679
      setIsMobile(nextIsMobile)
      if (nextIsMobile) {
        setMobileMenuOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F5F5F5' }}>
      <Sidebar
        activePage={activePage}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: isMobile ? 0 : sidebarWidth,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="max-[679px]:ml-0!"
      >
        <Header
          activePage={activePage}
          onMenuClick={() => setMobileMenuOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={url}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ width: '100%', maxWidth: 1420, minHeight: '100%', padding: isMobile ? '0 12px 24px' : '0 28px 28px' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
