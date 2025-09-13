import React, { useState, useEffect } from 'react'
import { ACLApiService } from '../../services/aclApi'

interface SetPasswordModalProps {
  isOpen: boolean
  username: string
  onClose: () => void
  onSuccess: () => void
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({
  isOpen,
  username,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setValidationErrors({})
      setShowPasswords(false)
    }
  }, [isOpen])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!password.trim()) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }
    
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await ACLApiService.setClientPassword(username, password)

      if (result.ok && result.data?.queued) {
        const queueId = result.data.queue_id
        if (queueId) {
          const pollResult = await ACLApiService.pollQueueStatus(queueId, 20, 1500)
          if (pollResult.ok) {
            onSuccess()
            onClose()
          } else {
            setError(pollResult.error?.message || 'Operation failed')
          }
        } else {
          onSuccess()
          onClose()
        }
      } else {
        setError(result.error?.message || 'Failed to set password')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>Set Password</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              disabled
              style={{
                background: '#f9fafb',
                color: '#6b7280',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <div className="password-input-container">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter new password (min 8 chars)"
                className={validationErrors.password ? 'error' : ''}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="password-toggle"
                disabled={loading}
              >
                {showPasswords ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            {validationErrors.password && (
              <div className="field-error">{validationErrors.password}</div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <div className="password-input-container">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Confirm new password"
                className={validationErrors.confirmPassword ? 'error' : ''}
                disabled={loading}
              />
            </div>
            {validationErrors.confirmPassword && (
              <div className="field-error">{validationErrors.confirmPassword}</div>
            )}
          </div>

          <div className="password-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={password.length >= 8 ? 'requirement-met' : ''}>
                At least 8 characters
              </li>
              <li className={password !== confirmPassword || !confirmPassword ? '' : 'requirement-met'}>
                Passwords match
              </li>
            </ul>
          </div>

          <div className="modal-actions">
            <button 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              className="btn-primary"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </div>
        </div>
      </div>

      <style jsx="true">{`
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
          width: 90%;
          max-height: 80vh;
          overflow: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
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
          border-radius: 4px;
        }

        .modal-close:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error {
          border-color: #ef4444;
        }

        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-container input {
          padding-right: 45px;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #6b7280;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .password-toggle:hover {
          background: #f3f4f6;
        }

        .password-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .field-error {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .password-requirements {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .password-requirements h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .password-requirements ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #6b7280;
        }

        .password-requirements li {
          margin-bottom: 4px;
          transition: color 0.2s;
        }

        .password-requirements li.requirement-met {
          color: #059669;
          font-weight: 500;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary, .btn-secondary {
          padding: 10px 20px;
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

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn-primary:disabled, .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
