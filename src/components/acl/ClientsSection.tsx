import React, { useState, useEffect } from 'react'
import { ACLApiService } from '../../services/aclApi'
import { ProcessedClient, RoleData } from '../../config/aclApi'
import { CreateClientModal } from './CreateClientModal'
import { ClientDetailPane } from './ClientDetailPane'
import { useSearch } from '../../pages/ACLPage'
import { useToast } from '../Toast'

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
  const [selectedClients, setSelectedClients] = useState(new Set<string>())
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)
  const { searchTerm } = useSearch()
  const { addToast } = useToast()

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
        
        // Update selectedClient with fresh data if it exists
        if (selectedClient) {
          const updatedClient = processedClients.find(c => c.username === selectedClient.username)
          if (updatedClient) {
            setSelectedClient(updatedClient)
          }
        }
        
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

  // Multi-select helper functions (defined after filteredClients)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(filteredClients.map(c => c.username)))
    } else {
      setSelectedClients(new Set())
    }
  }

  const handleSelectClient = (username: string, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(username)
      // Clear single selection when entering multi-select mode
      setSelectedClient(null)
    } else {
      newSelected.delete(username)
    }
    setSelectedClients(newSelected)
  }

  const isAllSelected = filteredClients.length > 0 && 
    filteredClients.every(client => selectedClients.has(client.username))
  
  const isIndeterminate = selectedClients.size > 0 && !isAllSelected

  // Define result type for bulk operations
  interface OperationResult {
    username: string
    success: boolean
    error?: string
  }

  // Bulk operations
  const handleBulkDisable = async () => {
    if (selectedClients.size === 0) return
    
    setBulkOperationLoading(true)
    const clientUsernames = Array.from(selectedClients) as string[]
    const results: OperationResult[] = []

    // Show initial queuing message
    addToast({
      type: 'info',
      title: 'Processing...',
      message: `Queuing disable operations for ${clientUsernames.length} client(s)...`
    })

    for (const username of clientUsernames) {
      try {
        const result = await ACLApiService.disableClient(username)
        
        if (result.ok && result.data?.queued) {
          const queueId = result.data.queue_id
          if (queueId) {
            // Wait for completion
            const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
            if (pollResult.ok) {
              results.push({ username, success: true })
            } else {
              results.push({ 
                username, 
                success: false, 
                error: pollResult.error?.message || 'Operation failed during processing'
              })
            }
          } else {
            results.push({ username, success: false, error: 'No queue ID returned' })
          }
        } else {
          results.push({ username, success: false, error: result.error?.message || 'Failed to queue operation' })
        }
      } catch (err) {
        results.push({ 
          username, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Show final results
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    if (successful.length > 0) {
      addToast({
        type: 'success',
        title: 'Bulk Disable Completed Successfully',
        message: `Successfully disabled ${successful.length} client(s)`
      })
    }

    if (failed.length > 0) {
      addToast({
        type: 'error',
        title: 'Some Operations Failed',
        message: `Failed to disable ${failed.length} client(s): ${failed.map(f => f.username).join(', ')}`
      })
    }

    // Force state refresh and wait before updating UI
    await ACLApiService.refreshState()
    
    setBulkOperationLoading(false)
    setSelectedClients(new Set())
    
    // Delay to ensure backend state is synchronized
    setTimeout(() => {
      handleRefresh()
    }, 2000)
  }

  const handleBulkAddRole = async (rolename: string, priority: number = 0) => {
    if (selectedClients.size === 0) return
    
    setBulkOperationLoading(true)
    const clientUsernames = Array.from(selectedClients) as string[]
    const results: OperationResult[] = []

    // Show initial queuing message
    addToast({
      type: 'info',
      title: 'Processing...',
      message: `Queuing role "${rolename}" assignment for ${clientUsernames.length} client(s)...`
    })

    for (const username of clientUsernames) {
      try {
        const result = await ACLApiService.addClientRole(username, rolename, priority)
        
        if (result.ok && result.data?.queued) {
          const queueId = result.data.queue_id
          if (queueId) {
            // Wait for completion
            const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
            if (pollResult.ok) {
              // Check if operation was applied or idempotent
              const auditResult = await ACLApiService.getAuditLog(undefined, queueId)
              const isIdempotent = auditResult.ok && 
                auditResult.data?.some(log => log.result_json && 
                  typeof log.result_json === 'object' && 
                  'status' in log.result_json && 
                  log.result_json.status === 'idempotent')

              results.push({ 
                username, 
                success: true, 
                error: isIdempotent ? 'Already had role' : undefined 
              })
            } else {
              results.push({ 
                username, 
                success: false, 
                error: pollResult.error?.message || 'Operation failed during processing'
              })
            }
          } else {
            results.push({ username, success: false, error: 'No queue ID returned' })
          }
        } else {
          results.push({ username, success: false, error: result.error?.message || 'Failed to queue operation' })
        }
      } catch (err) {
        results.push({ 
          username, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Show final results
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const idempotent = successful.filter(r => r.error === 'Already had role')
    const actuallyAdded = successful.filter(r => !r.error)

    if (actuallyAdded.length > 0) {
      addToast({
        type: 'success',
        title: 'Bulk Role Assignment Completed Successfully',
        message: `Successfully added role "${rolename}" to ${actuallyAdded.length} client(s)`
      })
    }

    if (idempotent.length > 0) {
      addToast({
        type: 'info',
        title: 'Some Clients Already Had Role',
        message: `${idempotent.length} client(s) already had role "${rolename}"`
      })
    }

    if (failed.length > 0) {
      addToast({
        type: 'error',
        title: 'Some Operations Failed',
        message: `Failed to add role to ${failed.length} client(s): ${failed.map(f => f.username).join(', ')}`
      })
    }

    // Force state refresh and wait before updating UI
    await ACLApiService.refreshState()
    
    setBulkOperationLoading(false)
    setSelectedClients(new Set())
    
    // Delay to ensure backend state is synchronized
    setTimeout(() => {
      handleRefresh()
    }, 2000)
  }

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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedClients.size > 0 && (
              <>
                <span style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  marginRight: '8px'
                }}>
                  {selectedClients.size} selected
                </span>
                <button
                  onClick={handleBulkDisable}
                  disabled={bulkOperationLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: bulkOperationLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: bulkOperationLoading ? 0.6 : 1
                  }}
                >
                  {bulkOperationLoading ? 'Processing...' : 'Disable Selected'}
                </button>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAddRole(e.target.value)
                        e.target.value = '' // Reset selection
                      }
                    }}
                    disabled={bulkOperationLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: bulkOperationLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: bulkOperationLoading ? 0.6 : 1
                    }}
                  >
                    <option value="">Add Role to Selected</option>
                    {availableRoles.map(role => (
                      <option key={role.rolename} value={role.rolename}>
                        {role.rolename}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setSelectedClients(new Set())}
                  style={{
                    padding: '8px 12px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear Selection
                </button>
                <div style={{ 
                  width: '1px', 
                  height: '24px', 
                  background: '#e5e7eb',
                  margin: '0 8px' 
                }} />
              </>
            )}
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
                    color: '#374151',
                    width: '50px'
                  }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
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
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.username)}
                          onChange={(e) => handleSelectClient(client.username, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                        <button
                          onClick={() => {
                            // Only allow single selection when no multi-select is active
                            if (selectedClients.size === 0) {
                              setSelectedClient(client)
                            }
                          }}
                          disabled={selectedClients.size > 0}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: selectedClients.size > 0 ? '#9ca3af' : '#3b82f6',
                            cursor: selectedClients.size > 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            fontSize: '14px',
                            textDecoration: selectedClients.size > 0 ? 'none' : 'underline'
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
      
      {/* Client Detail Pane - only show when single client is selected and no multi-select active */}
      {selectedClient && selectedClients.size === 0 && (
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
