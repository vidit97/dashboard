import React from 'react'

interface V2TopBarProps {
  onSidebarToggle: () => void
  onNavigate: (path: string) => void
  globalState: any
  updateState: (updates: any) => void
}

export const V2TopBar: React.FC<V2TopBarProps> = ({
  onSidebarToggle,
  onNavigate,
  globalState,
  updateState
}) => {
  return (
    <header
      style={{
        height: '60px', // Fixed height
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        flexShrink: 0, // Don't shrink
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Left Side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Sidebar Toggle */}
        <button
          onClick={onSidebarToggle}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          ☰
        </button>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onNavigate('/v2/overview')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Dashboard
          </button>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
            {globalState.broker || 'Local Broker'}
          </span>
        </nav>
      </div>

      {/* Right Side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Broker Selector */}
        <select
          value={globalState.broker || 'local'}
          onChange={(e) => updateState({ broker: e.target.value })}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            background: '#ffffff',
            color: '#374151',
            cursor: 'pointer'
          }}
        >
          <option value="local">Local Broker</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
        </select>

        {/* Auto Refresh Toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            userSelect: 'none'
          }}
        >
          <input
            type="checkbox"
            checked={globalState.autoRefresh || false}
            onChange={(e) => updateState({ autoRefresh: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          Auto-refresh
        </label>

        {/* Now Button */}
        <button
          onClick={() => {
            // Trigger refresh of all components
            window.dispatchEvent(new CustomEvent('forceRefresh'))
          }}
          style={{
            padding: '6px 12px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
        >
          Now
        </button>

        {/* Back to V1 */}
        <button
          onClick={() => onNavigate('/v1/overview')}
          style={{
            padding: '6px 12px',
            background: 'none',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
            e.currentTarget.style.color = '#374151'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = '#6b7280'
          }}
        >
          Back to V1
        </button>
      </div>
    </header>
  )
}