import React from 'react'

interface V2SidebarProps {
  isOpen: boolean
  currentPage: string
  onNavigate: (page: string) => void
  onClose: () => void
  width: number
  isMobile: boolean
}

const PAGES = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'topics', label: 'Topics', icon: '📝' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '👥' },
  { id: 'events', label: 'Events', icon: '📋' },
  { id: 'sessions', label: 'Sessions', icon: '🔗' },
  { id: 'clients', label: 'Clients', icon: '💻' },
  { id: 'alerts', label: 'Alerts', icon: '⚠️' },
  { id: 'acl', label: 'ACL', icon: '🔐' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🔧' }
]

export const V2Sidebar: React.FC<V2SidebarProps> = ({
  isOpen,
  currentPage,
  onNavigate,
  onClose,
  width,
  isMobile
}) => {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        transform: isOpen ? 'translateX(0)' : `translateX(-${width}px)`,
        transition: 'transform 0.3s ease',
        zIndex: 999,
        boxShadow: isMobile && isOpen ? '4px 0 10px rgba(0,0,0,0.1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // No scrolling needed in sidebar
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1e293b',
              margin: 0
            }}
          >
            WatchMQTT
          </h1>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              ×
            </button>
          )}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#64748b',
            marginTop: '4px'
          }}
        >
          v2.0 Dashboard
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 0' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 20px',
            marginBottom: '16px'
          }}
        >
          Navigation
        </div>

        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: currentPage === page.id ? '#eff6ff' : 'transparent',
              border: 'none',
              borderRight: currentPage === page.id ? '3px solid #3b82f6' : '3px solid transparent',
              color: currentPage === page.id ? '#3b82f6' : '#64748b',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== page.id) {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.color = '#374151'
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== page.id) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#64748b'
              }
            }}
          >
            <span style={{ fontSize: '18px' }}>{page.icon}</span>
            {page.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          fontSize: '12px',
          color: '#94a3b8',
          textAlign: 'center'
        }}
      >
        MQTT Broker Dashboard<br />
        Built with React
      </div>
    </aside>
  )
}