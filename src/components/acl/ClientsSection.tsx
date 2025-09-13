import React, { useState, useEffect } from 'react'
import { ACLApiService } from '../../services/aclApi'
import { ProcessedClient, RoleData } from '../../config/aclApi'
import { CreateClientModal } from './CreateClientModal'
import { ClientDetailPane } from './ClientDetailPane'
import { useSearch } from '../../pages/ACLPage'

interface ClientsSectionProps {
  onRefresh?: () => void
}

export const ClientsSection: React.FC<ClientsSectionProps> = ({ onRefresh }) => {
  const [clients, setClients] = useState<ProcessedClient[]>([])
  const [availableRoles, setAvailableRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ProcessedClient | null>(null)
  const { searchTerm } = useSearch()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ACLApiService.getState()
      if (result.ok && result.data) {
        const processedClients = ACLApiService.processClients(result.data)
        setClients(processedClients)
        
        // Extract available roles for the modal
        const roles = result.data.data_json?.roles || []
        setAvailableRoles(roles.filter((role: any) => role.rolename))
      } else {
        setError(result.error?.message || 'Failed to load clients')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadData()
    onRefresh?.()
  }

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    handleRefresh()
  }

  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    
    // Search username
    if (client.username && client.username.toLowerCase().includes(term)) {
      return true
    }
    
    // Search role names
    if (client.roles && client.roles.some(role => 
      role.rolename && role.rolename.toLowerCase().includes(term)
    )) {
      return true
    }
    
    return false
  })

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#6b7280' 
      }}>
        Loading clients...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#dc2626' 
      }}>
        Error: {error}
        <br />
        <button 
          onClick={loadData}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: '0 20px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            Clients ({filteredClients.length})
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              New Client
            </button>
            <button 
              onClick={handleRefresh}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Refresh
            </button>
          </div>
        </div>

      {/* Clients Table */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {filteredClients.length === 0 ? (
          <div style={{ 
            padding: '32px', 
            textAlign: 'center', 
            color: '#6b7280' 
          }}>
            {searchTerm ? 'No clients match your search' : 'No clients found'}
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ 
                background: '#f9fafb', 
                borderBottom: '1px solid #e5e7eb'
              }}>
                <tr>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Username
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Role Count
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Roles
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => {
                  const roles = client.roles || []
                  return (
                    <tr 
                      key={client.username}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                        <button
                          onClick={() => setSelectedClient(client)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '14px',
                            textDecoration: 'underline'
                          }}
                        >
                          {client.username}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        {client.role_count}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span 
                          style={{
                            padding: '4px 12px',
                            background: client.status === 'enabled' ? '#dcfce7' : '#fef2f2',
                            color: client.status === 'enabled' ? '#166534' : '#dc2626',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {roles.length > 0 ? (
                            roles.slice(0, 3).map((role, idx) => (
                              <span 
                                key={idx}
                                style={{
                                  padding: '2px 8px',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}
                              >
                                {role.rolename}({role.priority})
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                              No roles
                            </span>
                          )}
                          {roles.length > 3 && (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>
                              +{roles.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                        {new Date(client.last_updated).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
      
      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        availableRoles={availableRoles}
      />
      
      {/* Client Detail Pane */}
      {selectedClient && (
        <ClientDetailPane
          client={selectedClient}
          availableRoles={availableRoles}
          onClose={() => setSelectedClient(null)}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  )
}
