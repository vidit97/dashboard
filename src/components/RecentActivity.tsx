import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService, formatTimestamp } from '../services/greApi'
import { ActivityEvent } from '../config/greApi'

interface RecentActivityProps {
  className?: string
  refreshInterval?: number
  limit?: number
}

// Mock data for fallback
const MOCK_ACTIVITY_DATA: ActivityEvent[] = [
  {
    id: 1,
    ts: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    action: 'connected',
    client: 'auto-CA38A491-521C-B190-632A-60779B1E4E8F',
    topic: null,
    qos: null,
    username: 'greAgent',
    raw: null,
    icon: '🟢',
    description: 'auto-CA38A491-521C-B190-632A-60779B1E4E8F connected as greAgent'
  },
  {
    id: 2,
    ts: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    action: 'subscribe',
    client: 'auto-CA38A491-521C-B190-632A-60779B1E4E8F',
    topic: '$SYS/broker/#',
    qos: 0,
    username: null,
    raw: null,
    icon: '📝',
    description: 'auto-CA38A491-521C-B190-632A-60779B1E4E8F subscribed to $SYS/broker/#'
  },
  {
    id: 3,
    ts: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    action: 'checkpoint',
    client: null,
    topic: null,
    qos: null,
    username: null,
    raw: 'Saving in-memory database to /mosquitto/data//mosquitto.db.',
    icon: '💾',
    description: 'Broker saved database checkpoint'
  },
  {
    id: 4,
    ts: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    action: 'disconnected',
    client: 'auto-02170251-989E-5A88-E25B-EE6556F570FD',
    topic: null,
    qos: null,
    username: null,
    raw: null,
    icon: '🔴',
    description: 'auto-02170251-989E-5A88-E25B-EE6556F570FD disconnected'
  },
  {
    id: 5,
    ts: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    action: 'conn_info',
    client: null,
    topic: null,
    qos: null,
    username: null,
    raw: 'New connection from 172.18.0.4:47250 on port 1883.',
    icon: '🔗',
    description: 'New TCP connection established'
  }
]

export default function RecentActivity({ className, refreshInterval = 60, limit = 50 }: RecentActivityProps) {
  const [activities, setActivities] = useState(MOCK_ACTIVITY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setActivities(MOCK_ACTIVITY_DATA)
      } else {
        const data = await GreApiService.getRecentActivity(limit)
        setActivities(data)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch recent activity'
      setError(errorMsg)
      console.error('Error fetching activities:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setActivities(MOCK_ACTIVITY_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [limit, useMockData])

  useEffect(() => {
    fetchActivities()
    
    const interval = setInterval(fetchActivities, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchActivities, refreshInterval])

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.action === filter)

  const getActivityIcon = (action: string) => {
    const iconMap: Record<string, string> = {
      connected: '🟢',
      disconnected: '🔴',
      subscribe: '📝',
      unsubscribe: '❌',
      checkpoint: '💾',
      conn_info: '🔗',
      error: '⚠️',
      unknown: '❓'
    }
    return iconMap[action] || '❓'
  }

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      connected: '#10b981',
      disconnected: '#ef4444',
      subscribe: '#3b82f6',
      unsubscribe: '#f59e0b',
      checkpoint: '#8b5cf6',
      conn_info: '#06b6d4',
      error: '#ef4444',
      unknown: '#6b7280'
    }
    return colorMap[action] || '#6b7280'
  }

  const getRelativeTime = (timestamp: string) => {
    const now = Date.now()
    const eventTime = new Date(timestamp).getTime()
    const diffMinutes = Math.floor((now - eventTime) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Recent Activity</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="connected">Connections</option>
            <option value="disconnected">Disconnections</option>
            <option value="subscribe">Subscriptions</option>
            <option value="unsubscribe">Unsubscriptions</option>
            <option value="checkpoint">Checkpoints</option>
            <option value="conn_info">TCP Connections</option>
          </select>
          <button onClick={fetchActivities} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="mock-data-toggle">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
            />
            Use Mock Data
          </label>
        </div>
      </div>

      {error && !useMockData && (
        <div className="error-message">
          Error: {error}
          <button 
            onClick={() => setUseMockData(true)}
            style={{ marginLeft: '8px', fontSize: '12px', padding: '4px 8px' }}
          >
            Use Mock Data
          </button>
        </div>
      )}

      {/* Activity Feed */}
      {!loading && filteredActivities.length > 0 && (
        <div className="activity-feed">
          <div className="activity-summary">
            <span>Showing {filteredActivities.length} of {activities.length} events</span>
          </div>
          
          <div className="activity-list">
            {filteredActivities.slice(0, 20).map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  <span style={{ color: getActionColor(activity.action) }}>
                    {getActivityIcon(activity.action)}
                  </span>
                </div>
                <div className="activity-content">
                  <div className="activity-description">
                    {activity.description}
                  </div>
                  <div className="activity-meta">
                    <span className="activity-time">{getRelativeTime(activity.ts)}</span>
                    <span className="activity-action-badge" style={{ 
                      backgroundColor: getActionColor(activity.action) + '20',
                      color: getActionColor(activity.action)
                    }}>
                      {activity.action}
                    </span>
                    {activity.topic && (
                      <span className="activity-topic" title={activity.topic}>
                        📍 {activity.topic.length > 20 ? activity.topic.substring(0, 20) + '...' : activity.topic}
                      </span>
                    )}
                  </div>
                </div>
                <div className="activity-timestamp">
                  {formatTimestamp(activity.ts)}
                </div>
              </div>
            ))}
          </div>
          
          {filteredActivities.length > 20 && (
            <div className="activity-overflow">
              <span>... and {filteredActivities.length - 20} more events</span>
            </div>
          )}
        </div>
      )}

      {!loading && filteredActivities.length === 0 && (
        <div className="no-data">
          {filter === 'all' 
            ? 'No recent activity found'
            : `No ${filter} events found`
          }
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
