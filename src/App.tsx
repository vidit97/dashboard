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
import './components/LeftSidebar.css'

const AppContent = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOriginalNavbar, setShowOriginalNavbar] = useState(false); // Hidden by default
  
  const isV1Route = location.pathname.startsWith('/v1');

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

  return (
    <div className="app-container">
      {/* Left Sidebar - only show on non-V1 routes */}
      {!isV1Route && <LeftSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />}
      
      <div className="main-content">
        {/* Top Navigation - conditionally show based on route and user preference */}
        {(!isV1Route || showOriginalNavbar) && (
          <nav className="nav-bar" style={{ 
            position: isV1Route ? 'relative' : undefined,
            zIndex: isV1Route ? 1000 : undefined 
          }}>
            <div className="nav-container">
              {/* Hamburger menu for sidebar toggle - only on non-V1 routes */}
              {!isV1Route && (
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
                  to="/" 
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  MQTT Dashboard
                </NavLink>
                <NavLink 
                  to="/gre" 
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  GRE
                </NavLink>
                <NavLink 
                  to="/client-topics" 
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  Client Topics
                </NavLink>
                <NavLink 
                  to="/api-tables" 
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  API Tables
                </NavLink>
                <NavLink 
                  to="/topics" 
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  Topic Management
                </NavLink>
                <NavLink 
                  to="/acl" 
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  ACL Management
                </NavLink>
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
                  🚀 V1 Dashboard
                </NavLink>
              </div>
            </div>
          </nav>
        )}

        {/* Routes */}
        <div className="page-content" style={{ 
          paddingTop: isV1Route && !showOriginalNavbar ? '0' : undefined 
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gre" element={<GreDashboard />} />
            <Route path="/client-topics" element={<ClientTopicPage />} />
            <Route path="/api-tables" element={<ApiTablesPage />} />
            <Route path="/topics" element={<TopicManagement />} />
            <Route path="/acl" element={<ACLPage />} />
            <Route path="/v1/*" element={<V1App />} />
          </Routes>
        </div>
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
