import React, { createContext, useContext, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  queueId?: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  clearToasts: () => {}
})

export const useToast = () => useContext(ToastContext)

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000
    }
    
    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '400px'
    }}>
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onClose={() => removeToast(toast.id)} 
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          background: '#dcfce7',
          border: '#22c55e',
          text: '#166534',
          icon: '✅'
        }
      case 'error':
        return {
          background: '#fef2f2',
          border: '#ef4444',
          text: '#dc2626',
          icon: '❌'
        }
      case 'warning':
        return {
          background: '#fffbeb',
          border: '#f59e0b',
          text: '#d97706',
          icon: '⚠️'
        }
      case 'info':
        return {
          background: '#eff6ff',
          border: '#3b82f6',
          text: '#1d4ed8',
          icon: 'ℹ️'
        }
      default:
        return {
          background: '#f9fafb',
          border: '#6b7280',
          text: '#374151',
          icon: 'ℹ️'
        }
    }
  }

  const colors = getToastColors()

  return (
    <div style={{
      background: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ fontSize: '16px', marginTop: '2px' }}>
        {colors.icon}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: '600',
          color: colors.text,
          fontSize: '14px',
          marginBottom: toast.message ? '4px' : '0'
        }}>
          {toast.title}
        </div>
        
        {toast.message && (
          <div style={{
            color: colors.text,
            fontSize: '13px',
            opacity: 0.8,
            wordBreak: 'break-word'
          }}>
            {toast.message}
          </div>
        )}
        
        {toast.queueId && (
          <div style={{
            fontSize: '11px',
            color: colors.text,
            opacity: 0.6,
            marginTop: '4px',
            fontFamily: 'monospace'
          }}>
            Queue ID: {toast.queueId}
          </div>
        )}
      </div>
      
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: colors.text,
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        ×
      </button>
    </div>
  )
}

// CSS animation (to be added to global styles)
const toastAnimationStyles = `
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = toastAnimationStyles
  document.head.appendChild(style)
}
