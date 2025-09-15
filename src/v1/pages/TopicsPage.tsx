import React from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
// Moving subscription components from subscriptions page
import { ActiveSubscriptions } from '../../ui/ActiveSubscriptions'
import { SubscriptionState } from '../../ui/SubscriptionState'

export const TopicsPage: React.FC = () => {
  const { state } = useGlobalState()

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <ActiveSubscriptions />
        <SubscriptionState />
      </div>
    </div>
  )
}