import React, { useState, createContext, useContext } from 'react'
import { OverviewSection } from '../components/acl/OverviewSection'
import { RolesSection } from '../components/acl/RolesSection'
import { ClientsSection } from '../components/acl/ClientsSection'
import { BackupsSection } from '../components/acl/BackupsSection'
import { ActivitySection } from '../components/acl/ActivitySection'

type ACLTab = 'overview' | 'roles' | 'clients' | 'backups' | 'activity'

// Search context for global filtering
interface SearchContextType {
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => {}
})

export const useSearch = () => useContext(SearchContext)

export const ACLPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ACLTab>('overview')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')

  const handleRefresh = () => {
    setLastRefresh(new Date())
  }

  const tabs = [
    { id: 'overview' as ACLTab, label: 'Overview', icon: '📊' },
    { id: 'roles' as ACLTab, label: 'Roles', icon: '👥' },
    { id: 'clients' as ACLTab, label: 'Clients', icon: '🔗' },
    { id: 'backups' as ACLTab, label: 'Backups', icon: '💾' },
    { id: 'activity' as ACLTab, label: 'Activity', icon: '📝' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSection onRefresh={handleRefresh} />
      case 'roles':
        return <RolesSection onRefresh={handleRefresh} />
      case 'clients':
        return <ClientsSection onRefresh={handleRefresh} />
      case 'backups':
        return <BackupsSection onRefresh={handleRefresh} />
      case 'activity':
        return <ActivitySection onRefresh={handleRefresh} />
      default:
        return <OverviewSection onRefresh={handleRefresh} />
    }
  }

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      <div style={{ 
        padding: '24px', 
        maxWidth: '1200px', 
        margin: '0 auto',
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                margin: '0 0 8px 0',
                color: '#1f2937'
              }}>
                Access Control Lists (ACL)
              </h1>
              <p style={{ 
                fontSize: '16px', 
                color: '#6b7280', 
                margin: 0 
              }}>
                Manage MQTT broker access control, roles, and client permissions
              </p>
            </div>
            
            {/* Search Box */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search clients, roles, topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 36px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    width: '280px',
                    background: 'white'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  fontSize: '16px'
                }}>
                  🔍
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '18px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
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
        Connected to: {window.location.hostname}
      </div>
    </div>
    </SearchContext.Provider>
  )
}
