import React, { useState } from 'react'
import { RoleACL, ACLType } from '../../config/aclApi'
import { ACLApiService, getACLTypeDisplayName } from '../../services/aclApi'
import { useToast } from '../Toast'

interface CreateRoleModalProps {
  onClose: () => void
  onRoleCreated: () => void
}

interface CreateRoleFormState {
  rolename: string
  acls: RoleACL[]
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  onClose,
  onRoleCreated
}) => {
  const { addToast } = useToast()
  const [formState, setFormState] = useState<CreateRoleFormState>({
    rolename: '',
    acls: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  const aclTypes: ACLType[] = [
    'publishClientSend',
    'publishClientReceive',
    'subscribePattern',
    'subscribeLiteral',
    'unsubscribePattern',
    'unsubscribeLiteral'
  ]

  const addACLRow = () => {
    setFormState(prev => ({
      ...prev,
      acls: [...prev.acls, { acltype: 'publishClientSend', topic: '', allow: true, priority: 0 }]
    }))
  }

  const removeACLRow = (index: number) => {
    setFormState(prev => ({
      ...prev,
      acls: prev.acls.filter((_, i) => i !== index)
    }))
  }

  const updateACLRow = (index: number, field: keyof RoleACL, value: any) => {
    setFormState(prev => ({
      ...prev,
      acls: prev.acls.map((acl, i) => 
        i === index ? { ...acl, [field]: value } : acl
      )
    }))
  }

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (!formState.rolename.trim()) {
      errors.rolename = 'Role name is required'
    }

    // Validate ACLs
    const invalidACLs = formState.acls.filter(acl => !acl.topic.trim())
    if (invalidACLs.length > 0) {
      errors.acls = 'Please fill in all topic fields or remove empty ACL rows'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleDryRun = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await ACLApiService.createRole(
        formState.rolename.trim(),
        formState.acls,
        true // dry run
      )

      if (result.ok) {
        addToast({
          type: 'info',
          title: 'Dry Run Successful',
          message: `Role "${formState.rolename}" would be created with ${formState.acls.length} ACL(s)`
        })
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await ACLApiService.createRole(
        formState.rolename.trim(),
        formState.acls,
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
                message: `Role "${formState.rolename}" already exists`,
                queueId: queueId.toString()
              })
            } else {
              addToast({
                type: 'success',
                title: 'Applied',
                message: `Role "${formState.rolename}" created successfully`,
                queueId: queueId.toString()
              })
            }

            onRoleCreated()
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
            message: `Role "${formState.rolename}" created successfully`
          })
          onRoleCreated()
          onClose()
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error?.message || 'Failed to create role'
        })
        setError(result.error?.message || 'Failed to create role')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create role'
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
        padding: '0',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
            Create New Role
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6b7280',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
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

          {/* Role Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Role Name *
            </label>
            <input
              type="text"
              value={formState.rolename}
              onChange={(e) => setFormState(prev => ({ ...prev, rolename: e.target.value }))}
              placeholder="Enter role name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: validationErrors.rolename ? '1px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {validationErrors.rolename && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.rolename}
              </div>
            )}
          </div>

          {/* ACLs Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: '500' }}>Access Control Lists</label>
              <button
                type="button"
                onClick={addACLRow}
                style={{
                  padding: '6px 12px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Add ACL
              </button>
            </div>

            {validationErrors.acls && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '8px' }}>
                {validationErrors.acls}
              </div>
            )}

            {formState.acls.length === 0 ? (
              <div style={{ 
                padding: '20px', 
                background: '#f9fafb', 
                borderRadius: '8px', 
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No ACLs defined. Click "Add ACL" to get started.
              </div>
            ) : (
              <div style={{ space: '8px' }}>
                {formState.acls.map((acl, index) => (
                  <div key={index} style={{ 
                    padding: '16px', 
                    background: '#f9fafb', 
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 80px 80px auto', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={acl.acltype}
                        onChange={(e) => updateACLRow(index, 'acltype', e.target.value as ACLType)}
                        style={{
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {aclTypes.map(type => (
                          <option key={type} value={type}>
                            {getACLTypeDisplayName(type)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={acl.topic}
                        onChange={(e) => updateACLRow(index, 'topic', e.target.value)}
                        placeholder="Topic pattern"
                        style={{
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />

                      <select
                        value={acl.allow ? 'allow' : 'deny'}
                        onChange={(e) => updateACLRow(index, 'allow', e.target.value === 'allow')}
                        style={{
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="allow">Allow</option>
                        <option value="deny">Deny</option>
                      </select>

                      <input
                        type="number"
                        value={acl.priority}
                        onChange={(e) => updateACLRow(index, 'priority', parseInt(e.target.value) || 0)}
                        placeholder="Priority"
                        style={{
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                        min="0"
                      />

                      <button
                        type="button"
                        onClick={() => removeACLRow(index)}
                        style={{
                          padding: '6px 8px',
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDryRun}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? 'Testing...' : 'Dry Run'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
