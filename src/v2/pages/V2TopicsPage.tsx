import React, { useCallback, useState, useEffect } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { useManualRefresh } from '../hooks/useManualRefresh'
// Moving subscription components from subscriptions page
import { ActiveSubscriptions } from '../../ui/ActiveSubscriptions'
import { SubscriptionState } from '../../ui/SubscriptionState'
// Topic Management functionality
import { GreApiService } from '../../services/greApi'
import { InactiveTopic } from '../../config/greApi'
import { TopicsList } from '../../components/TopicsList'
import { TopicDetail } from '../../components/TopicDetail'

export const V2TopicsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // Topic Management state
  const [topics, setTopics] = useState<InactiveTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(60) // 60 seconds default
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Topic Management functions
  const fetchTopics = useCallback(async () => {
    try {
      setTopicsLoading(true)
      setTopicsError(null)
      console.log('Fetching topics from GRE API...')

      // Fetch topics ordered by last_pub_ts ascending with nulls first (inactive topics first)
      const data = await GreApiService.getInactiveTopics({
        order: 'last_pub_ts.asc.nullsfirst',
        limit: 500 // Get up to 500 topics
      })

      console.log('Topics fetched:', data.length)
      setTopics(data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch topics'
      setTopicsError(errorMsg)
      console.error('Error fetching topics:', err)
    } finally {
      setTopicsLoading(false)
    }
  }, [])

  // Auto-refresh effect for topics
  useEffect(() => {
    fetchTopics()
    const interval = setInterval(fetchTopics, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchTopics, refreshInterval])

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(selectedTopic === topic ? null : topic)
  }

  const handleCloseDetail = () => {
    setSelectedTopic(null)
  }

  // Add responsive styles based on window width
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: windowWidth < 768 
      ? '1fr' 
      : windowWidth < 1200 
        ? 'repeat(auto-fit, minmax(300px, 1fr))'
        : 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden'
  }

  // Manual refresh function that forces child components to refresh
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Listen for manual refresh events
  useManualRefresh(triggerRefresh, 'Topics')

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 8px 0'
            }}>
              Topics
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: 0
            }}>
              Topic subscription analytics and lifecycle management
            </p>
          </div>

          {/* Topic Management Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Refresh Interval Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#6b7280' }}>
                Refresh:
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
                <option value={600}>10m</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={fetchTopics}
              disabled={topicsLoading}
              style={{
                padding: '8px 16px',
                background: topicsLoading ? '#e5e7eb' : '#3b82f6',
                color: topicsLoading ? '#6b7280' : 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: topicsLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              {topicsLoading ? 'Refreshing...' : 'Refresh Topics'}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Analytics Row */}
      <div style={gridStyle}>
        <div style={{
          width: '100%',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <style>{`
            .active-subscriptions-wrapper .chart-container {
              height: ${windowWidth < 768 ? '400px' : '450px'} !important;
              min-height: ${windowWidth < 768 ? '400px' : '450px'} !important;
              overflow: visible !important;
            }
            .active-subscriptions-wrapper .chart-container .recharts-wrapper {
              overflow: visible !important;
            }
          `}</style>
          <div className="active-subscriptions-wrapper">
            <ActiveSubscriptions refreshTrigger={refreshTrigger} />
          </div>
        </div>
        <div style={{
          width: '100%',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <SubscriptionState refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Topic Management Section */}
      <div style={{ marginTop: '48px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 0',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
              Topic Management
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Monitor and manage MQTT topics, view activity and history
            </p>
          </div>
        </div>

        {/* Topic Management Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedTopic ? '1fr 1fr' : '1fr',
          gap: '24px',
          transition: 'all 0.3s ease'
        }}>
          {/* Topics List */}
          <TopicsList
            topics={topics}
            loading={topicsLoading}
            error={topicsError}
            onTopicSelect={handleTopicSelect}
            selectedTopic={selectedTopic || undefined}
            onRefresh={fetchTopics}
          />

          {/* Topic Detail Panel */}
          {selectedTopic && (
            <TopicDetail
              topic={selectedTopic}
              onClose={handleCloseDetail}
              onRefresh={fetchTopics}
            />
          )}
        </div>

        {/* Footer */}
        {lastUpdated && (
          <div style={{
            textAlign: 'center',
            marginTop: '32px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}