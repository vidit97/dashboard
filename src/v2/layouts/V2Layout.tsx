import React, { ReactNode, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { V2Sidebar } from '../components/V2Sidebar'
import { V2TopBar } from '../components/V2TopBar'
import { useGlobalState } from '../hooks/useGlobalState'

interface V2LayoutProps {
  children: ReactNode
}

export const V2Layout: React.FC<V2LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, updateState } = useGlobalState()

  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentPage = location.pathname.split('/').pop() || 'overview'
  const isMobile = screenWidth <= 768
  const sidebarWidth = 240

  const handleSidebarToggle = () => {
    updateState({ sidebarOpen: !state.sidebarOpen })
  }

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile && state.sidebarOpen) {
      updateState({ sidebarOpen: false })
    }
  }, [isMobile])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#f8fafc',
        display: 'flex',
        overflow: 'hidden' // Prevent any scrolling at root level
      }}
    >
      {/* Sidebar */}
      <V2Sidebar
        isOpen={state.sidebarOpen}
        currentPage={currentPage}
        onNavigate={(page) => navigate(`/v2/${page}`)}
        onClose={() => updateState({ sidebarOpen: false })}
        width={sidebarWidth}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: isMobile ? 0 : (state.sidebarOpen ? sidebarWidth : 0),
          transition: 'margin-left 0.3s ease',
          height: '100vh',
          overflow: 'hidden', // No scrolling at this level
          minWidth: 0 // Prevent flex overflow
        }}
      >
        {/* Top Bar - Fixed Height */}
        <V2TopBar
          onSidebarToggle={handleSidebarToggle}
          onNavigate={navigate}
          globalState={state}
          updateState={updateState}
        />

        {/* Page Content - Single Scrollable Area */}
        <main
          style={{
            flex: 1,
            overflow: 'auto', // ONLY scroll container in the entire app
            background: '#f8fafc',
            padding: '20px',
            minHeight: 0 // Allow flexbox to shrink this
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && state.sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
          onClick={() => updateState({ sidebarOpen: false })}
        />
      )}
    </div>
  )
}