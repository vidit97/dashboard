import React, { ReactNode, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LeftNavigation } from '../components/LeftNavigation'
import { TopBar } from '../components/TopBar'
import { useGlobalState } from '../hooks/useGlobalState'

interface V1LayoutProps {
  children: ReactNode
}

export const V1Layout: React.FC<V1LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, updateState, brokerStatus } = useGlobalState()

  // Responsive state management
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentPage = location.pathname.split('/').pop() || 'overview'
  const isMobile = screenWidth <= 768
  const isTablet = screenWidth <= 1024 && screenWidth > 768

  // Better responsive sidebar logic  
  const shouldPushContent = false // DISABLE MARGIN COMPLETELY FOR NOW
  const shouldOverlay = screenWidth <= 1024

  const handleBrokerChange = (broker: string) => {
    updateState({ broker })
  }

  const handleRefreshToggle = (autoRefresh: boolean) => {
    updateState({ autoRefresh })
  }

  const handleNowClick = () => {
    // Force refresh all components to current time
    // This can trigger re-renders for real-time data updates
  }

  const handlePageChange = (page: string) => {
    // Page change handled by React Router
  }

  const handleSidebarToggle = () => {
    updateState({ sidebarOpen: !state.sidebarOpen })
  }

  const handleHomeClick = () => {
    navigate('/v1/overview')
  }

  // Close sidebar when clicking on overlay
  const handleSidebarClose = () => {
    if (shouldOverlay) {
      updateState({ sidebarOpen: false })
    }
  }

  // Auto-close sidebar on small screens when they get too small
  useEffect(() => {
    if (screenWidth <= 768 && state.sidebarOpen) {
      updateState({ sidebarOpen: false })
    }
  }, [screenWidth, state.sidebarOpen])

  const handleOriginalNavbarToggle = () => {
    updateState({ showOriginalNavbar: !state.showOriginalNavbar })
    
    // Also notify the parent App component via a custom event
    window.dispatchEvent(new CustomEvent('toggleOriginalNavbar', { 
      detail: { show: !state.showOriginalNavbar } 
    }))
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f8fafc',
      overflow: 'hidden', // Prevent horizontal scroll at root level
      width: '100%'
    }}>
      {/* Left Navigation */}
      <LeftNavigation
        currentPage={currentPage}
        onPageChange={page => page === 'close' ? handleSidebarClose() : handlePageChange(page)}
        isOpen={state.sidebarOpen}
        screenWidth={screenWidth}
      />
      
      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: shouldPushContent ? '220px' : '0px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'visible',
        transition: 'margin-left 0.3s ease',
        position: 'relative',
        zIndex: 1,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%'
      }}>
        {/* Top Bar */}
        <TopBar
          brokerStatus={brokerStatus}
          onBrokerChange={handleBrokerChange}
          onRefreshToggle={handleRefreshToggle}
          onNowClick={handleNowClick}
          onSidebarToggle={handleSidebarToggle}
          onHomeClick={handleHomeClick}
          onOriginalNavbarToggle={handleOriginalNavbarToggle}
          globalState={state}
        />
        
        {/* Page Content */}
        <div className="page-content" style={{
          flex: 1,
          padding: '0', // Remove container padding to let content control its own spacing
          background: '#f8fafc',
          overflow: 'auto', // Allow scrolling at this level
          width: '100%',
          height: 'calc(100vh - 60px)' // Subtract top bar height
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}