import React, { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LeftNavigation } from '../components/LeftNavigation'
import { TopBar } from '../components/TopBar'
import { useGlobalState } from '../hooks/useGlobalState'
import { TimeRange } from '../types/common'

interface V1LayoutProps {
  children: ReactNode
}

export const V1Layout: React.FC<V1LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, updateState, brokerStatus } = useGlobalState()
  
  const currentPage = location.pathname.split('/').pop() || 'overview'
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  const handleBrokerChange = (broker: string) => {
    updateState({ broker })
  }

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    updateState({ timeRange })
  }

  const handleSearchChange = (searchTerm: string) => {
    updateState({ searchTerm })
  }

  const handleRefreshToggle = (autoRefresh: boolean) => {
    updateState({ autoRefresh })
  }

  const handleNowClick = () => {
    // Force refresh all components to current time
    updateState({ timeRange: state.timeRange }) // Trigger re-render
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

  // Close sidebar when clicking on mobile overlay
  const handleSidebarClose = () => {
    if (isMobile) {
      updateState({ sidebarOpen: false })
    }
  }

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
      background: '#f8fafc'
    }}>
      {/* Left Navigation */}
      <LeftNavigation 
        currentPage={currentPage}
        onPageChange={page => page === 'close' ? handleSidebarClose() : handlePageChange(page)}
        isOpen={state.sidebarOpen}
      />
      
      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? '0px' : (state.sidebarOpen ? '260px' : '0px'),
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: isMobile ? 'none' : 'margin-left 0.3s ease'
      }}>
        {/* Top Bar */}
        <TopBar
          brokerStatus={brokerStatus}
          onBrokerChange={handleBrokerChange}
          onTimeRangeChange={handleTimeRangeChange}
          onSearchChange={handleSearchChange}
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
          padding: isMobile ? '16px' : '24px',
          overflowY: 'auto',
          background: '#f8fafc',
          maxWidth: '100vw',
          boxSizing: 'border-box'
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}