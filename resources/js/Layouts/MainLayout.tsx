import { useState, ReactNode } from 'react'
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
  const { url } = usePage()

  // Derive activePage from URL (e.g., "/dashboard" -> "dashboard")
  const activePage = url === '/' ? 'dashboard' : url.split('/')[1] || 'dashboard'

  const sidebarWidth = sidebarCollapsed ? 56 : 220

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F5' }}>
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
          marginLeft: sidebarWidth,
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
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={url}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ minHeight: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
