import React, { useState, useEffect } from 'react'
import { GreApiService } from '../services/greApi'
import { TopicActivity, TopicAuditLog, TopicActionRun, TopicActionRequest } from '../config/greApi'
import { ConfirmationModal } from './ConfirmationModal'

interface TopicDetailProps {
  topic: string | null
  onClose: () => void
  onRefresh?: () => void
}

export const TopicDetail: React.FC<TopicDetailProps> = ({ topic, onClose, onRefresh }) => {
  const [activity, setActivity] = useState<TopicActivity[]>([])
  const [auditLog, setAuditLog] = useState<TopicAuditLog[]>([])
  const [actionRuns, setActionRuns] = useState<TopicActionRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'audit' | 'actions'>('activity')
  const [actionLoading, setActionLoading] = useState(false)
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'archive' | 'unarchive' | 'delete'
    topic: string
    isDryRun: boolean
    reason: string
  }>({
    isOpen: false,
    type: 'archive',
    topic: '',
    isDryRun: false,
    reason: ''
  })

  const fetchTopicDetails = async () => {
    if (!topic) {
      setActivity([])
      setAuditLog([])
      setActionRuns([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [activityData, auditData, actionsData] = await Promise.all([
        GreApiService.getTopicActivityByTopic(topic),
        GreApiService.getTopicAuditLog(topic, 50),
        GreApiService.getTopicActionRuns(topic, 50)
      ])

      setActivity(activityData)
      setAuditLog(auditData)
      setActionRuns(actionsData)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch topic details'
      setError(errorMsg)
      console.error('Error fetching topic details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopicDetails()
  }, [topic])

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  const formatShortTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const performTopicAction = async (
    topicName: string,
    action: 'archive' | 'unarchive' | 'delete',
    isDryRun: boolean,
    reason: string
  ) => {
    try {
      setActionLoading(true)
      setError(null)

      const request: TopicActionRequest = {
        p_topic: topicName,
        p_actor: 'admin', // TODO: Get from user context
        p_reason: reason || `${action} via topic detail`,
        p_broker: 'local',
        p_dry_run: isDryRun
      }

      let response
      switch (action) {
        case 'archive':
          response = await GreApiService.archiveTopic(request)
          break
        case 'unarchive':
          response = await GreApiService.unarchiveTopic(request)
          break
        case 'delete':
          response = await GreApiService.deleteTopic(request)
          break
      }

      if (response.ok) {
        // Refresh the data
        fetchTopicDetails()
        
        // If not dry run, poll for completion and refresh parent
        if (!isDryRun && onRefresh) {
          const result = await GreApiService.pollTopicActionRuns(topicName, action, 20000)
          if (result?.status === 'success') {
            onRefresh()
          }
        }
      } else {
        throw new Error(response.error || `Failed to ${action} topic`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      console.error(`Error performing ${action} on topic ${topicName}:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleActionClick = (
    action: 'archive' | 'unarchive' | 'delete',
    isDryRun: boolean = false
  ) => {
    if (!topic) return

    if (isDryRun) {
      // Perform dry run immediately
      performTopicAction(topic, action, true, `Dry run ${action}`)
    } else {
      // Show confirmation modal
      setConfirmModal({
        isOpen: true,
        type: action,
        topic,
        isDryRun: false,
        reason: ''
      })
    }
  }

  const handleConfirmAction = () => {
    performTopicAction(
      confirmModal.topic,
      confirmModal.type,
      confirmModal.isDryRun,
      confirmModal.reason
    )
    setConfirmModal({ ...confirmModal, isOpen: false })
  }

  if (!topic) {
    return (
      <div className="chart-section">
        <h2 className="chart-title">Topic Details</h2>
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Select a topic from the list to view details
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="chart-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="chart-title">Topic Details: {topic}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
        <div className="chart-placeholder">Loading topic details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="chart-title">Topic Details: {topic}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
        <div style={{ 
          background: '#fef2f2', 
          color: '#dc2626', 
          padding: '12px', 
          borderRadius: '8px',
          border: '1px solid #fecaca'
        }}>
          Error: {error}
        </div>
      </div>
    )
  }

  const currentActivity = activity[0]

    return (
      <div className="chart-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="chart-title">Topic Details: {topic}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Action Buttons */}
            <button
              onClick={() => handleActionClick('archive', true)}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: 'white',
                color: '#6b7280',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
              title="Dry run archive"
            >
              Dry Archive
            </button>
            <button
              onClick={() => handleActionClick('archive', false)}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                background: '#3b82f6',
                color: 'white',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
              title="Archive topic"
            >
              Archive
            </button>
            <button
              onClick={() => handleActionClick('delete', true)}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #dc2626',
                borderRadius: '4px',
                background: 'white',
                color: '#dc2626',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
              title="Dry run delete"
            >
              Dry Delete
            </button>
            <button
              onClick={() => handleActionClick('delete', false)}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                background: '#dc2626',
                color: 'white',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
              title="Delete topic"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d1d5db'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#e5e7eb'}
            >
              Close
            </button>
          </div>
        </div>      {/* Current State Summary */}
      {currentActivity && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Current State</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Last Published</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {formatTimestamp(currentActivity.last_pub_ts)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Last Delivered</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {formatTimestamp(currentActivity.last_deliver_ts)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Has Retained</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  background: currentActivity.has_retained ? '#dcfce7' : '#f3f4f6',
                  color: currentActivity.has_retained ? '#166534' : '#6b7280'
                }}>
                  {currentActivity.has_retained ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Publications (7d)</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {currentActivity.pubs_7d} ({currentActivity.bytes_7d} bytes)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Publications (30d)</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {currentActivity.pubs_30d} ({currentActivity.bytes_30d} bytes)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Last Retained</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {formatTimestamp(currentActivity.last_retained_ts)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { id: 'activity', label: 'Activity', count: activity.length },
            { id: 'audit', label: 'Audit Log', count: auditLog.length },
            { id: 'actions', label: 'Action Runs', count: actionRuns.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === tab.id ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {activeTab === 'activity' && (
          <div>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                No activity data available
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {/* Activity data is already shown in current state above */}
                <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                  Current activity state shown above
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            {auditLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                No audit log entries available
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {auditLog.map((entry, index) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < auditLog.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{entry.action}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {formatShortTimestamp(entry.ts)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {entry.user && <span>User: {entry.user} • </span>}
                      ID: {entry.id}
                    </div>
                    {entry.details && (
                      <div style={{ 
                        marginTop: '8px', 
                        fontSize: '12px', 
                        fontFamily: 'monospace',
                        background: '#f9fafb',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        {JSON.stringify(entry.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            {actionRuns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                No action runs available
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {actionRuns.map((run, index) => (
                  <div
                    key={run.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < actionRuns.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{run.action}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '500',
                          background: run.status === 'success' ? '#dcfce7' : run.status === 'failed' ? '#fef2f2' : '#fef3c7',
                          color: run.status === 'success' ? '#166534' : run.status === 'failed' ? '#dc2626' : '#92400e'
                        }}>
                          {run.status}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {formatShortTimestamp(run.ts)}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                      ID: {run.id}
                    </div>
                    {run.detail && (
                      <div style={{ 
                        marginBottom: '8px',
                        fontSize: '12px', 
                        fontFamily: 'monospace',
                        background: '#f9fafb',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Details:</div>
                        {typeof run.detail === 'object' ? (
                          <div>
                            {run.detail.step && (
                              <div style={{ color: '#059669', fontWeight: '500' }}>
                                Step: {run.detail.step}
                              </div>
                            )}
                            {run.detail.role && (
                              <div style={{ color: '#3b82f6' }}>
                                Role: {run.detail.role}
                              </div>
                            )}
                            {run.detail.note && (
                              <div style={{ color: '#6b7280' }}>
                                Note: {run.detail.note}
                              </div>
                            )}
                            {Object.keys(run.detail).length > 0 && (
                              <details style={{ marginTop: '4px' }}>
                                <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#6b7280' }}>
                                  Raw Details
                                </summary>
                                <pre style={{ marginTop: '4px', fontSize: '10px' }}>
                                  {JSON.stringify(run.detail, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ) : (
                          run.detail
                        )}
                      </div>
                    )}
                    {run.result && (
                      <div style={{ 
                        marginBottom: '8px',
                        fontSize: '12px', 
                        fontFamily: 'monospace',
                        background: '#f9fafb',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Result:</div>
                        {JSON.stringify(run.result, null, 2)}
                      </div>
                    )}
                    {run.error && (
                      <div style={{ 
                        fontSize: '12px', 
                        fontFamily: 'monospace',
                        background: '#fef2f2',
                        color: '#dc2626',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Error:</div>
                        {run.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={`Confirm ${confirmModal.type.charAt(0).toUpperCase() + confirmModal.type.slice(1)}`}
        message={`Are you sure you want to ${confirmModal.type} this topic? This action ${
          confirmModal.type === 'delete' ? 'cannot be undone' : 'can be reversed later'
        }.`}
        confirmText={confirmModal.type.charAt(0).toUpperCase() + confirmModal.type.slice(1)}
        type={confirmModal.type === 'delete' ? 'danger' : 'warning'}
        topic={confirmModal.topic}
        reason={confirmModal.reason}
        onReasonChange={(reason) => setConfirmModal({ ...confirmModal, reason })}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  )
}
