import React, { useState, useEffect } from 'react'
import { ACLApiService } from '../../services/aclApi'
import { ProcessedRole } from '../../config/aclApi'
import { RoleDetailPane } from './RoleDetailPane'
import { BulkRoleDetailPane } from './BulkRoleDetailPane'
import { CreateRoleModal } from './CreateRoleModal'
import { useSearch } from '../../pages/ACLPage'
import { useToast } from '../Toast'

interface RolesSectionProps {
  onRefresh?: () => void
}

export const RolesSection: React.FC<RolesSectionProps> = ({ onRefresh }) => {
  const [roles, setRoles] = useState<ProcessedRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProcessedRole | null>(null)
  const [selectedRoles, setSelectedRoles] = useState(new Set<string>())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { searchTerm } = useSearch()
  const { addToast } = useToast()

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ACLApiService.getState()
      if (result.ok && result.data) {
        const processedRoles = ACLApiService.processRoles(result.data)
        setRoles(processedRoles)
        
        // Update selectedRole with fresh data if it exists
        if (selectedRole) {
          const updatedRole = processedRoles.find(r => r.rolename === selectedRole.rolename)
          if (updatedRole) {
            setSelectedRole(updatedRole)
          }
        }
      } else {
        setError(result.error?.message || 'Failed to load roles')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadRoles()
    onRefresh?.()
  }

  const filteredRoles = roles.filter(role => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    
    // Search role name
    if (role.rolename && role.rolename.toLowerCase().includes(term)) {
      return true
    }
    
    // Search ACL topics
    if (role.acls && role.acls.some(acl => 
      acl.topic && acl.topic.toLowerCase().includes(term)
    )) {
      return true
    }
    
    return false
  })

  // Multi-select helper functions (defined after filteredRoles)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRoles(new Set(filteredRoles.map(r => r.rolename)))
    } else {
      setSelectedRoles(new Set())
    }
  }

  const handleSelectRole = (rolename: string, checked: boolean) => {
    const newSelected = new Set(selectedRoles)
    if (checked) {
      newSelected.add(rolename)
      // Clear single selection when entering multi-select mode
      setSelectedRole(null)
    } else {
      newSelected.delete(rolename)
    }
    setSelectedRoles(newSelected)
  }

  const isAllSelected = filteredRoles.length > 0 && 
    filteredRoles.every(role => selectedRoles.has(role.rolename))
  
  const isIndeterminate = selectedRoles.size > 0 && !isAllSelected

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#6b7280' 
      }}>
        Loading roles...
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
          onClick={loadRoles}
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
    <div style={{ display: 'flex', height: '600px', gap: '20px' }}>
      {/* Roles List */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            Roles ({filteredRoles.length})
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedRoles.size > 0 && (
              <>
                <span style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  marginRight: '8px'
                }}>
                  {selectedRoles.size} selected
                </span>
                <button
                  onClick={() => setSelectedRoles(new Set())}
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
              Create Role
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

        {/* Roles Table */}
        <div style={{
          flex: 1,
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {filteredRoles.length === 0 ? (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: '#6b7280' 
            }}>
              {searchTerm ? 'No roles match your search' : 'No roles found'}
            </div>
          ) : (
            <div style={{ overflow: 'auto', height: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ 
                  background: '#f9fafb', 
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky',
                  top: 0
                }}>
                  <tr>
                    <th style={{ 
                      padding: '12px 16px', 
                      textAlign: 'center', 
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
                      Role Name
                    </th>
                    <th style={{ 
                      padding: '12px 16px', 
                      textAlign: 'left', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      ACL Count
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
                  {filteredRoles.map((role, index) => (
                    <tr 
                      key={role.rolename}
                      onClick={() => {
                        // Only allow single selection when no multi-select is active
                        if (selectedRoles.size === 0) {
                          setSelectedRole(role)
                        }
                      }}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        cursor: selectedRoles.size > 0 ? 'default' : 'pointer',
                        background: selectedRole?.rolename === role.rolename ? '#eff6ff' : 
                                   index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRole?.rolename !== role.rolename && selectedRoles.size === 0) {
                          e.currentTarget.style.background = '#f3f4f6'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRole?.rolename !== role.rolename && selectedRoles.size === 0) {
                          e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#f9fafb'
                        }
                      }}
                    >
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRoles.has(role.rolename)}
                          onChange={(e) => {
                            e.stopPropagation() // Prevent row click
                            handleSelectRole(role.rolename, e.target.checked)
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ 
                        padding: '12px 16px', 
                        fontWeight: '500',
                        color: selectedRoles.size > 0 ? '#9ca3af' : '#000'
                      }}>
                        {role.rolename}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        {role.acl_count}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                        {new Date(role.last_updated).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Role Detail Pane - only show when single role is selected and no multi-select active */}
      {selectedRole && selectedRoles.size === 0 && (
        <div style={{ width: '400px' }}>
          <RoleDetailPane 
            role={selectedRole} 
            onClose={() => setSelectedRole(null)}
            onUpdate={() => {
              loadRoles()
              handleRefresh()
            }}
          />
        </div>
      )}

      {/* Bulk Role Detail Pane - show when multiple roles are selected */}
      {selectedRoles.size > 0 && (
        <div style={{ width: '400px' }}>
          <BulkRoleDetailPane 
            selectedRoles={Array.from(selectedRoles)}
            onClose={() => setSelectedRoles(new Set())}
            onUpdate={() => {
              loadRoles()
              handleRefresh()
            }}
          />
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onRoleCreated={() => {
            setShowCreateModal(false)
            loadRoles()
          }}
        />
      )}
    </div>
  )
}
