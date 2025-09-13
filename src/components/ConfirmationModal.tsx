import React from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type: 'danger' | 'warning' | 'info'
  topic?: string
  reason?: string
  onReasonChange?: (reason: string) => void
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type,
  topic,
  reason,
  onReasonChange
}) => {
  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: '#fef2f2',
          headerText: '#dc2626',
          confirmBg: '#dc2626',
          confirmHover: '#b91c1c'
        }
      case 'warning':
        return {
          headerBg: '#fefbf2',
          headerText: '#d97706',
          confirmBg: '#d97706',
          confirmHover: '#b45309'
        }
      case 'info':
      default:
        return {
          headerBg: '#eff6ff',
          headerText: '#2563eb',
          confirmBg: '#2563eb',
          confirmHover: '#1d4ed8'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: styles.headerBg,
          borderRadius: '12px 12px 0 0'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: styles.headerText
          }}>
            {title}
          </h3>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            {message}
          </p>

          {topic && (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Topic:
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                {topic}
              </div>
            </div>
          )}

          {onReasonChange && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Reason for action:
              </label>
              <input
                type="text"
                value={reason || ''}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Enter reason..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: styles.confirmBg,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.confirmHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.confirmBg
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
