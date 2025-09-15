import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
// Reusing existing ACL components
import { OverviewSection } from '../../components/acl/OverviewSection'
import { RolesSection } from '../../components/acl/RolesSection'
import { ClientsSection } from '../../components/acl/ClientsSection'
import { BackupsSection } from '../../components/acl/BackupsSection'
import { ActivitySection } from '../../components/acl/ActivitySection'

type ACLTab = 'overview' | 'roles' | 'clients' | 'activity' | 'backups'

export const V2ACLPage: React.FC = () => {
  const { state } = useGlobalState()
  const [activeTab, setActiveTab] = useState<ACLTab>('overview')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const handleRefresh = () => {
    setLastRefresh(new Date())
  }

  const tabs = [
    { id: 'overview' as ACLTab, label: 'Overview', icon: '📊' },
    { id: 'roles' as ACLTab, label: 'Roles', icon: '🔐' },
    { id: 'clients' as ACLTab, label: 'Clients', icon: '👥' },
    { id: 'activity' as ACLTab, label: 'Activity', icon: '📋' },
    { id: 'backups' as ACLTab, label: 'Backups', icon: '💾' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSection onRefresh={handleRefresh} />
      case 'roles':
        return <RolesSection onRefresh={handleRefresh} />
      case 'clients':
        return <ClientsSection onRefresh={handleRefresh} />
      case 'activity':
        return <ActivitySection onRefresh={handleRefresh} />
      case 'backups':
        return <BackupsSection onRefresh={handleRefresh} />
      default:
        return <OverviewSection onRefresh={handleRefresh} />
    }
  }

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
          ACL (Dynamic Security)
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Live roles/clients/ACLs control with audit for {state.broker} broker
        </p>
      </div>

      {/* Status Tiles Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>12</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Roles Count</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>48</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Clients Count</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>v127</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Last Refresh</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>2h ago</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Last Backup</div>
        </div>
      </div>

      {/* Default ACL Access Display */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        marginBottom: '32px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Default ACL Access
        </h3>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📤</span>
            <span style={{ fontSize: '14px' }}>Publish Send:</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              background: '#d1fae5',
              color: '#065f46'
            }}>
              Allow
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📥</span>
            <span style={{ fontSize: '14px' }}>Publish Receive:</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              background: '#d1fae5',
              color: '#065f46'
            }}>
              Allow
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📝</span>
            <span style={{ fontSize: '14px' }}>Subscribe:</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              background: '#d1fae5',
              color: '#065f46'
            }}>
              Allow
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>❌</span>
            <span style={{ fontSize: '14px' }}>Unsubscribe:</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              background: '#d1fae5',
              color: '#065f46'
            }}>
              Allow
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '8px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.color = '#374151'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#6b7280'
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        minHeight: '500px'
      }}>
        {renderContent()}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f1f5f9',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#64748b'
      }}>
        Last refresh: {lastRefresh.toLocaleString()} •
        Connected to: {state.broker} broker
      </div>
    </div>
  )
}