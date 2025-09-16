import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService } from '../../services/greApi'
import { Event as ApiEvent } from '../../types/api'

interface LiveActivityProps {
  className?: string
  refreshInterval?: number
  limit?: number
}

export const LiveActivity: React.FC<LiveActivityProps> = ({ 
  className = '', 
  refreshInterval = 30, 
  limit = 10 
}) => {
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setError(null)
      console.log('Fetching recent events from PostgREST...')
      
      // Fetch recent events using the GRE API service
      const response = await GreApiService.getTableDataPaginated('/events', {
        offset: 0,
        limit: limit,
        orderBy: 'ts.desc' // Order by timestamp descending
      })
      
      setEvents(response.data)
      setLastUpdated(new Date())
      console.log(`Fetched ${response.data.length} events`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(errorMsg)
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchEvents()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchEvents, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchEvents, refreshInterval])

  const getActivityIcon = (action: string) => {
    const iconMap: Record<string, string> = {
      connected: '🔌',
      disconnected: '🔌',
      subscribe: '📥',
      unsubscribe: '📤',
      publish: '📤',
      checkpoint: '💾',
      conn_info: '🔗',
      error: '⚠️',
      unknown: '•'
    }
    return iconMap[action] || '•'
  }

  const getActionLabel = (action: string) => {
    const labelMap: Record<string, string> = {
      connected: 'Client connected',
      disconnected: 'Client disconnected',
      subscribe: 'Topic subscribed',
      unsubscribe: 'Topic unsubscribed',
      publish: 'Message published',
      checkpoint: 'Database checkpoint',
      conn_info: 'TCP connection',
      error: 'Error occurred',
      unknown: 'Unknown event'
    }
    return labelMap[action] || `${action} event`
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime()
    const eventTime = new Date(timestamp).getTime()
    const diffSeconds = Math.floor((now - eventTime) / 1000)
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        Loading recent activity...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        Unable to load activity feed
        <br />
        <small>{error}</small>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        No recent activity found
      </div>
    )
  }

  return (
    <div className={className}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.map((event) => (
          <div key={event.id} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '6px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              background: '#f3f4f6', 
              borderRadius: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '14px',
              flexShrink: 0
            }}>
              {getActivityIcon(event.action)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '500', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                {getActionLabel(event.action)}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                {(event.og_client || event.client) && (
                  <span style={{ 
                    fontFamily: 'monospace', 
                    background: '#ffffff', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    border: '1px solid #e5e7eb',
                    marginRight: '8px'
                  }}>
                    {event.og_client || event.client}
                  </span>
                )}
                {event.topic && (
                  <>
                    <span style={{ margin: '0 6px', color: '#9ca3af' }}>→</span>
                    <span style={{ 
                      fontFamily: 'monospace', 
                      background: '#ffffff', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      border: '1px solid #e5e7eb' 
                    }}>
                      {event.topic.length > 30 ? event.topic.substring(0, 30) + '...' : event.topic}
                    </span>
                  </>
                )}
                {event.qos !== null && (
                  <span style={{ 
                    marginLeft: '8px',
                    fontSize: '11px',
                    background: '#f3f4f6',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    color: '#6b7280'
                  }}>
                    QoS {event.qos}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {formatTimeAgo(event.ts)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '16px', 
          fontSize: '12px', 
          color: '#9ca3af' 
        }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}