import React, { useState } from 'react'
import { ACLApiService } from '../../services/aclApi'
import { ProcessedClient, ClientRole, RoleData } from '../../config/aclApi'
import { SetPasswordModal } from './SetPasswordModal'
import { useToast } from '../Toast'

interface ClientDetailPaneProps {
  client: ProcessedClient | null
  availableRoles: RoleData[]
  onClose: () => void
  onUpdate: () => void
}

export const ClientDetailPane = ({
  client,
  availableRoles,
  onClose,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newRole, setNewRole] = useState({ rolename: '', priority: 0 })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const { addToast } = useToast()

  if (!client) return null

  const handleToggleStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = client.status === 'enabled' 
        ? await ACLApiService.disableClient(client.username)
        : await ACLApiService.enableClient(client.username)
      
      if (result.ok && result.data?.queued) {
        const queueId = result.data.queue_id
        if (queueId) {
          const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
          if (pollResult.ok) {
            // Force state refresh after successful operation
            await ACLApiService.refreshState()
            // Give time for refresh to complete
            setTimeout(() => {
              onUpdate()
            }, 2000)
            
            // Show success message with note about potential delay
            setError(null)
          } else {
            if (pollResult.error?.message?.includes('timeout')) {
              setError('Operation may have succeeded but is taking longer than expected. Please refresh manually.')
            } else {
              setError(pollResult.error?.message || 'Operation failed')
            }
          }
        }
      } else {
        setError(result.error?.message || 'Failed to update client status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client status')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRole = async () => {
    if (!newRole.rolename) return

    try {
      setLoading(true)
      setError(null)

      const result = await ACLApiService.addClientRole(
        client.username,
        newRole.rolename,
        newRole.priority
      )
      
      if (result.ok && result.data?.queued) {
        const queueId = result.data.queue_id
        if (queueId) {
          // Show initial queued message
          addToast({
            type: 'info',
            title: 'Processing...',
            message: `Queuing role addition for "${newRole.rolename}"...`
          })

          const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
          if (pollResult.ok) {
            // Check if operation was applied or idempotent
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
                message: `Client already has role "${newRole.rolename}" with same priority`,
                queueId: queueId.toString()
              })
            } else {
              addToast({
                type: 'success',
                title: 'Role Added Successfully',
                message: `Added role "${newRole.rolename}" to client "${client.username}"`,
                queueId: queueId.toString()
              })
            }

            setNewRole({ rolename: '', priority: 0 })
            
            // Force state refresh and wait before updating UI
            await ACLApiService.refreshState()
            setTimeout(() => {
              onUpdate()
            }, 2000)
          } else {
            if (pollResult.error?.message?.includes('timeout')) {
              addToast({
                type: 'warning',
                title: 'Operation Timeout',
                message: 'Role addition may have succeeded but is taking longer than expected. Please refresh manually.',
                queueId: queueId.toString()
              })
            } else {
              addToast({
                type: 'error',
                title: 'Failed',
                message: pollResult.error?.message || 'Operation failed',
                queueId: queueId.toString()
              })
            }
            setError(pollResult.error?.message || 'Operation failed')
          }
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error?.message || 'Failed to add role'
        })
        setError(result.error?.message || 'Failed to add role')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add role'
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

  const handleRemoveRole = async (rolename: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await ACLApiService.removeClientRole(client.username, rolename)
      
      if (result.ok && result.data?.queued) {
        const queueId = result.data.queue_id
        if (queueId) {
          // Show initial queued message
          addToast({
            type: 'info',
            title: 'Processing...',
            message: `Queuing role removal for "${rolename}"...`
          })

          const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
          if (pollResult.ok) {
            addToast({
              type: 'success',
              title: 'Role Removed Successfully',
              message: `Removed role "${rolename}" from client "${client.username}"`,
              queueId: queueId.toString()
            })

            // Force state refresh and wait before updating UI
            await ACLApiService.refreshState()
            setTimeout(() => {
              onUpdate()
            }, 2000)
          } else {
            if (pollResult.error?.message?.includes('timeout')) {
              addToast({
                type: 'warning',
                title: 'Operation Timeout',
                message: 'Role removal may have succeeded but is taking longer than expected. Please refresh manually.',
                queueId: queueId.toString()
              })
            } else {
              addToast({
                type: 'error',
                title: 'Failed',
                message: pollResult.error?.message || 'Operation failed',
                queueId: queueId.toString()
              })
            }
            setError(pollResult.error?.message || 'Operation failed')
          }
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error?.message || 'Failed to remove role'
        })
        setError(result.error?.message || 'Failed to remove role')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove role'
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
    <div className="detail-pane">
      <div className="detail-pane-header">
        <h3>{client.username}</h3>
        <div className="header-actions">
          <button 
            onClick={() => {
              addToast({
                type: 'info',
                title: 'Refreshing',
                message: 'Refreshing client data...'
              })
              onUpdate()
            }}
            className="refresh-button"
            disabled={loading}
            title="Refresh client data"
          >
            🔄
          </button>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
      </div>

      <div className="detail-pane-content">
        {error && (
          <div className="error-message" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Top Card */}
        <div className="detail-card">
          <div className="card-header">
            <h4>Client Status</h4>
          </div>
          <div className="card-content">
            <div className="status-row">
              <span>Status:</span>
              <div className="status-controls">
                <span 
                  className={`status-badge ${client.status === 'enabled' ? 'enabled' : 'disabled'}`}
                >
                  {client.status}
                </span>
                <button 
                  onClick={handleToggleStatus}
                  disabled={loading}
                  className={`toggle-button ${client.status === 'enabled' ? 'disable' : 'enable'}`}
                >
                  {loading ? 'Updating...' : client.status === 'enabled' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
            <div className="action-row">
              <button 
                onClick={() => setShowPasswordModal(true)}
                disabled={loading}
                className="btn-secondary"
              >
                Set Password
              </button>
            </div>
          </div>
        </div>

        {/* Add Role Section */}
        <div className="detail-card">
          <div className="card-header">
            <h4>Add Role</h4>
          </div>
          <div className="card-content">
            <div className="add-role-form">
              <select
                value={newRole.rolename}
                onChange={(e) => setNewRole(prev => ({ ...prev, rolename: e.target.value }))}
                className="form-select"
                disabled={loading}
              >
                <option value="">Select role...</option>
                {availableRoles.map(role => (
                  <option key={role.rolename} value={role.rolename}>
                    {role.rolename}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={newRole.priority}
                onChange={(e) => setNewRole(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                placeholder="Priority"
                className="form-input priority-input"
                min="0"
                disabled={loading}
              />
              <button 
                onClick={handleAddRole}
                disabled={loading || !newRole.rolename}
                className="btn-primary"
              >
                {loading ? 'Adding...' : 'Add Role'}
              </button>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className="detail-card">
          <div className="card-header">
            <h4>Assigned Roles ({client.roles.length})</h4>
          </div>
          <div className="card-content">
            {client.roles.length === 0 ? (
              <div className="empty-state">No roles assigned</div>
            ) : (
              <div className="roles-table">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600' }}>
                        Role Name
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600' }}>
                        Priority
                      </th>
                      <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.roles.map((role, index) => (
                      <tr key={`${role.rolename}-${role.priority}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 0', fontWeight: '500' }}>
                          {role.rolename}
                        </td>
                        <td style={{ padding: '12px 0', color: '#6b7280' }}>
                          {role.priority}
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemoveRole(role.rolename)}
                            disabled={loading}
                            className="btn-danger btn-small"
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

      {/* Set Password Modal */}
      <SetPasswordModal
        isOpen={showPasswordModal}
        username={client.username}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setShowPasswordModal(false)
          onUpdate()
        }}
      />

      <style jsx="true">{`
        .detail-pane {
          background: white;
          border-left: 1px solid #e5e7eb;
          width: 400px;
          height: 100%;
          overflow-y: auto;
        }

        .detail-pane-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
        }

        .detail-pane-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #374151;
        }

        .detail-pane-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .detail-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .card-header {
          background: #f9fafb;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .card-content {
          padding: 16px;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.enabled {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.disabled {
          background: #fef2f2;
          color: #dc2626;
        }

        .toggle-button {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }

        .toggle-button.enable {
          background: #dcfce7;
          color: #166534;
        }

        .toggle-button.disable {
          background: #fef2f2;
          color: #dc2626;
        }

        .toggle-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-row {
          display: flex;
          gap: 8px;
        }

        .add-role-form {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .form-select, .form-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-select {
          flex: 1;
          min-width: 120px;
        }

        .priority-input {
          width: 80px;
        }

        .btn-primary, .btn-secondary, .btn-danger {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-small {
          padding: 4px 12px;
          font-size: 12px;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-primary:disabled, .btn-secondary:disabled, .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .refresh-button {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .refresh-button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
