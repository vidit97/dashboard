import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService } from '../services/greApi'
import { InactiveTopic } from '../config/greApi'
import { TopicsList } from '../components/TopicsList'
import { TopicDetail } from '../components/TopicDetail'

export default function TopicManagement() {
  const [topics, setTopics] = useState<InactiveTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(60) // 60 seconds default
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
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
      setError(errorMsg)
      console.error('Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh effect
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

  const handleTestAPI = async () => {
    try {
      const response = await fetch('https://pipeline-row-anderson-discounted.trycloudflare.com/v_inactive_topics?limit=5')
      const data = await response.json()
      console.log('Direct API test result:', data)
      alert(`API test successful! Found ${data.length} topics`)
    } catch (e) {
      console.error('Direct API test failed:', e)
      alert('API test failed: ' + e)
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        padding: '16px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#111827' }}>
            Topic Management
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
            Monitor and manage MQTT topics, view activity and history
          </p>
        </div>
        
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
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? '#e5e7eb' : '#3b82f6',
              color: loading ? '#6b7280' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          {/* Test API Button */}
          <button
            onClick={handleTestAPI}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
          >
            Test API
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: selectedTopic ? '1fr 1fr' : '1fr',
        gap: '24px',
        transition: 'all 0.3s ease'
      }}>
        {/* Topics List */}
        <TopicsList
          topics={topics}
          loading={loading}
          error={error}
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
  )
}
