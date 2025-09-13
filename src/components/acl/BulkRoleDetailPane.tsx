import React, { useState } from 'react'
import { ACLApiService } from '../../services/aclApi'
import { useToast } from '../Toast'
import { getACLTypeDisplayName } from '../../services/aclApi'

interface BulkRoleDetailPaneProps {
  selectedRoles: string[]
  onClose: () => void
  onUpdate: () => void
}

export const BulkRoleDetailPane: React.FC<BulkRoleDetailPaneProps> = ({
  selectedRoles,
  onClose,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newACL, setNewACL] = useState({
    acltype: 'publishClientSend',
    topic: '',
    allow: true,
    priority: 0
  })
  const { addToast } = useToast()

  // Define result type for bulk operations
  interface OperationResult {
    rolename: string
    success: boolean
    error?: string
  }

  const handleBulkAddACL = async (dryRun: boolean = false) => {
    if (!newACL.topic.trim()) {
      setError('Topic is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (dryRun) {
        // Show dry run message for all roles
        addToast({
          type: 'info',
          title: 'Dry Run Result',
          message: `ACL would be added to ${selectedRoles.length} role(s): ${getACLTypeDisplayName(newACL.acltype)} ${newACL.allow ? 'allow' : 'deny'} "${newACL.topic}"`
        })
        return
      }

      const results: OperationResult[] = []

      // Show initial queuing message
      addToast({
        type: 'info',
        title: 'Processing...',
        message: `Queuing ACL addition for ${selectedRoles.length} role(s)...`
      })

      for (const rolename of selectedRoles) {
        try {
          const result = await ACLApiService.addRoleACL(
            rolename,
            newACL.acltype,
            newACL.topic,
            newACL.allow,
            newACL.priority
          )
          
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
                  rolename, 
                  success: true, 
                  error: isIdempotent ? 'Already had ACL' : undefined 
                })
              } else {
                results.push({ 
                  rolename, 
                  success: false, 
                  error: pollResult.error?.message || 'Operation failed during processing'
                })
              }
            } else {
              results.push({ rolename, success: false, error: 'No queue ID returned' })
            }
          } else {
            results.push({ rolename, success: false, error: result.error?.message || 'Failed to queue operation' })
          }
        } catch (err) {
          results.push({ 
            rolename, 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      // Show final results
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)
      const idempotent = successful.filter(r => r.error === 'Already had ACL')
      const actuallyAdded = successful.filter(r => !r.error)

      if (actuallyAdded.length > 0) {
        addToast({
          type: 'success',
          title: 'Bulk ACL Addition Completed Successfully',
          message: `Successfully added ACL to ${actuallyAdded.length} role(s)`
        })
      }

      if (idempotent.length > 0) {
        addToast({
          type: 'info',
          title: 'Some Roles Already Had ACL',
          message: `${idempotent.length} role(s) already had this ACL`
        })
      }

      if (failed.length > 0) {
        addToast({
          type: 'error',
          title: 'Some Operations Failed',
          message: `Failed to add ACL to ${failed.length} role(s): ${failed.map(f => f.rolename).join(', ')}`
        })
      }

      // Reset form on success
      if (actuallyAdded.length > 0 || idempotent.length > 0) {
        setNewACL({
          acltype: 'publishClientSend',
          topic: '',
          allow: true,
          priority: 0
        })
      }

      // Force state refresh and wait before updating UI
      await ACLApiService.refreshState()
      
      // Delay to ensure backend state is synchronized
      setTimeout(() => {
        onUpdate()
      }, 2000)

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

  return (
    <div style={{
      width: '400px',
      background: 'white',
      borderLeft: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
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
          Bulk Edit Roles ({selectedRoles.length})
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: 0,
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        flex: 1
      }}>
        {/* Selected Roles List */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Selected Roles
            </h4>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedRoles.map(rolename => (
                <span
                  key={rolename}
                  style={{
                    padding: '4px 8px',
                    background: '#eff6ff',
                    color: '#1e40af',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  {rolename}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Add ACL Form */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Add ACL to All Selected Roles
            </h4>
          </div>
          <div style={{ padding: '16px' }}>
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    ACL Type
                  </label>
                  <select
                    value={newACL.acltype}
                    onChange={(e) => setNewACL({ ...newACL, acltype: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="publishClientSend">Publish (Send)</option>
                    <option value="publishClientReceive">Publish (Receive)</option>
                    <option value="subscribePattern">Subscribe (Pattern)</option>
                    <option value="subscribeLiteral">Subscribe (Literal)</option>
                    <option value="unsubscribePattern">Unsubscribe (Pattern)</option>
                    <option value="unsubscribeLiteral">Unsubscribe (Literal)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    Topic
                  </label>
                  <input
                    type="text"
                    value={newACL.topic}
                    onChange={(e) => setNewACL({ ...newACL, topic: e.target.value })}
                    placeholder="e.g., sensor/+/data or test/topic"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    Permission
                  </label>
                  <select
                    value={newACL.allow.toString()}
                    onChange={(e) => setNewACL({ ...newACL, allow: e.target.value === 'true' })}
                    style={{
                      width: '100%',
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
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    Priority
                  </label>
                  <input
                    type="number"
                    value={newACL.priority}
                    onChange={(e) => setNewACL({ ...newACL, priority: parseInt(e.target.value) || 0 })}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => handleBulkAddACL(true)}
                  disabled={loading || !newACL.topic.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: loading || !newACL.topic.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loading || !newACL.topic.trim() ? 0.6 : 1
                  }}
                >
                  Dry Run
                </button>
                <button
                  onClick={() => handleBulkAddACL(false)}
                  disabled={loading || !newACL.topic.trim()}
                  style={{
                    flex: 2,
                    padding: '10px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading || !newACL.topic.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loading || !newACL.topic.trim() ? 0.6 : 1
                  }}
                >
                  {loading ? 'Adding...' : 'Add ACL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
