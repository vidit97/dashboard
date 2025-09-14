import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import GreDashboard from './pages/GreDashboard'
import { ApiTablesPage } from './pages/ApiTablesPage'
import ClientTopicPage from './pages/ClientTopicPage'
import TopicManagement from './pages/TopicManagement'
import { ACLPage } from './pages/ACLPage'
import { ToastProvider } from './components/Toast'
import { LeftSidebar } from './components/LeftSidebar'
import './components/LeftSidebar.css'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // Toggle body class for wider screens
    if (window.innerWidth >= 768) {
      document.body.classList.toggle('sidebar-closed', sidebarOpen);
    }
    // Save preference to localStorage
    localStorage.setItem('sidebarOpen', (!sidebarOpen).toString());
  };
  
  // Load sidebar state from localStorage on initial render
  React.useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      const isOpen = savedSidebarState === 'true';
      setSidebarOpen(isOpen);
      if (!isOpen && window.innerWidth >= 768) {
        document.body.classList.add('sidebar-closed');
      }
    }
  }, []);

  return (
    <ToastProvider>
      <Router>
        <div className="app-container">
          {/* Left Sidebar */}
          <LeftSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          
          <div className="main-content">
            {/* Top Navigation */}
            <nav className="nav-bar">
              <div className="nav-container">
                {/* Hamburger menu for sidebar toggle */}
                <button 
                  className="hamburger-menu always-visible" 
                  onClick={toggleSidebar}
                  aria-label="Toggle navigation menu"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4h14v2H2V4zm0 5h14v2H2V9zm0 5h14v2H2v-2z" />
                  </svg>
                </button>
                
                {/* <div className="nav-brand">
                  <h1>Monitoring Dashboard</h1>
                </div> */}
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
                </div>
              </div>
            </nav>

            {/* Routes */}
            <div className="page-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/gre" element={<GreDashboard />} />
                <Route path="/client-topics" element={<ClientTopicPage />} />
                <Route path="/api-tables" element={<ApiTablesPage />} />
                <Route path="/topics" element={<TopicManagement />} />
                <Route path="/acl" element={<ACLPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </ToastProvider>
  )
}
