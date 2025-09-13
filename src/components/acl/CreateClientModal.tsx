import React, { useState, useEffect } from 'react'
import { ACLApiService } from '../../services/aclApi'
import { ClientRole, ACLType, RoleData } from '../../config/aclApi'
import { useToast } from '../Toast'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  availableRoles: RoleData[]
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableRoles
}) => {
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    enable: true,
    initialRoles: [] as ClientRole[]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [previewMode, setPreviewMode] = useState(false)
  const [previewResult, setPreviewResult] = useState<any>(null)

  useEffect(() => {
    if (!isOpen) {
      setFormData({ username: '', password: '', enable: true, initialRoles: [] })
      setError(null)
      setValidationErrors({})
      setPreviewMode(false)
      setPreviewResult(null)
    }
  }, [isOpen])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 1) {
      errors.username = 'Username must be at least 1 character'
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    // Validate role priorities are unique
    const priorities = formData.initialRoles.map(r => r.priority)
    const uniquePriorities = new Set(priorities)
    if (priorities.length !== uniquePriorities.size) {
      errors.roles = 'Each role must have a unique priority'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const addRole = () => {
    const newRole: ClientRole = {
      rolename: availableRoles[0]?.rolename || '',
      priority: 0
    }
    setFormData(prev => ({
      ...prev,
      initialRoles: [...prev.initialRoles, newRole]
    }))
  }

  const updateRole = (index: number, field: keyof ClientRole, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      initialRoles: prev.initialRoles.map((role, i) => 
        i === index ? { ...role, [field]: value } : role
      )
    }))
  }

  const removeRole = (index: number) => {
    setFormData(prev => ({
      ...prev,
      initialRoles: prev.initialRoles.filter((_, i) => i !== index)
    }))
  }

  const handleDryRun = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await ACLApiService.createClient(
        formData.username,
        formData.password,
        formData.enable,
        formData.initialRoles,
        true // dry run
      )

      if (result.ok && result.data) {
        addToast({
          type: 'info',
          title: 'Dry Run Successful',
          message: `Client "${formData.username}" would be created with ${formData.initialRoles.length} role(s)`
        })
        setPreviewResult(result.data)
        setPreviewMode(true)
      } else {
        addToast({
          type: 'error',
          title: 'Dry Run Failed',
          message: result.error?.message || 'Dry run failed'
        })
        setError(result.error?.message || 'Dry run failed')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Dry run failed'
      addToast({
        type: 'error',
        title: 'Dry Run Failed',
        message: errorMsg
      })
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await ACLApiService.createClient(
        formData.username,
        formData.password,
        formData.enable,
        formData.initialRoles,
        false // actual creation
      )

      if (result.ok && result.data?.queued) {
        // Poll for completion
        const queueId = result.data.queue_id
        if (queueId) {
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
                message: `Client "${formData.username}" already exists`,
                queueId: queueId.toString()
              })
            } else {
              addToast({
                type: 'success',
                title: 'Applied',
                message: `Client "${formData.username}" created successfully`,
                queueId: queueId.toString()
              })
            }

            onSuccess()
            onClose()
          } else {
            addToast({
              type: 'error',
              title: 'Failed',
              message: pollResult.error?.message || 'Operation failed',
              queueId: queueId.toString()
            })
            setError(pollResult.error?.message || 'Operation failed')
          }
        } else {
          addToast({
            type: 'success',
            title: 'Applied',
            message: `Client "${formData.username}" created successfully`
          })
          onSuccess()
          onClose()
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error?.message || 'Failed to create client'
        })
        setError(result.error?.message || 'Failed to create client')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create client'
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

  const handleConfirmPreview = () => {
    setPreviewMode(false)
    handleCreate()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#111827' 
          }}>
            {previewMode ? 'Preview: Create Client' : 'Create New Client'}
          </h2>
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

        {previewMode && previewResult ? (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Preview Result</h3>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Operation:</strong> {previewResult.preview?.op || 'create_client'}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Estimated Result:</strong> {previewResult.preview?.estimated_result || 'applied'}</p>
                <div style={{ marginTop: '12px' }}>
                  <strong>Payload:</strong>
                  <pre style={{ 
                    background: '#f3f4f6', 
                    padding: '12px', 
                    borderRadius: '6px', 
                    margin: '8px 0 0 0',
                    fontSize: '14px',
                    overflow: 'auto',
                    border: '1px solid #e5e7eb'
                  }}>{JSON.stringify(previewResult.preview?.payload || formData, null, 2)}</pre>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setPreviewMode(false)} 
                  style={{
                    padding: '8px 16px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  disabled={loading}
                >
                  Back to Edit
                </button>
                <button 
                  onClick={handleConfirmPreview} 
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Confirm & Create'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {error && (
              <div style={{ 
                marginBottom: '16px',
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter unique username"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: validationErrors.username ? '1px solid #dc2626' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              {validationErrors.username && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{validationErrors.username}</div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter secure password (min 8 chars)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: validationErrors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              {validationErrors.password && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{validationErrors.password}</div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={formData.enable}
                  onChange={(e) => setFormData(prev => ({ ...prev, enable: e.target.checked }))}
                  style={{ margin: '0' }}
                />
                Enable client
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '500' }}>Initial Roles</label>
                <button 
                  type="button" 
                  onClick={addRole}
                  style={{
                    padding: '6px 12px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  disabled={availableRoles.length === 0}
                >
                  Add Role
              </button>
              </div>
              
              {validationErrors.roles && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '8px' }}>{validationErrors.roles}</div>
              )}

              {formData.initialRoles.length === 0 ? (
                <div style={{ 
                  padding: '12px', 
                  background: '#f9fafb', 
                  borderRadius: '6px', 
                  color: '#6b7280',
                  textAlign: 'center'
                }}>No roles assigned</div>
              ) : (
                <div>
                  {formData.initialRoles.map((role, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      padding: '8px',
                      background: '#f9fafb',
                      borderRadius: '6px'
                    }}>
                      <select
                        value={role.rolename}
                        onChange={(e) => updateRole(index, 'rolename', e.target.value)}
                        style={{
                          flex: '1',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        {availableRoles.map(availableRole => (
                          <option key={availableRole.rolename} value={availableRole.rolename}>
                            {availableRole.rolename}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={role.priority}
                        onChange={(e) => updateRole(index, 'priority', parseInt(e.target.value) || 0)}
                        placeholder="Priority"
                        style={{
                          width: '80px',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={() => removeRole(index)}
                        style={{
                          padding: '6px 12px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                onClick={onClose} 
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleDryRun} 
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                disabled={loading}
              >
                {loading ? 'Previewing...' : 'Dry Run'}
              </button>
              <button 
                onClick={handleCreate} 
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
