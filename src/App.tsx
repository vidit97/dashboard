import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import GreDashboard from './pages/GreDashboard'
import { ApiTablesPage } from './pages/ApiTablesPage'
import ClientTopicPage from './pages/ClientTopicPage'
import TopicManagement from './pages/TopicManagement'
import { ACLPage } from './pages/ACLPage'
import { ToastProvider } from './components/Toast'
import { LeftSidebar } from './components/LeftSidebar'
import { V1App } from './v1/V1App'
import { V2App } from './v2/V2App'
import { LoginPage } from './components/LoginPage'
import { BrokerSelection } from './components/BrokerSelection'
import './components/LeftSidebar.css'

const AppContent = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOriginalNavbar, setShowOriginalNavbar] = useState(false); // Hidden by default

  // ===== DEVELOPMENT LOGIN BYPASS =====
  // Set BYPASS_LOGIN to true to skip login and go directly to broker selection
  // Set BYPASS_BROKER_SELECTION to true to skip both login and broker selection entirely
  const BYPASS_LOGIN = true; // TODO: Set to false for production
  const BYPASS_BROKER_SELECTION = false; // TODO: Set to false for production
  // ===================================

  const [isLoggedIn, setIsLoggedIn] = useState(BYPASS_LOGIN);
  const [showBrokerSelection, setShowBrokerSelection] = useState(BYPASS_LOGIN && !BYPASS_BROKER_SELECTION);
  const [username, setUsername] = useState(BYPASS_LOGIN ? 'dev-user' : '');
  const [selectedBroker, setSelectedBroker] = useState(BYPASS_BROKER_SELECTION ? 'dev-broker' : '');

  const isV1Route = location.pathname.startsWith('/v1');
  const isV2Route = location.pathname.startsWith('/v2');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // Toggle body class for wider screens
    if (window.innerWidth >= 768) {
      document.body.classList.toggle('sidebar-closed', sidebarOpen);
    }
    // Save preference to localStorage
    localStorage.setItem('sidebarOpen', (!sidebarOpen).toString());
  };

  const toggleOriginalNavbar = () => {
    setShowOriginalNavbar(!showOriginalNavbar);
    // Save preference to localStorage
    localStorage.setItem('showOriginalNavbar', (!showOriginalNavbar).toString());
  };
  
  // Load preferences from localStorage on initial render
  React.useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      const isOpen = savedSidebarState === 'true';
      setSidebarOpen(isOpen);
      if (!isOpen && window.innerWidth >= 768) {
        document.body.classList.add('sidebar-closed');
      }
    }

    const savedNavbarState = localStorage.getItem('showOriginalNavbar');
    if (savedNavbarState !== null) {
      setShowOriginalNavbar(savedNavbarState === 'true');
    }

    // Listen for original navbar toggle events from V1 dashboard
    const handleNavbarToggle = (event: CustomEvent) => {
      setShowOriginalNavbar(event.detail.show);
      localStorage.setItem('showOriginalNavbar', event.detail.show.toString());
    };

    window.addEventListener('toggleOriginalNavbar', handleNavbarToggle as EventListener);
    
    return () => {
      window.removeEventListener('toggleOriginalNavbar', handleNavbarToggle as EventListener);
    };
  }, []);

  const handleLogin = (user: string) => {
    setUsername(user)
    setIsLoggedIn(true)
    setShowBrokerSelection(true)
  }

  const handleBrokerSelect = (brokerId: string) => {
    setSelectedBroker(brokerId)
    setShowBrokerSelection(false)
    // Update global state or context with selected broker here if needed
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setShowBrokerSelection(false)
    setUsername('')
    setSelectedBroker('')
  }

  // ===== LEGACY ROUTES BYPASS =====
  // Allow direct access to legacy pages without login/broker selection
  // Routes: /api-tables, /gre, /topics, /topic-management, /acl
  const isLegacyRoute = location.pathname.match(/^\/(api-tables|gre|topics|topic-management|acl)$/)

  if (isLegacyRoute) {
    // Direct access to legacy pages without login/broker selection
    return (
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/api-tables" element={<ApiTablesPage />} />
            <Route path="/gre" element={<GreDashboard />} />
            <Route path="/topics" element={<ClientTopicPage />} />
            <Route path="/topic-management" element={<TopicManagement />} />
            <Route path="/acl" element={<ACLPage />} />
          </Routes>
        </div>
      </div>
    )
  }
  // ===================================

  // Show login page if not logged in (unless bypassed)
  if (!isLoggedIn && !BYPASS_LOGIN) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Show broker selection if logged in but no broker selected (unless bypassed)
  if (showBrokerSelection && !BYPASS_BROKER_SELECTION) {
    return (
      <BrokerSelection
        onBrokerSelect={handleBrokerSelect}
        onLogout={handleLogout}
        username={username}
      />
    )
  }

  return (
    <div className="app-container">
      {/* Left Sidebar - hidden since we use V2 by default */}
      
      <div className="main-content">
        {/* Top Navigation - only show when on V1 route with showOriginalNavbar */}
        {(isV1Route && showOriginalNavbar) && (
          <nav className="nav-bar" style={{ 
            position: isV1Route ? 'relative' : undefined,
            zIndex: isV1Route ? 1000 : undefined 
          }}>
            <div className="nav-container">
              {/* Hamburger menu for sidebar toggle - only on legacy routes */}
              {false && (
                <button 
                  className="hamburger-menu always-visible" 
                  onClick={toggleSidebar}
                  aria-label="Toggle navigation menu"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4h14v2H2V4zm0 5h14v2H2V9zm0 5h14v2H2v-2z" />
                  </svg>
                </button>
              )}

              {/* Toggle button for original navbar when on V1 route */}
              {isV1Route && (
                <button 
                  onClick={toggleOriginalNavbar}
                  style={{
                    padding: '8px 12px',
                    background: showOriginalNavbar ? '#ef4444' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginRight: '16px'
                  }}
                  title={showOriginalNavbar ? "Hide Original Navbar" : "Show Original Navbar"}
                >
                  {showOriginalNavbar ? "Hide Original Nav" : "Show Original Nav"}
                </button>
              )}

              <div className="nav-links">
                <NavLink
                  to="/v1"
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                  style={{
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: '600'
                  }}
                >
                  🚀 V1 Dashboard (Legacy)
                </NavLink>
              </div>
            </div>
          </nav>
        )}

        {/* Routes */}
        {isV1Route ? (
          // V1 routes - with existing wrapper
          <div className="page-content" style={{
            paddingTop: isV1Route && !showOriginalNavbar ? '0' : undefined
          }}>
            <Routes>
              <Route path="/v1/*" element={<V1App />} />
            </Routes>
          </div>
        ) : isV2Route ? (
          // V2 routes - full screen with no wrapper
          <Routes>
            <Route path="/v2/*" element={<V2App />} />
          </Routes>
        ) : (
          // Default to V2 dashboard
          <Routes>
            <Route path="/*" element={<V2App />} />
          </Routes>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  )
}
