import React, { useState } from 'react'
import { TopBarProps, TimeRange } from '../types/common'

export const TopBar: React.FC<TopBarProps> = ({
  brokerStatus,
  onBrokerChange,
  onTimeRangeChange,
  onSearchChange,
  onRefreshToggle,
  onNowClick,
  onSidebarToggle,
  onHomeClick,
  onOriginalNavbarToggle,
  globalState
}) => {
  const [showCustomRange, setShowCustomRange] = useState(false)

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '15m', label: 'Last 15m' },
    { value: '1h', label: 'Last 1h' },
    { value: '6h', label: 'Last 6h' },
    { value: '24h', label: 'Last 24h' },
    { value: '7d', label: 'Last 7d' },
    { value: '30d', label: 'Last 30d' },
    { value: 'custom', label: 'Custom' },
  ]

  const handleTimeRangeChange = (range: TimeRange) => {
    onTimeRangeChange(range)
    if (range === 'custom') {
      setShowCustomRange(true)
    } else {
      setShowCustomRange(false)
    }
  }

  const getStatusColor = () => {
    switch (brokerStatus.color) {
      case 'green': return '#10b981'
      case 'amber': return '#f59e0b'
      case 'red': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className="top-bar" style={{
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '8px 16px',
      minHeight: '60px'
    }}>
      {/* Top Row - Main Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        marginBottom: '8px'
      }}>
        {/* Left Group - Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={onSidebarToggle}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>

          <button
            onClick={onHomeClick}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            title="Go to Overview"
          >
            🏠
          </button>
        </div>

        {/* Middle Group - Broker & Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>
              Broker:
            </label>
            <select
              value={globalState.broker}
              onChange={(e) => onBrokerChange(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '13px',
                background: 'white'
              }}
            >
              <option value="local">Local</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>
              Time:
            </label>
            <select
              value={globalState.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '13px',
                background: 'white'
              }}
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Group - Status & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor()
            }} />
            <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
              {brokerStatus.message}
            </span>
          </div>

          <button
            onClick={onOriginalNavbarToggle}
            style={{
              padding: '4px 8px',
              background: globalState.showOriginalNavbar ? '#ef4444' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title={globalState.showOriginalNavbar ? "Hide Original Navbar" : "Show Original Navbar"}
          >
            {globalState.showOriginalNavbar ? "Hide Nav" : "Show Nav"}
          </button>

          <button
            onClick={onNowClick}
            style={{
              padding: '6px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            Now
          </button>
        </div>
      </div>

      {/* Bottom Row - Search & Auto-refresh */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px', maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Search clients, topics, users..."
              value={globalState.searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              🔍
            </div>
          </div>
        </div>

        {/* Auto-refresh Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <label style={{ fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={globalState.autoRefresh}
              onChange={(e) => onRefreshToggle(e.target.checked)}
              style={{ margin: 0 }}
            />
            Auto-refresh
          </label>
          <select
            value={globalState.refreshInterval}
            onChange={(e) => {
              // Handle refresh interval change
            }}
            disabled={!globalState.autoRefresh}
            style={{
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              background: globalState.autoRefresh ? 'white' : '#f9fafb',
              color: globalState.autoRefresh ? 'black' : '#6b7280'
            }}
          >
            <option value={5}>5s</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
        </div>
      </div>

      {/* Custom Time Range Inputs */}
      {showCustomRange && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Custom Range:</span>
          <input
            type="datetime-local"
            onChange={(e) => {
              // Handle custom from time
            }}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <span style={{ color: '#6b7280', fontSize: '13px' }}>to</span>
          <input
            type="datetime-local"
            onChange={(e) => {
              // Handle custom to time
            }}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
        </div>
      )}
    </div>
  )
}