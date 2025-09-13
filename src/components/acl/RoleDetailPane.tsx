import React, { useState } from 'react'
import { ProcessedRole, RoleACL, ACLType } from '../../config/aclApi'
import { ACLApiService, getACLTypeDisplayName } from '../../services/aclApi'
import { useToast } from '../Toast'

interface RoleDetailPaneProps {
  role: ProcessedRole
  onClose: () => void
  onUpdate: () => void
}

export const RoleDetailPane: React.FC<RoleDetailPaneProps> = ({ role, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()
  const [newACL, setNewACL] = useState<RoleACL>({
    acltype: 'publishClientSend',
    topic: '',
    allow: true,
    priority: 0
  })

  const aclTypes: ACLType[] = [
    'publishClientSend',
    'publishClientReceive',
    'subscribePattern',
    'subscribeLiteral',
    'unsubscribePattern',
    'unsubscribeLiteral'
  ]

  const acls = role.acls || []

  const handleAddACL = async (dryRun: boolean = false) => {
    if (!newACL.topic.trim()) {
      setError('Topic is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await ACLApiService.addRoleACL(
        role.rolename,
        newACL.acltype,
        newACL.topic,
        newACL.allow,
        newACL.priority,
        dryRun
      )

      if (result.ok) {
        if (dryRun) {
          // Show dry run result
          addToast({
            type: 'info',
            title: 'Dry Run Successful',
            message: `ACL would be added: ${getACLTypeDisplayName(newACL.acltype)} ${newACL.allow ? 'allow' : 'deny'} "${newACL.topic}"`
          })
        } else {
          // Real operation
          if (result.data?.queued) {
            const queueId = result.data.queue_id
            if (queueId) {
              // Show initial queued message
              addToast({
                type: 'info',
                title: 'Processing...',
                message: `Queuing ACL addition: ${getACLTypeDisplayName(newACL.acltype)} ${newACL.allow ? 'allow' : 'deny'} "${newACL.topic}"...`
              })

              const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
              if (pollResult.ok) {
                // Check if idempotent or applied
                const auditResult = await ACLApiService.getAuditLog(undefined, queueId)
                const isIdempotent = auditResult.ok && 
                  auditResult.data?.some(log => log.result_json && 
                    typeof log.result_json === 'object' && 
                    'status' in log.result_json && 
                    log.result_json.status === 'idempotent')

                if (isIdempotent) {
                  addToast({
                    type: 'info',
                    title: 'No Change',
                    message: 'ACL already exists with same settings',
                    queueId: queueId.toString()
                  })
                } else {
                  addToast({
                    type: 'success',
                    title: 'ACL Added Successfully',
                    message: `ACL added: ${getACLTypeDisplayName(newACL.acltype)} ${newACL.allow ? 'allow' : 'deny'} "${newACL.topic}"`,
                    queueId: queueId.toString()
                  })
                }

                setNewACL({
                  acltype: 'publishClientSend',
                  topic: '',
                  allow: true,
                  priority: 0
                })
                onUpdate()
              } else {
                addToast({
                  type: 'error',
                  title: 'Failed',
                  message: pollResult.error?.message || 'Operation failed',
                  queueId: queueId.toString()
                })
                setError(pollResult.error?.message || 'Operation failed')
              }
            }
          }
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error?.message || 'Failed to add ACL'
        })
        setError(result.error?.message || 'Failed to add ACL')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add ACL'
      addToast({
        type: 'error',
        title: 'Failed',
        message: errorMsg
      })
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveACL = async (acl: RoleACL) => {
    try {
      setLoading(true)
      setError(null)

      const result = await ACLApiService.removeRoleACL(
        role.rolename,
        acl.acltype,
        acl.topic
      )

      if (result.ok && result.data?.queued) {
        const queueId = result.data.queue_id
        if (queueId) {
          // Show initial queued message
          addToast({
            type: 'info',
            title: 'Processing...',
            message: `Queuing ACL removal: ${getACLTypeDisplayName(acl.acltype)} for "${acl.topic}"...`
          })

          const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
          if (pollResult.ok) {
            // Check if idempotent or applied
            const auditResult = await ACLApiService.getAuditLog(undefined, queueId)
            const isIdempotent = auditResult.ok && 
              auditResult.data?.some(log => log.result_json && 
                typeof log.result_json === 'object' && 
                'status' in log.result_json && 
                log.result_json.status === 'idempotent')

            if (isIdempotent) {
              addToast({
                type: 'info',
                title: 'No Change',
                message: 'ACL was already removed or did not exist',
                queueId: queueId.toString()
              })
            } else {
              addToast({
                type: 'success',
                title: 'ACL Removed Successfully',
                message: `ACL removed: ${getACLTypeDisplayName(acl.acltype)} for "${acl.topic}"`,
                queueId: queueId.toString()
              })
            }

            onUpdate()
          } else {
            addToast({
              type: 'error',
              title: 'Failed',
              message: pollResult.error?.message || 'Operation failed',
              queueId: queueId.toString()
            })
            setError(pollResult.error?.message || 'Operation failed')
          }
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error?.message || 'Failed to remove ACL'
        })
        setError(result.error?.message || 'Failed to remove ACL')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove ACL'
      addToast({
        type: 'error',
        title: 'Failed',
        message: errorMsg
      })
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'white',
      borderLeft: '1px solid #e5e7eb',
      width: '450px',
      height: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f9fafb'
      }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
          {role.rolename}
        </h3>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Role Info Card */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Role Information
            </h4>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>ACL Count:</span>
                <span style={{ color: '#6b7280' }}>{role.acl_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Client Count:</span>
                <span style={{ color: '#6b7280' }}>{role.client_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>Status:</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'capitalize',
                  background: role.status === 'active' ? '#dcfce7' : '#fef2f2',
                  color: role.status === 'active' ? '#166534' : '#dc2626'
                }}>
                  {role.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Add ACL Card */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Add ACL
            </h4>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ACL Type and Topic Row */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                    ACL Type
                  </label>
                  <select
                    value={newACL.acltype}
                    onChange={(e) => setNewACL(prev => ({ ...prev, acltype: e.target.value as ACLType }))}
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    {aclTypes.map(type => (
                      <option key={type} value={type}>
                        {getACLTypeDisplayName(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                    Topic
                  </label>
                  <input
                    type="text"
                    value={newACL.topic}
                    onChange={(e) => setNewACL(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g., sensor/+/data or test/topic"
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Permission and Priority Row */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                    Permission
                  </label>
                  <select
                    value={newACL.allow.toString()}
                    onChange={(e) => setNewACL(prev => ({ ...prev, allow: e.target.value === 'true' }))}
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="true">Allow</option>
                    <option value="false">Deny</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                    Priority
                  </label>
                  <input
                    type="number"
                    value={newACL.priority}
                    onChange={(e) => setNewACL(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    min="0"
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      width: '80px'
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleAddACL(true)}
                  disabled={loading || !newACL.topic.trim()}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: 'white',
                    color: '#3b82f6',
                    opacity: loading || !newACL.topic.trim() ? 0.6 : 1
                  }}
                >
                  {loading ? 'Processing...' : 'Dry Run'}
                </button>
                <button 
                  onClick={() => handleAddACL(false)}
                  disabled={loading || !newACL.topic.trim()}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: '#3b82f6',
                    color: 'white',
                    opacity: loading || !newACL.topic.trim() ? 0.6 : 1
                  }}
                >
                  {loading ? 'Adding...' : 'Add ACL'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ACLs Table Card */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Access Control List ({acls.length})
            </h4>
          </div>
          <div style={{ padding: '16px' }}>
            {acls.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                No ACLs configured
              </div>
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                        Type
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                        Topic
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                        Permission
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                        Priority
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {acls.map((acl, index) => (
                      <tr key={`${acl.acltype}-${acl.topic}-${index}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 0', fontSize: '13px' }}>
                          <div style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            display: 'inline-block'
                          }}>
                            {getACLTypeDisplayName(acl.acltype)}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '12px 0', 
                          fontFamily: 'monospace', 
                          fontSize: '13px',
                          wordBreak: 'break-all'
                        }}>
                          {acl.topic}
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            textTransform: 'uppercase',
                            background: acl.allow ? '#dcfce7' : '#fef2f2',
                            color: acl.allow ? '#166534' : '#dc2626'
                          }}>
                            {acl.allow ? 'Allow' : 'Deny'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'center', color: '#6b7280' }}>
                          {acl.priority}
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemoveACL(acl)}
                            disabled={loading}
                            title={`Remove ${acl.acltype} for ${acl.topic}`}
                            style={{
                              padding: '4px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              background: '#ef4444',
                              color: 'white',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            {loading ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
