import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
// Reusing existing topic management components
import { TopicsList } from '../../components/TopicsList'
import { TopicDetail } from '../../components/TopicDetail'

export const TopicsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('inactive')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [bulkSelection, setBulkSelection] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Mock topic data - in real implementation this would come from API
  const mockTopics = [
    {
      topic: 'sensors/inactive/temp01',
      last_pub_ts: null,
      last_deliver_ts: '2024-01-10T14:30:00Z',
      has_retained: true,
      pubs_7d: 0,
      pubs_30d: 150,
      bytes_7d: 0,
      bytes_30d: 15000,
      active_subs: 0,
      policy_match: 'temperature_sensors',
      inactivity_days: 5,
      status: 'inactive' as const,
      owner: 'iot_team'
    },
    {
      topic: 'alerts/system/memory',
      last_pub_ts: '2024-01-15T10:25:00Z',
      last_deliver_ts: '2024-01-15T10:25:00Z',
      has_retained: false,
      pubs_7d: 144,
      pubs_30d: 720,
      bytes_7d: 7200,
      bytes_30d: 36000,
      active_subs: 2,
      policy_match: 'system_alerts',
      inactivity_days: 0,
      status: 'active' as const,
      owner: 'platform_team'
    }
  ]

  const filteredTopics = mockTopics.filter(topic => 
    activeTab === 'active' ? topic.status === 'active' : topic.status === 'inactive'
  )

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(selectedTopic === topic ? null : topic)
  }

  const handleBulkSelect = (topic: string) => {
    setBulkSelection(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    )
  }

  const handleBulkAction = async (action: 'archive' | 'unarchive' | 'delete') => {
    // Implement bulk actions
    console.log(`Bulk ${action} for topics:`, bulkSelection)
    setBulkSelection([])
    setShowBulkActions(false)
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
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
          Topic lifecycle management with archive, unarchive, and delete operations
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '8px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        gap: '4px'
      }}>
        <button
          onClick={() => setActiveTab('inactive')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'inactive' ? '#3b82f6' : 'transparent',
            color: activeTab === 'inactive' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          📝 Inactive Candidates ({filteredTopics.filter(t => t.status === 'inactive').length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'active' ? '#3b82f6' : 'transparent',
            color: activeTab === 'active' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          ✅ Active Topics ({filteredTopics.filter(t => t.status === 'active').length})
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {bulkSelection.length > 0 && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#1e40af', fontWeight: '500' }}>
            {bulkSelection.length} topic{bulkSelection.length !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleBulkAction('archive')}
              style={{
                padding: '6px 12px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              📦 Archive
            </button>
            <button
              onClick={() => handleBulkAction('unarchive')}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              📤 Unarchive
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              style={{
                padding: '6px 12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => setBulkSelection([])}
              style={{
                padding: '6px 12px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedTopic ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Topics Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              {activeTab === 'active' ? 'Active Topics' : 'Inactive Topic Candidates'}
            </h2>
          </div>
          
          {/* Filters */}
          <div style={{
            padding: '16px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="Topic prefix/pattern..."
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '250px'
              }}
            />
            
            <select style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              <option value="">All Owners</option>
              <option value="iot_team">IoT Team</option>
              <option value="platform_team">Platform Team</option>
            </select>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="checkbox" />
              Has retained
            </label>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', width: '40px' }}>
                    <input 
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkSelection(filteredTopics.map(t => t.topic))
                        } else {
                          setBulkSelection([])
                        }
                      }}
                      checked={bulkSelection.length === filteredTopics.length && filteredTopics.length > 0}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Topic</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Pub</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Retained</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Pubs 7d</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Active Subs</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Owner</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((topic) => (
                  <tr 
                    key={topic.topic}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      background: selectedTopic === topic.topic ? '#eff6ff' : 'white'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <input 
                        type="checkbox"
                        checked={bulkSelection.includes(topic.topic)}
                        onChange={() => handleBulkSelect(topic.topic)}
                      />
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-all' }}>
                      <button
                        onClick={() => handleTopicSelect(topic.topic)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          textAlign: 'left'
                        }}
                      >
                        {topic.topic}
                      </button>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {topic.last_pub_ts ? new Date(topic.last_pub_ts).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {topic.has_retained ? (
                        <span style={{ color: '#059669', fontSize: '16px' }}>✓</span>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '16px' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {topic.pubs_7d.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {topic.active_subs}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: '#e0e7ff',
                        color: '#3730a3'
                      }}>
                        {topic.owner}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {topic.status === 'inactive' ? (
                          <>
                            <button style={{
                              padding: '4px 8px',
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}>
                              Archive
                            </button>
                            <button style={{
                              padding: '4px 8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}>
                              Delete
                            </button>
                          </>
                        ) : (
                          <button style={{
                            padding: '4px 8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}>
                            Unarchive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Topic Detail Panel */}
        {selectedTopic && (
          <TopicDetail
            topic={selectedTopic}
            onClose={() => setSelectedTopic(null)}
            onRefresh={() => {
              // Refresh topics list
            }}
          />
        )}
      </div>
    </div>
  )
}