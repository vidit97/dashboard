import React, { useCallback, useState, useEffect } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { useManualRefresh } from '../hooks/useManualRefresh'
// Moving subscription components from subscriptions page
import { ActiveSubscriptions } from '../../ui/ActiveSubscriptions'
import { SubscriptionState } from '../../ui/SubscriptionState'

export const V2TopicsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Add responsive styles based on window width
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: windowWidth < 768 
      ? '1fr' 
      : windowWidth < 1200 
        ? 'repeat(auto-fit, minmax(300px, 1fr))'
        : 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden'
  }

  // Manual refresh function that forces child components to refresh
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Listen for manual refresh events
  useManualRefresh(triggerRefresh, 'Topics')

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Topics
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Topic subscription analytics and lifecycle management
        </p>
      </div>

      {/* Subscription Analytics Row */}
      <div style={gridStyle}>
        <div style={{ 
          width: '100%', 
          minWidth: 0, 
          overflow: 'hidden'
        }}>
          <style>{`
            .active-subscriptions-wrapper .chart-container {
              height: ${windowWidth < 768 ? '400px' : '450px'} !important;
              min-height: ${windowWidth < 768 ? '400px' : '450px'} !important;
              overflow: visible !important;
            }
            .active-subscriptions-wrapper .chart-container .recharts-wrapper {
              overflow: visible !important;
            }
          `}</style>
          <div className="active-subscriptions-wrapper">
            <ActiveSubscriptions refreshTrigger={refreshTrigger} />
          </div>
        </div>
        <div style={{ 
          width: '100%', 
          minWidth: 0, 
          overflow: 'hidden'
        }}>
          <SubscriptionState refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  )
}