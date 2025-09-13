import React, { useState, useEffect } from 'react'
import { ACLApiService, formatTimestamp } from '../../services/aclApi'
import { AuditLogItem, QueueItem } from '../../config/aclApi'

interface ActivitySectionProps {
  onRefresh?: () => void
}

type ActivityTab = 'queue' | 'audit'

export const ActivitySection: React.FC<ActivitySectionProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>('queue')
  const [auditActivities, setAuditActivities] = useState<AuditLogItem[]>([])
  const [queueActivities, setQueueActivities] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadActivities()
  }, [activeTab])

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (activeTab === 'queue') {
        const result = await ACLApiService.getQueue(50)
        if (result.ok && result.data) {
          setQueueActivities(result.data)
        } else {
          setError(result.error?.message || 'Failed to load queue')
        }
      } else {
        const result = await ACLApiService.getAuditLog(50)
        if (result.ok && result.data) {
          setAuditActivities(result.data)
        } else {
          setError(result.error?.message || 'Failed to load audit log')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadActivities()
    onRefresh?.()
  }

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const getActivityIcon = (op: string) => {
    if (op.includes('backup')) return '📦'
    if (op.includes('role')) return '🔧'
    if (op.includes('client')) return '👤'
    if (op.includes('acl')) return '🔒'
    return '⚙️'
  }

  const getActivityColor = (op: string) => {
    if (op.includes('backup')) return '#0ea5e9'
    if (op.includes('role')) return '#8b5cf6'
    if (op.includes('client')) return '#10b981'
    if (op.includes('acl')) return '#f59e0b'
    return '#6b7280'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return '#059669'
      case 'failed': return '#dc2626'
      case 'pending': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const formatJson = (jsonData: any): string => {
    if (!jsonData) return 'N/A'
    if (typeof jsonData === 'string') {
      try {
        return JSON.stringify(JSON.parse(jsonData), null, 2)
      } catch {
        return jsonData
      }
    }
    return JSON.stringify(jsonData, null, 2)
  }

  const renderQueueTable = () => (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>ID</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Operation</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Actor</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Enqueued</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Processed</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Status</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {queueActivities.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                No queue operations found
              </td>
            </tr>
          ) : (
            queueActivities.map((item) => (
              <React.Fragment key={item.id}>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>#{item.id}</td>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getActivityIcon(item.op)}</span>
                      <span style={{ color: getActivityColor(item.op), fontWeight: '500' }}>
                        {item.op}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                    {item.actor || 'system'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                    {item.enqueued_at ? formatTimestamp(item.enqueued_at) : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                    {item.processed_at ? formatTimestamp(item.processed_at) : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: getStatusColor(item.status) + '20',
                      color: getStatusColor(item.status)
                    }}>
                      {item.status}
                    </span>
                    {item.error && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>
                        {item.error}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {expandedItems.has(item.id) ? 'Hide' : 'Show'} Payload
                    </button>
                  </td>
                </tr>
                {expandedItems.has(item.id) && (
                  <tr>
                    <td colSpan={7} style={{ padding: '16px', background: '#f9fafb' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Payload:</h4>
                        <pre style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                          overflow: 'auto',
                          margin: 0
                        }}>
                          {formatJson(item.payload_json)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  const renderAuditTable = () => (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>ID</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Operation</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Queue ID</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Created</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {auditActivities.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                No audit records found
              </td>
            </tr>
          ) : (
            auditActivities.map((item) => (
              <React.Fragment key={item.id}>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>#{item.id}</td>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getActivityIcon(item.op)}</span>
                      <span style={{ color: getActivityColor(item.op), fontWeight: '500' }}>
                        {item.op}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                    {item.queue_id ? `#${item.queue_id}` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                    {item.created_at ? formatTimestamp(item.created_at) : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {expandedItems.has(item.id) ? 'Hide' : 'Show'} Details
                    </button>
                  </td>
                </tr>
                {expandedItems.has(item.id) && (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px', background: '#f9fafb' }}>
                      <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Payload:</h4>
                          <pre style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '12px',
                            overflow: 'auto',
                            margin: 0
                          }}>
                            {formatJson(item.payload_json)}
                          </pre>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Result:</h4>
                          <pre style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '12px',
                            overflow: 'auto',
                            margin: 0
                          }}>
                            {formatJson(item.result_json)}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#6b7280' 
      }}>
        Loading activities...
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
          onClick={loadActivities}
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
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Activity & Audit
        </h2>
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

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'queue' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'queue' ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Queue Operations ({queueActivities.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'audit' ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Audit Log ({auditActivities.length})
        </button>
      </div>

      {/* Content */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {activeTab === 'queue' ? renderQueueTable() : renderAuditTable()}
      </div>
    </div>
  )
}
