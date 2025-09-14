import React from 'react'
import { NavLink } from 'react-router-dom'
import { V1_PAGES, LeftNavProps } from '../types/common'

export const LeftNavigation: React.FC<LeftNavProps> = ({ currentPage, onPageChange, isOpen }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  
  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            transition: 'opacity 0.3s ease'
          }}
          onClick={() => onPageChange('close')}
        />
      )}
      
      <div style={{
        width: isMobile ? (isOpen ? '280px' : '0px') : (isOpen ? '260px' : '0px'),
        height: '100vh',
        background: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        boxShadow: isMobile && isOpen ? '2px 0 10px rgba(0, 0, 0, 0.1)' : 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: isOpen ? '20px 24px' : '20px 0px',
          borderBottom: '1px solid #e2e8f0',
          background: 'white',
          minWidth: isMobile ? '280px' : '260px'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1e293b',
            margin: 0,
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            WatchMQTT
          </h1>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            marginTop: '4px',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            v1.0 Dashboard
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ 
          flex: 1, 
          padding: '16px 0',
          overflowY: 'auto',
          minWidth: isMobile ? '280px' : '260px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 24px 12px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '16px',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            Main Navigation
          </div>
        
        {V1_PAGES.map((page) => (
          <NavLink
            key={page.id}
            to={page.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              color: isActive ? '#3b82f6' : '#64748b',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              background: isActive ? '#eff6ff' : 'transparent',
              borderRight: isActive ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.2s ease'
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = '#f1f5f9'
                e.currentTarget.style.color = '#475569'
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#64748b'
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{page.icon}</span>
            <span>{page.label}</span>
          </NavLink>
        ))}
      </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: 'white',
          minWidth: isMobile ? '280px' : '260px'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            MQTT Broker Dashboard
            <br />
            <span style={{ color: '#94a3b8' }}>Built with React</span>
          </div>
        </div>
      </div>
    </>
  )
}