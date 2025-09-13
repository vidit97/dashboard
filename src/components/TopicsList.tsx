import React, { useState, useMemo } from 'react'
import { InactiveTopic, TopicActionRequest } from '../config/greApi'
import { GreApiService } from '../services/greApi'
import { ConfirmationModal } from './ConfirmationModal'

interface TopicsListProps {
  topics: InactiveTopic[]
  loading: boolean
  error: string | null
  onTopicSelect: (topic: string) => void
  selectedTopic?: string
  onRefresh: () => void
}

interface TopicActionState {
  [topicName: string]: {
    loading: boolean
    lastAction?: string
    error?: string
  }
}

export const TopicsList: React.FC<TopicsListProps> = ({
  topics,
  loading,
  error,
  onTopicSelect,
  selectedTopic,
  onRefresh
}) => {
  const [filterText, setFilterText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('inactive')
  const [retainedFilter, setRetainedFilter] = useState<'all' | 'retained' | 'not-retained'>('all')
  const [olderThanFilter, setOlderThanFilter] = useState<'all' | '7d' | '14d' | '30d' | 'custom'>('all')
  const [customDate, setCustomDate] = useState('')
  const [sortField, setSortField] = useState<'topic' | 'last_pub_ts' | 'active_subs'>('last_pub_ts')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [actionStates, setActionStates] = useState<TopicActionState>({})
  
  // Bulk operations state
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())
  const [showBulkProgress, setShowBulkProgress] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{
    total: number
    completed: number
    errors: string[]
    currentAction: string
  }>({ total: 0, completed: 0, errors: [], currentAction: '' })
  
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

  const filteredTopics = useMemo(() => {
    let filtered = topics.filter(topic => {
      // Text filter
      const matchesText = topic.topic.toLowerCase().includes(filterText.toLowerCase())
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || topic.status === statusFilter
      
      // Retained filter
      let matchesRetained = true
      if (retainedFilter === 'retained') {
        matchesRetained = topic.has_retained
      } else if (retainedFilter === 'not-retained') {
        matchesRetained = !topic.has_retained
      }

      // Older than filter
      let matchesOlderThan = true
      if (olderThanFilter !== 'all' && topic.last_pub_ts) {
        const pubDate = new Date(topic.last_pub_ts)
        const now = new Date()
        let cutoffDate: Date

        switch (olderThanFilter) {
          case '7d':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '14d':
            cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case 'custom':
            if (customDate) {
              cutoffDate = new Date(customDate)
              matchesOlderThan = pubDate < cutoffDate
            }
            return matchesText && matchesStatus && matchesRetained && matchesOlderThan
          default:
            cutoffDate = now
        }

        matchesOlderThan = pubDate < cutoffDate
      }
      
      return matchesText && matchesStatus && matchesRetained && matchesOlderThan
    })

    // Sort topics
    filtered.sort((a, b) => {
      let aValue: string | number | null
      let bValue: string | number | null

      switch (sortField) {
        case 'topic':
          aValue = a.topic
          bValue = b.topic
          break
        case 'last_pub_ts':
          aValue = a.last_pub_ts
          bValue = b.last_pub_ts
          break
        case 'active_subs':
          aValue = a.active_subs
          bValue = b.active_subs
          break
        default:
          aValue = a.topic
          bValue = b.topic
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return sortDirection === 'asc' ? -1 : 1
      if (bValue === null) return sortDirection === 'asc' ? 1 : -1

      // Compare values
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [topics, filterText, statusFilter, retainedFilter, olderThanFilter, customDate, sortField, sortDirection])

  const handleSort = (field: 'topic' | 'last_pub_ts' | 'active_subs') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSafetyStatus = (topic: InactiveTopic) => {
    // Simple safety logic - can be enhanced based on business rules
    if (topic.active_subs > 0) {
      return { status: 'blocked', reason: 'Has active subscriptions' }
    }
    if (topic.has_retained && topic.status === 'active') {
      return { status: 'blocked', reason: 'Has retained messages and is active' }
    }
    return { status: 'safe-to-delete', reason: 'No active subscriptions or retained messages' }
  }

  // Check if topic has been archived by looking at recent action runs
  const isTopicArchived = (topicName: string): boolean => {
    // This is a simplified check - in reality we'd need to fetch action runs for each topic
    // For now, return false. Could be enhanced to fetch action runs per topic
    return false
  }

  const performTopicAction = async (
    topic: string,
    action: 'archive' | 'unarchive' | 'delete',
    isDryRun: boolean,
    reason: string
  ) => {
    try {
      // Set loading state
      setActionStates(prev => ({
        ...prev,
        [topic]: { loading: true, lastAction: action }
      }))

      const request: TopicActionRequest = {
        p_topic: topic,
        p_actor: 'admin', // TODO: Get from user context
        p_reason: reason || `${action} via UI`,
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
        // Success - update state
        setActionStates(prev => ({
          ...prev,
          [topic]: { loading: false, lastAction: action }
        }))

        // If not dry run, start polling for completion
        if (!isDryRun) {
          const result = await GreApiService.pollTopicActionRuns(topic, action, 20000)
          if (result?.status === 'success') {
            // Refresh the topics list
            onRefresh()
          }
        }
      } else {
        throw new Error(response.error || `Failed to ${action} topic`)
      }
    } catch (error) {
      console.error(`Error performing ${action} on topic ${topic}:`, error)
      setActionStates(prev => ({
        ...prev,
        [topic]: { 
          loading: false, 
          lastAction: action,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  const handleActionClick = (
    topic: string,
    action: 'archive' | 'unarchive' | 'delete',
    isDryRun: boolean = false
  ) => {
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
    if (confirmModal.topic.includes('topics')) {
      // Bulk operation
      const action = confirmModal.type
      performBulkAction(action as 'archive' | 'delete', confirmModal.reason)
    } else {
      // Single topic operation
      performTopicAction(
        confirmModal.topic,
        confirmModal.type,
        confirmModal.isDryRun,
        confirmModal.reason
      )
    }
    setConfirmModal({ ...confirmModal, isOpen: false })
  }

  // Bulk operations handlers
  const handleSelectTopic = (topic: string, selected: boolean) => {
    const newSelected = new Set(selectedTopics)
    if (selected) {
      newSelected.add(topic)
    } else {
      newSelected.delete(topic)
    }
    setSelectedTopics(newSelected)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allTopics = filteredTopics.map(t => t.topic)
      setSelectedTopics(new Set(allTopics))
    } else {
      setSelectedTopics(new Set())
    }
  }

  const performBulkAction = async (action: 'archive' | 'delete', reason: string) => {
    const topicList = Array.from(selectedTopics)
    setBulkProgress({ total: topicList.length, completed: 0, errors: [], currentAction: action })
    setShowBulkProgress(true)

    let completed = 0
    const errors: string[] = []

    for (const topicName of topicList) {
      try {
        setBulkProgress(prev => ({ ...prev, currentAction: `${action} ${topicName}` }))
        
        const result = await GreApiService[action === 'archive' ? 'archiveTopic' : 'deleteTopic']({
          p_topic: topicName,
          p_actor: 'user',
          p_reason: reason,
          p_broker: 'local',
          p_dry_run: false
        })

        if (result.ok) {
          completed++
        } else {
          errors.push(`${topicName}: ${result.message || 'Unknown error'}`)
        }
      } catch (err) {
        errors.push(`${topicName}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      setBulkProgress(prev => ({ ...prev, completed: completed, errors }))
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Close progress modal after 3 seconds
    setTimeout(() => {
      setShowBulkProgress(false)
      setSelectedTopics(new Set())
      onRefresh() // Refresh the topics list
    }, 3000)
  }

  const handleBulkArchive = () => {
    setConfirmModal({
      isOpen: true,
      type: 'archive',
      topic: `${selectedTopics.size} topics`,
      isDryRun: false,
      reason: ''
    })
  }

  const handleBulkDelete = () => {
    // Only allow bulk delete for safe topics
    const selectedSafeTopics = Array.from(selectedTopics).filter(topicName => {
      const topic = topics.find(t => t.topic === topicName)
      return topic && getSafetyStatus(topic).status === 'safe-to-delete'
    })

    if (selectedSafeTopics.length === 0) {
      alert('No safe topics selected for deletion')
      return
    }

    setConfirmModal({
      isOpen: true,
      type: 'delete',
      topic: `${selectedSafeTopics.length} safe topics`,
      isDryRun: false,
      reason: ''
    })
  }

  const getActionButtons = (topic: InactiveTopic) => {
    const actionState = actionStates[topic.topic]
    const isLoading = actionState?.loading || false
    const safety = getSafetyStatus(topic)
    const isArchived = isTopicArchived(topic.topic)

    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Dry Run Archive */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleActionClick(topic.topic, 'archive', true)
          }}
          disabled={isLoading}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: 'white',
            color: '#6b7280',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
          title="Dry run archive"
        >
          {isLoading && actionState?.lastAction === 'archive' ? '⟳' : 'Dry'}
        </button>

        {/* Archive (if inactive and not archived) */}
        {topic.status === 'inactive' && !isArchived && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleActionClick(topic.topic, 'archive', false)
            }}
            disabled={isLoading}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              background: '#3b82f6',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            title="Archive topic - prevents new publications"
          >
            Archive
          </button>
        )}

        {/* Unarchive (if archived) */}
        {isArchived && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleActionClick(topic.topic, 'unarchive', false)
            }}
            disabled={isLoading}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              background: '#10b981',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            title="Unarchive topic - allows publications again"
          >
            Unarchive
          </button>
        )}

        {/* Delete (if inactive and safe) */}
        {topic.status === 'inactive' && safety.status === 'safe-to-delete' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleActionClick(topic.topic, 'delete', false)
            }}
            disabled={isLoading}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              background: '#dc2626',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            title="Delete topic - clears retained messages only"
          >
            Delete
          </button>
        )}

        {/* Status indicator */}
        {actionState?.error && (
          <span style={{ color: '#dc2626', fontSize: '12px' }} title={actionState.error}>
            ❌
          </span>
        )}
        {actionState?.lastAction && !actionState?.loading && !actionState?.error && (
          <span style={{ color: '#10b981', fontSize: '12px' }}>
            ✅
          </span>
        )}
      </div>
    )
  }

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="chart-section">
        <h2 className="chart-title">Topics</h2>
        <div className="chart-placeholder">Loading topics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-section">
        <h2 className="chart-title">Topics</h2>
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

  // Calculate summary statistics
  const totalTopics = topics.length
  const activeTopics = topics.filter(t => t.status === 'active').length
  const inactiveTopics = topics.filter(t => t.status === 'inactive').length
  const topicsWithRetained = topics.filter(t => t.has_retained).length
  const totalSubscriptions = topics.reduce((sum, t) => sum + t.active_subs, 0)

  return (
    <div className="chart-section">
      <h2 className="chart-title">Topics ({filteredTopics.length})</h2>
      
      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
            {totalTopics}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Total Topics
          </div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
            {activeTopics}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Active
          </div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
            {inactiveTopics}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Inactive
          </div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
            {topicsWithRetained}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            With Retained
          </div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>
            {totalSubscriptions}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Total Subscriptions
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '16px', 
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Filter by topic name:
          </label>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search topics..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Retained:
          </label>
          <select
            value={retainedFilter}
            onChange={(e) => setRetainedFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="all">All</option>
            <option value="retained">Has Retained</option>
            <option value="not-retained">No Retained</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Older than:
          </label>
          <select
            value={olderThanFilter}
            onChange={(e) => setOlderThanFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="all">All</option>
            <option value="7d">7 days</option>
            <option value="14d">14 days</option>
            <option value="30d">30 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {olderThanFilter === 'custom' && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Custom date:
            </label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            />
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedTopics.size > 0 && (
        <div style={{
          background: '#f3f4f6',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            {selectedTopics.size} topic{selectedTopics.size !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleBulkArchive}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                border: 'none',
                borderRadius: '4px',
                background: '#3b82f6',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Bulk Archive
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                border: 'none',
                borderRadius: '4px',
                background: '#dc2626',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Bulk Delete Safe
            </button>
            <button
              onClick={() => setSelectedTopics(new Set())}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: 'white',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Topics Table */}
      <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedTopics.size === filteredTopics.length && filteredTopics.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                fontWeight: '600', 
                fontSize: '14px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleSort('topic')}>
                Topic {sortField === 'topic' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                fontWeight: '600', 
                fontSize: '14px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleSort('last_pub_ts')}>
                Last Published {sortField === 'last_pub_ts' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>
                Retained
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontWeight: '600', 
                fontSize: '14px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleSort('active_subs')}>
                Active Subs {sortField === 'active_subs' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>
                Safety
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTopics.map((topic, index) => {
              const safety = getSafetyStatus(topic)
              return (
                <tr
                  key={topic.topic}
                  onClick={() => onTopicSelect(topic.topic)}
                  style={{
                    borderBottom: index < filteredTopics.length - 1 ? '1px solid #e5e7eb' : 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedTopic === topic.topic ? '#eff6ff' : 'white',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTopic !== topic.topic) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTopic !== topic.topic) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedTopics.has(topic.topic)}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleSelectTopic(topic.topic, e.target.checked)
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    fontFamily: 'monospace', 
                    fontSize: '13px',
                    fontWeight: selectedTopic === topic.topic ? '600' : '400'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{topic.topic}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(topic.topic)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          fontSize: '12px'
                        }}
                        title="Copy topic"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                    {formatTimestamp(topic.last_pub_ts)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span 
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: topic.has_retained ? '#dcfce7' : '#f3f4f6',
                        color: topic.has_retained ? '#166534' : '#6b7280',
                        cursor: topic.has_retained ? 'help' : 'default'
                      }}
                      title={topic.has_retained && topic.last_retained_ts ? 
                        `Last retained: ${formatTimestamp(topic.last_retained_ts)}` : 
                        undefined
                      }
                    >
                      {topic.has_retained ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                    {topic.active_subs}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: topic.status === 'active' ? '#dcfce7' : '#fef3c7',
                      color: topic.status === 'active' ? '#166534' : '#92400e'
                    }}>
                      {topic.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span 
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: safety.status === 'safe-to-delete' ? '#dcfce7' : '#fef2f2',
                        color: safety.status === 'safe-to-delete' ? '#166534' : '#dc2626',
                        cursor: 'help'
                      }}
                      title={safety.reason}
                    >
                      {safety.status === 'safe-to-delete' ? 'Safe' : 'Blocked'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {getActionButtons(topic)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredTopics.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            No topics found matching your filters
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={`Confirm ${confirmModal.type.charAt(0).toUpperCase() + confirmModal.type.slice(1)}`}
        message={
          confirmModal.type === 'delete' 
            ? `Are you sure you want to delete this topic? This will clear retained messages`
            : confirmModal.type === 'archive'
            ? `Are you sure you want to archive this topic? This will prevent new publications.`
            : `Are you sure you want to unarchive this topic? This will allow new publications again.`
        }
        confirmText={confirmModal.type.charAt(0).toUpperCase() + confirmModal.type.slice(1)}
        type={confirmModal.type === 'delete' ? 'danger' : 'warning'}
        topic={confirmModal.topic}
        reason={confirmModal.reason}
        onReasonChange={(reason) => setConfirmModal({ ...confirmModal, reason })}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {/* Bulk Progress Modal */}
      {showBulkProgress && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Bulk Operation Progress
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                {bulkProgress.currentAction}
              </div>
              <div style={{ 
                background: '#f3f4f6', 
                borderRadius: '8px', 
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#3b82f6',
                  height: '100%',
                  width: `${(bulkProgress.completed / bulkProgress.total) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                marginTop: '4px',
                textAlign: 'center'
              }}>
                {bulkProgress.completed} / {bulkProgress.total} completed
              </div>
            </div>

            {bulkProgress.errors.length > 0 && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                  Errors:
                </div>
                {bulkProgress.errors.map((error, index) => (
                  <div key={index} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
