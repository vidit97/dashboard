import React, { useState, useEffect } from 'react'
import { ACLApiService, formatTimestamp } from '../../services/aclApi'
import { BackupItem } from '../../config/aclApi'
import { useToast } from '../Toast'

interface BackupsSectionProps {
  onRefresh?: () => void
}

export const BackupsSection: React.FC<BackupsSectionProps> = ({ onRefresh }) => {
  const { addToast } = useToast()
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ACLApiService.getBackups()
      if (result.ok && result.data) {
        setBackups(result.data)
      } else {
        setError(result.error?.message || 'Failed to load backups')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true)
      const result = await ACLApiService.backupNow()
      if (result.ok && result.data) {
        addToast({
          type: 'success',
          title: 'Backup Created',
          message: `Backup created successfully with ID: ${result.data}`
        })
        loadBackups() // Refresh the backup list
        onRefresh?.()
      } else {
        addToast({
          type: 'error',
          title: 'Backup Failed',
          message: result.error?.message || 'Failed to create backup'
        })
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Backup Failed',
        message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Backups
        </h2>
        <button 
          onClick={handleCreateBackup}
          disabled={isCreatingBackup}
          style={{
            padding: '12px 20px',
            background: isCreatingBackup ? '#9ca3af' : '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isCreatingBackup ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isCreatingBackup ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      {/* Info Card */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '8px',
          color: '#1e40af' 
        }}>
          <span style={{ fontSize: '20px', marginRight: '8px' }}>ℹ️</span>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Backup Information
          </h3>
        </div>
        <p style={{ margin: 0, color: '#1e40af', lineHeight: '1.5' }}>
          Backups capture the current dynamic security state including all roles, clients, and ACL configurations. 
          The backup operation uses the broker's built-in backup functionality to ensure consistency.
        </p>
      </div>

      {/* Recent Backups */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Recent Backups
          </h3>
        </div>

        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Loading backups...
            </div>
          ) : error ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center',
              color: '#ef4444'
            }}>
              Error: {error}
              <br />
              <button 
                onClick={loadBackups}
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
          ) : backups.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280',
              padding: '40px' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
                📦
              </div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                No backups created yet
              </div>
              <div style={{ fontSize: '14px' }}>
                Click "Create Backup" to create your first backup
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {backups.map((backup) => (
                <div 
                  key={backup.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      Backup ID: {backup.id}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>
                      Created: {formatTimestamp(backup.created_at)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>
                      Broker: {backup.broker} | Source: {backup.source}
                    </div>
                    {backup.notes && (
                      <div style={{ fontSize: '12px', color: '#4b5563', fontStyle: 'italic' }}>
                        {backup.notes}
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: '#d1fae5',
                    color: '#065f46',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Success
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          Notes:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '14px' }}>
          <li>Backups are stored on the broker and managed by the mosquitto dynamic security plugin</li>
          <li>The backup ID returned can be used with broker commands to restore state if needed</li>
          <li>Backups capture the complete state at the time of creation</li>
        </ul>
      </div>
    </div>
  )
}
