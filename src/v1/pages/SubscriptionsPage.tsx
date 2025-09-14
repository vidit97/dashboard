import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
// Reusing existing components
import { ActiveSubscriptions } from '../../ui/ActiveSubscriptions'
import { SubscriptionState } from '../../ui/SubscriptionState'
import SubscriptionChurn from '../../components/SubscriptionChurn'

export const SubscriptionsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [topicFilter, setTopicFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [qosFilter, setQosFilter] = useState<'all' | '0' | '1' | '2'>('all')

  // Mock subscription data
  const mockSubscriptions = [
    {
      client: 'sensor_001',
      topic: 'sensors/temperature/+',
      qos: 1,
      active: true,
      last_subscribe_ts: '2024-01-15 09:30:00',
      last_unsubscribe_ts: null,
      source: 'device'
    },
    {
      client: 'dashboard_client',
      topic: 'alerts/#',
      qos: 2,
      active: true,
      last_subscribe_ts: '2024-01-15 10:25:00',
      last_unsubscribe_ts: null,
      source: 'application'
    },
    {
      client: 'mobile_app_xyz',
      topic: 'user/123/notifications',
      qos: 0,
      active: false,
      last_subscribe_ts: '2024-01-15 08:45:00',
      last_unsubscribe_ts: '2024-01-15 10:20:00',
      source: 'mobile'
    }
  ]

  const filteredSubscriptions = mockSubscriptions.filter(sub => {
    const matchesTopic = topicFilter === '' || sub.topic.toLowerCase().includes(topicFilter.toLowerCase())
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' && sub.active) ||
      (activeFilter === 'inactive' && !sub.active)
    const matchesQos = qosFilter === 'all' || sub.qos.toString() === qosFilter
    return matchesTopic && matchesActive && matchesQos
  })

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
          Subscriptions
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          margin: 0 
        }}>
          Who listens to what - subscription monitoring and analysis
        </p>
      </div>

      {/* Subscription Analytics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <ActiveSubscriptions className="chart-half-width" />
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <SubscriptionState className="chart-half-width" />
        </div>
      </div>

      {/* Subscription Churn Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <SubscriptionChurn 
            className="chart-full-width"
            refreshInterval={120}
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Subscription Details
            </h2>
          </div>
          
          {/* Filters */}
          <div style={{
            padding: '16px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="Topic prefix filter..."
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '250px'
              }}
            />
            
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            
            <select 
              value={qosFilter}
              onChange={(e) => setQosFilter(e.target.value as 'all' | '0' | '1' | '2')}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All QoS</option>
              <option value="0">QoS 0</option>
              <option value="1">QoS 1</option>
              <option value="2">QoS 2</option>
            </select>

            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Topic</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>QoS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Subscribe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Unsubscribe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub, index) => (
                  <tr 
                    key={index}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {sub.client}
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      color: '#1f2937',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      background: '#f8fafc',
                      maxWidth: '200px',
                      wordBreak: 'break-all'
                    }}>
                      {sub.topic}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: sub.qos === 0 ? '#f3f4f6' : sub.qos === 1 ? '#fef3c7' : '#fee2e2',
                        color: sub.qos === 0 ? '#374151' : sub.qos === 1 ? '#92400e' : '#991b1b'
                      }}>
                        QoS {sub.qos}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: sub.active ? '#d1fae5' : '#fee2e2',
                        color: sub.active ? '#065f46' : '#991b1b'
                      }}>
                        {sub.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {sub.last_subscribe_ts}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {sub.last_unsubscribe_ts || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: '#e0e7ff',
                        color: '#3730a3'
                      }}>
                        {sub.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'between',
            alignItems: 'center',
            background: '#f8fafc'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {filteredSubscriptions.length} of {mockSubscriptions.length} subscriptions
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer'
              }}>
                Previous
              </button>
              <button style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer'
              }}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}