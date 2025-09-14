import React from 'react';
import { NavLink } from 'react-router-dom';

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ isOpen, onToggle }) => {
  // Current implemented pages
  const existingPages = [
    { path: '/', label: 'Overview', icon: '📊' },
    { path: '/gre', label: 'GRE Dashboard', icon: '📈' },
    { path: '/client-topics', label: 'Client Topics', icon: '👥' },
    { path: '/api-tables', label: 'API Tables', icon: '📑' },
    { path: '/topics', label: 'Topics', icon: '📝' },
    { path: '/acl', label: 'ACL', icon: '🔒' },
  ];
  
  // Future pages that will be implemented later
  const futurePlannedPages = [
    { path: '/sessions', label: 'Sessions', icon: '🔄' },
    { path: '/subscriptions', label: 'Subscriptions', icon: '📬' },
    { path: '/events', label: 'Events', icon: '📅' },
    { path: '/alerts', label: 'Alerts', icon: '⚠️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/diagnostics', label: 'Diagnostics', icon: '🔍' },
  ];
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={onToggle}
        />
      )}

      {/* Toggle button removed - using navbar hamburger instead */}
      
      {/* Sidebar */}
      <div className={`left-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Broker Dashboard</h2>
          <button className="close-sidebar" onClick={onToggle}>×</button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Main Navigation</div>
            {existingPages.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Coming Soon</div>
            {futurePlannedPages.map((item) => (
              <div
                key={item.path}
                className="sidebar-link disabled"
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                <span className="coming-soon-badge">Soon</span>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};