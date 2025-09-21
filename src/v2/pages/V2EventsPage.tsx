import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useGlobalState } from '../hooks/useGlobalState'
import { useManualRefresh } from '../hooks/useManualRefresh'
import { Event as ApiEvent } from '../../types/api'

// Get API base URL
const API_BASE_URL = (import.meta as any).env?.VITE_GRE_API_BASE_URL || 'http://localhost:3001'

// Use the ApiEvent type from our API types - ensure it includes all fields
interface Event extends ApiEvent {
  retain: boolean
  payload_size: number | null
  broker: string
}

// Multi-select component interfaces
interface MultiSelectFilter {
  key: string
  label: string
  placeholder: string
  selectedValues: string[]
  searchInput: string
  showDropdown: boolean
  availableOptions?: string[]
  maxSelections?: number
  allowTextInput?: boolean
}

interface MultiSelectDropdownProps {
  filter: MultiSelectFilter
  onSearchChange: (value: string) => void
  onToggleDropdown: (show: boolean) => void
  onSelectValue: (value: string) => void
  onRemoveValue: (value: string) => void
}

// Multi-select dropdown component
const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  filter,
  onSearchChange,
  onToggleDropdown,
  onSelectValue,
  onRemoveValue
}) => {
  const { allowTextInput = false, availableOptions = [], maxSelections = 9 } = filter

  // For API-based filters with text input allowed, show filtered suggestions
  // For API-based filters without text input, show all filtered options
  // For pure text filters, no dropdown options
  const filteredOptions = filter.key === 'action' && allowTextInput
    ? availableOptions.filter(value =>
        value.toLowerCase().includes(filter.searchInput.toLowerCase()) &&
        !filter.selectedValues.includes(value)
      ).slice(0, 10) // Show suggestions for actions even with text input
    : allowTextInput
    ? [] // No dropdown options for other text inputs
    : availableOptions.filter(value =>
        value.toLowerCase().includes(filter.searchInput.toLowerCase()) &&
        !filter.selectedValues.includes(value)
      ).slice(0, 10)

  const handleInputClick = () => {
    // Always show dropdown if we have options to show (suggestions)
    if (filteredOptions.length > 0 || !allowTextInput) {
      onToggleDropdown(true)
    }
  }

  const handleSelectValue = (value: string) => {
    if (filter.selectedValues.length < maxSelections) {
      onSelectValue(value)
      onSearchChange('')
      onToggleDropdown(false)
    }
  }

  const handleAddTextValue = () => {
    const trimmedValue = filter.searchInput.trim()
    if (trimmedValue &&
        !filter.selectedValues.includes(trimmedValue) &&
        filter.selectedValues.length < maxSelections) {
      onSelectValue(trimmedValue)
      onSearchChange('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allowTextInput) {
      e.preventDefault()
      handleAddTextValue()
    }
  }

  return (
    <div style={{ position: 'relative', minWidth: '200px', width: '100%' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '4px',
        color: '#374151'
      }}>
        {filter.label}
      </label>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: filter.selectedValues.length > 0 ? '8px' : '0' }}>
        <input
          type="text"
          placeholder={filter.placeholder}
          value={filter.searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box'
          }}
        />

        {/* Add button for text input */}
        {allowTextInput && filter.searchInput.trim() && (
          <button
            onClick={handleAddTextValue}
            style={{
              position: 'absolute',
              right: '4px',
              top: '4px',
              padding: '4px 8px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            disabled={filter.selectedValues.length >= maxSelections}
          >
            Add
          </button>
        )}

        {/* Dropdown for suggestions (works for both allowTextInput and regular dropdowns) */}
        {filter.showDropdown && filteredOptions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {filteredOptions.map((value) => (
              <div
                key={value}
                onClick={() => handleSelectValue(value)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                {value}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Values */}
      {filter.selectedValues.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'flex-start'
        }}>
          {filter.selectedValues.map((value) => (
            <div
              key={value}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor:
                  filter.key === 'action' ? '#dbeafe' :
                  filter.key === 'username' ? '#d1fae5' :
                  filter.key === 'topic' ? '#fef3c7' :
                  filter.key === 'qos' ? '#e0e7ff' : '#f3f4f6',
                color:
                  filter.key === 'action' ? '#1e40af' :
                  filter.key === 'username' ? '#065f46' :
                  filter.key === 'topic' ? '#92400e' :
                  filter.key === 'qos' ? '#3730a3' : '#374151',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                gap: '4px',
                maxWidth: '180px',
                minHeight: '24px'
              }}
            >
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {value}
              </span>
              <button
                onClick={() => onRemoveValue(value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {filter.selectedValues.length >= maxSelections && (
        <div style={{
          fontSize: '12px',
          color: '#ef4444',
          marginTop: '4px'
        }}>
          Maximum {maxSelections} selections allowed
        </div>
      )}
    </div>
  )
}

export const V2EventsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filter states - updated to use arrays for multi-select
  const [actionFilters, setActionFilters] = useState<string[]>([])
  const [topicFilters, setTopicFilters] = useState<string[]>([])
  const [clientFilters, setClientFilters] = useState<string[]>([])
  const [usernameFilters, setUsernameFilters] = useState<string[]>([])
  const [qosFilters, setQosFilters] = useState<string[]>([])
  const [retainFilter, setRetainFilter] = useState(false)
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('24h')

  // Available options for dropdowns
  const [availableActions, setAvailableActions] = useState<string[]>([
    'connected', 'disconnected', 'not_authorized', 'pre_auth', 'publish', 'subscribe', 'unsubscribe', 'watch'
  ])
  const [availableQoSOptions] = useState<string[]>(['0', '1', '2'])
  const [actionsLastFetched, setActionsLastFetched] = useState<Date | null>(null)

  // Multi-select UI states
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({})
  const [showDropdowns, setShowDropdowns] = useState<Record<string, boolean>>({})

  // Persistent filter state management
  const [filterVersion, setFilterVersion] = useState<number>(0) // To track filter changes and avoid stale data

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Saved views
  const [savedViews, setSavedViews] = useState<Array<{name: string, filters: any}>>([])

  // Helper function to calculate timestamp for time range filters
  const getTimeRangeFilter = (timeRange: string): string | null => {
    const now = new Date()
    let hoursAgo: number

    switch (timeRange) {
      case '1h': hoursAgo = 1; break
      case '6h': hoursAgo = 6; break
      case '24h': hoursAgo = 24; break
      case '7d': hoursAgo = 24 * 7; break
      case '30d': hoursAgo = 24 * 30; break
      case 'all': return null // No time filter
      default: return null
    }

    const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    return timeAgo.toISOString()
  }

  // Fetch available actions from API using PostgREST distinct query
  const fetchAvailableActions = useCallback(async (forceRefresh = false) => {
    // Check if we need to refresh (cache for 5 minutes)
    const now = new Date()
    if (!forceRefresh && actionsLastFetched && availableActions.length > 0) {
      const timeSinceLastFetch = now.getTime() - actionsLastFetched.getTime()
      const cacheExpiryMs = 5 * 60 * 1000 // 5 minutes
      if (timeSinceLastFetch < cacheExpiryMs) {
        console.log('Using cached actions, last fetched:', actionsLastFetched)
        return
      }
    }

    try {
      console.log('Fetching fresh actions from API...')

      // Try multiple approaches to get distinct actions efficiently
      let actions: string[] = []

      try {
        // First approach: Get a larger sample with action filter to get more comprehensive list
        const response = await axios.get(`${API_BASE_URL}/events?select=action&action=not.is.null&limit=2000&order=ts.desc`, {
          timeout: 15000
        })
        actions = [...new Set(response.data.map((event: Event) => event.action).filter(Boolean))] as string[]
        console.log('Successfully fetched actions via primary method:', actions)
      } catch (primaryErr) {
        console.warn('Primary fetch failed, trying fallback method:', primaryErr)

        try {
          // Fallback: Get recent events and extract actions
          const response = await axios.get(`${API_BASE_URL}/events?select=action&limit=1000&order=ts.desc`, {
            timeout: 10000
          })
          actions = [...new Set(response.data.map((event: Event) => event.action).filter(Boolean))] as string[]
          console.log('Fetched actions with fallback method:', actions)
        } catch (fallbackErr) {
          console.warn('Fallback fetch also failed:', fallbackErr)
          throw fallbackErr
        }
      }

      // Ensure we have at least some actions
      if (actions.length === 0) {
        throw new Error('No actions returned from API')
      }

      // Ensure core actions are always included
      const coreActions = ['connected', 'disconnected', 'not_authorized', 'pre_auth', 'publish', 'subscribe', 'unsubscribe', 'watch']
      const allActions = [...new Set([...coreActions, ...actions])].sort()
      setAvailableActions(allActions)
      setActionsLastFetched(now)
      console.log(`Successfully loaded ${allActions.length} unique actions from API (including ${coreActions.length} core actions)`)

    } catch (err) {
      console.error('Error fetching available actions:', err)
      // Enhanced fallback with comprehensive MQTT actions based on MQTT protocol
      const fallbackActions = [
        'connected', 'disconnected', 'not_authorized', 'pre_auth', 'publish', 'subscribe', 'unsubscribe', 'watch',
        'connack', 'disconnect', 'pingreq', 'pingresp', 'puback', 'pubcomp',
        'pubrec', 'pubrel', 'suback', 'unsuback', 'auth', 'error', 'timeout',
        'session_present', 'will_message', 'retain_available', 'maximum_qos',
        'keep_alive', 'client_identifier_not_valid', 'bad_username_or_password',
        'server_unavailable', 'server_busy', 'banned'
      ]
      setAvailableActions(fallbackActions.sort())
      setActionsLastFetched(now)
      console.log('Using enhanced fallback actions due to API error')
    }
  }, [actionsLastFetched, availableActions.length])

  // Multi-select handlers
  const handleSearchInputChange = (key: string, value: string) => {
    setSearchInputs(prev => ({ ...prev, [key]: value }))
  }

  const handleToggleDropdown = (key: string, show: boolean) => {
    setShowDropdowns(prev => ({ ...prev, [key]: show }))
  }

  const handleSelectValue = (key: string, value: string) => {
    switch (key) {
      case 'action':
        setActionFilters(prev => [...prev, value])
        break
      case 'topic':
        setTopicFilters(prev => [...prev, value])
        break
      case 'client':
        setClientFilters(prev => [...prev, value])
        break
      case 'username':
        setUsernameFilters(prev => [...prev, value])
        break
      case 'qos':
        setQosFilters(prev => [...prev, value])
        break
    }
    setFilterVersion(prev => prev + 1)
  }

  const handleRemoveValue = (key: string, value: string) => {
    switch (key) {
      case 'action':
        setActionFilters(prev => prev.filter(v => v !== value))
        break
      case 'topic':
        setTopicFilters(prev => prev.filter(v => v !== value))
        break
      case 'client':
        setClientFilters(prev => prev.filter(v => v !== value))
        break
      case 'username':
        setUsernameFilters(prev => prev.filter(v => v !== value))
        break
      case 'qos':
        setQosFilters(prev => prev.filter(v => v !== value))
        break
    }
    setFilterVersion(prev => prev + 1)
  }

  // Fetch events data using real PostgREST API with proper filters
  const fetchEvents = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()

      // Pagination
      const limit = pageSize
      const offset = (page - 1) * pageSize
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())

      // Sorting
      params.append('order', 'ts.desc') // Latest events first

      // Multi-select Filters - use 'in' operator for arrays
      if (actionFilters.length > 0) {
        params.append('action', `in.(${actionFilters.join(',')})`)
      }

      if (topicFilters.length > 0) {
        // For text-based topic filters, use OR with ilike
        const topicConditions = topicFilters.map(topic => `topic.ilike.*${topic.trim()}*`).join(',')
        params.append('or', `(${topicConditions})`)
      }

      if (clientFilters.length > 0) {
        // For text-based client filters, use OR with ilike on og_client field
        const clientConditions = clientFilters.map(client => `og_client.ilike.*${client.trim()}*`).join(',')
        if (topicFilters.length > 0) {
          // If we already have OR conditions, we need to handle this differently
          // For now, let's use a simpler approach with multiple requests or combine conditions
          params.append('and', `(${clientConditions})`)
        } else {
          params.append('or', `(${clientConditions})`)
        }
      }

      if (usernameFilters.length > 0) {
        // For text-based username filters, use OR with ilike
        const usernameConditions = usernameFilters.map(username => `username.ilike.*${username.trim()}*`).join(',')
        params.append('username', `in.(${usernameFilters.join(',')})`) // Try exact match first
      }

      if (qosFilters.length > 0) {
        params.append('qos', `in.(${qosFilters.join(',')})`)
      }

      if (retainFilter) {
        params.append('retain', 'eq.true')
      }

      // Time range filter - fixed to ensure persistence
      const timeRangeTimestamp = getTimeRangeFilter(timeRangeFilter)
      if (timeRangeTimestamp) {
        params.append('ts', `gte.${timeRangeTimestamp}`)
      }

      // Add count header to get total
      const headers = {
        'Prefer': 'count=exact'
      }

      // Make API request
      const response = await axios.get(`${API_BASE_URL}/events?${params.toString()}`, { headers })

      const eventData = response.data as Event[]
      const totalCountHeader = response.headers['content-range']

      // Parse total count from content-range header (format: "0-49/total")
      let totalCount = eventData.length
      if (totalCountHeader) {
        const match = totalCountHeader.match(/\/(\d+)$/)
        if (match) {
          totalCount = parseInt(match[1], 10)
        }
      }

      setEvents(eventData)
      setTotalItems(totalCount)
      setTotalPages(Math.ceil(totalCount / pageSize))
      setCurrentPage(page)
      setLastUpdated(new Date())

      // Check if we discovered any new actions in this batch and refresh if needed
      if (eventData.length > 0) {
        const newActions = [...new Set(eventData.map(event => event.action).filter(Boolean))]
        const unknownActions = newActions.filter(action => !availableActions.includes(action))

        if (unknownActions.length > 0 && availableActions.length > 0) {
          console.log('Discovered new actions in data, refreshing actions list:', unknownActions)
          // Add new actions immediately to avoid delay, ensuring core actions are preserved
          const coreActions = ['connected', 'disconnected', 'not_authorized', 'pre_auth', 'publish', 'subscribe', 'unsubscribe', 'watch']
          setAvailableActions(prev => [...new Set([...coreActions, ...prev, ...unknownActions])].sort())
          // Also trigger a full refresh to catch any other new actions
          fetchAvailableActions(true)
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(errorMessage)
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }, [actionFilters, topicFilters, clientFilters, usernameFilters, qosFilters, retainFilter, timeRangeFilter, filterVersion, pageSize, availableActions, fetchAvailableActions])

  // Load events on mount and when filters change
  useEffect(() => {
    fetchEvents(1) // Reset to page 1 when filters change
  }, [actionFilters, topicFilters, clientFilters, usernameFilters, qosFilters, retainFilter, timeRangeFilter, filterVersion])

  // Load events when page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchEvents(currentPage)
    }
  }, [currentPage, fetchEvents])

  // Auto-refresh
  useEffect(() => {
    if (state.autoRefresh) {
      const interval = setInterval(() => fetchEvents(currentPage), state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchEvents, currentPage, state.autoRefresh, state.refreshInterval])

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchEvents(currentPage)
    fetchAvailableActions(true) // Also refresh actions
  }, [fetchEvents, currentPage, fetchAvailableActions])

  // Listen for manual refresh events
  useManualRefresh(handleManualRefresh, 'Events')

  // Fetch available actions on mount and periodically refresh
  useEffect(() => {
    fetchAvailableActions()

    // Auto-refresh actions every 10 minutes to discover new action types
    const actionsRefreshInterval = setInterval(() => {
      fetchAvailableActions(false) // Use cache if fresh enough
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(actionsRefreshInterval)
  }, [fetchAvailableActions])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('.filter-dropdown')) {
        setShowDropdowns({})
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Clear filters
  const clearFilters = () => {
    setActionFilters([])
    setTopicFilters([])
    setClientFilters([])
    setUsernameFilters([])
    setQosFilters([])
    setRetainFilter(false)
    setTimeRangeFilter('24h')
    setSearchInputs({})
    setShowDropdowns({})
    setFilterVersion(prev => prev + 1)
  }

  // Save current view
  const saveCurrentView = () => {
    const viewName = prompt('Enter a name for this view:')
    if (viewName) {
      const filters = {
        actionFilters,
        topicFilters,
        clientFilters,
        usernameFilters,
        qosFilters,
        retainFilter,
        timeRangeFilter
      }
      setSavedViews(prev => [...prev, { name: viewName, filters }])
    }
  }

  // Load saved view
  const loadSavedView = (filters: any) => {
    setActionFilters(filters.actionFilters || [])
    setTopicFilters(filters.topicFilters || [])
    setClientFilters(filters.clientFilters || [])
    setUsernameFilters(filters.usernameFilters || [])
    setQosFilters(filters.qosFilters || [])
    setRetainFilter(filters.retainFilter || false)
    setTimeRangeFilter(filters.timeRangeFilter || '24h')
    setFilterVersion(prev => prev + 1)
  }

  // Export events as CSV
  const exportToCsv = async () => {
    try {
      setError(null)

      // Build query for export (get all matching records)
      const params = new URLSearchParams()
      params.append('order', 'ts.desc')

      // Apply same filters as current view
      if (actionFilters.length > 0) {
        params.append('action', `in.(${actionFilters.join(',')})`)
      }
      if (topicFilters.length > 0) {
        const topicConditions = topicFilters.map(topic => `topic.ilike.*${topic.trim()}*`).join(',')
        params.append('or', `(${topicConditions})`)
      }
      if (clientFilters.length > 0) {
        const clientConditions = clientFilters.map(client => `og_client.ilike.*${client.trim()}*`).join(',')
        if (topicFilters.length > 0) {
          params.append('and', `(${clientConditions})`)
        } else {
          params.append('or', `(${clientConditions})`)
        }
      }
      if (usernameFilters.length > 0) {
        params.append('username', `in.(${usernameFilters.join(',')})`)
      }
      if (qosFilters.length > 0) {
        params.append('qos', `in.(${qosFilters.join(',')})`)
      }
      if (retainFilter) {
        params.append('retain', 'eq.true')
      }
      const timeRangeTimestamp = getTimeRangeFilter(timeRangeFilter)
      if (timeRangeTimestamp) {
        params.append('ts', `gte.${timeRangeTimestamp}`)
      }

      const response = await axios.get(`${API_BASE_URL}/events?${params.toString()}`)
      const allEvents = response.data as Event[]

      // Convert to CSV
      const headers = ['Timestamp', 'Action', 'Client', 'Username', 'Topic', 'QoS', 'Retain', 'Payload Size']
      const csvRows = [
        headers.join(','),
        ...allEvents.map(event => [
          event.ts,
          event.action,
          event.og_client || event.client || '',
          event.username || '',
          event.topic || '',
          event.qos?.toString() || '',
          event.retain?.toString() || 'false',
          event.payload_size?.toString() || '0'
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      ]

      // Download CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `events_${timeRangeFilter}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatPayloadSize = (size: number | null | undefined) => {
    if (!size) return '0B'
    if (size < 1024) return `${size}B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
    return `${(size / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Events
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Real-time event monitoring and historical analysis
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ color: '#dc2626', fontWeight: '500', marginBottom: '8px' }}>
            Error loading events data
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
            {error}
          </div>
          <button
            onClick={() => fetchEvents(currentPage)}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Event Filters
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={saveCurrentView}
              style={{
                padding: '6px 12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Save View
            </button>
            <button
              onClick={exportToCsv}
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
              Export CSV
            </button>
            <button
              onClick={() => {
                fetchAvailableActions(true)
                // Show user feedback
                const button = document.activeElement as HTMLButtonElement
                if (button) {
                  const originalText = button.textContent
                  button.textContent = 'Refreshing...'
                  button.disabled = true
                  setTimeout(() => {
                    button.textContent = originalText
                    button.disabled = false
                  }, 2000)
                }
              }}
              style={{
                padding: '6px 12px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              title="Refresh available actions from API - fetches latest action types from your events"
            >
              Refresh Actions
            </button>
            <button
              onClick={clearFilters}
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
              Clear Filters
            </button>
          </div>
        </div>

        {/* Time Range Filter */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
            Time Range
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['1h', '6h', '24h', '7d', '30d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRangeFilter(range)}
                style={{
                  padding: '6px 12px',
                  background: timeRangeFilter === range ? '#3b82f6' : '#f3f4f6',
                  color: timeRangeFilter === range ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-select Filter Inputs */}
        <div className="filter-dropdown" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {/* Action Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'action',
              label: 'Actions',
              placeholder: 'Type or select actions...',
              selectedValues: actionFilters,
              searchInput: searchInputs.action || '',
              showDropdown: showDropdowns.action || false,
              availableOptions: availableActions,
              maxSelections: 9,
              allowTextInput: true
            }}
            onSearchChange={(value) => handleSearchInputChange('action', value)}
            onToggleDropdown={(show) => handleToggleDropdown('action', show)}
            onSelectValue={(value) => handleSelectValue('action', value)}
            onRemoveValue={(value) => handleRemoveValue('action', value)}
          />

          {/* Username Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'username',
              label: 'Usernames',
              placeholder: 'Add username filters...',
              selectedValues: usernameFilters,
              searchInput: searchInputs.username || '',
              showDropdown: showDropdowns.username || false,
              maxSelections: 8,
              allowTextInput: true
            }}
            onSearchChange={(value) => handleSearchInputChange('username', value)}
            onToggleDropdown={(show) => handleToggleDropdown('username', show)}
            onSelectValue={(value) => handleSelectValue('username', value)}
            onRemoveValue={(value) => handleRemoveValue('username', value)}
          />

          {/* Topic Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'topic',
              label: 'Topics',
              placeholder: 'Add topic filters...',
              selectedValues: topicFilters,
              searchInput: searchInputs.topic || '',
              showDropdown: showDropdowns.topic || false,
              maxSelections: 8,
              allowTextInput: true
            }}
            onSearchChange={(value) => handleSearchInputChange('topic', value)}
            onToggleDropdown={(show) => handleToggleDropdown('topic', show)}
            onSelectValue={(value) => handleSelectValue('topic', value)}
            onRemoveValue={(value) => handleRemoveValue('topic', value)}
          />

          {/* Client Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'client',
              label: 'Clients',
              placeholder: 'Add client filters...',
              selectedValues: clientFilters,
              searchInput: searchInputs.client || '',
              showDropdown: showDropdowns.client || false,
              maxSelections: 8,
              allowTextInput: true
            }}
            onSearchChange={(value) => handleSearchInputChange('client', value)}
            onToggleDropdown={(show) => handleToggleDropdown('client', show)}
            onSelectValue={(value) => handleSelectValue('client', value)}
            onRemoveValue={(value) => handleRemoveValue('client', value)}
          />

          {/* QoS Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'qos',
              label: 'QoS Levels',
              placeholder: 'Select QoS levels...',
              selectedValues: qosFilters,
              searchInput: searchInputs.qos || '',
              showDropdown: showDropdowns.qos || false,
              availableOptions: availableQoSOptions,
              maxSelections: 3,
              allowTextInput: false
            }}
            onSearchChange={(value) => handleSearchInputChange('qos', value)}
            onToggleDropdown={(show) => handleToggleDropdown('qos', show)}
            onSelectValue={(value) => handleSelectValue('qos', value)}
            onRemoveValue={(value) => handleRemoveValue('qos', value)}
          />

          {/* Retain Filter */}
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={retainFilter}
                onChange={(e) => setRetainFilter(e.target.checked)}
              />
              Retained messages only
            </label>
          </div>
        </div>

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
              Saved Views
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {savedViews.map((view, index) => (
                <button
                  key={index}
                  onClick={() => loadSavedView(view.filters)}
                  style={{
                    padding: '4px 8px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    border: '1px solid #c7d2fe',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {view.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{totalItems.toLocaleString()} events found | Page {currentPage} of {totalPages}</span>
          {actionsLastFetched && (
            <span title={`Actions last fetched: ${actionsLastFetched.toLocaleString()}`}>
              Actions: {availableActions.length} types | Updated: {actionsLastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Events ({totalItems.toLocaleString()})
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Action</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Topic</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>QoS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Retain</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No events found
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' }}>
                      {formatTimestamp(event.ts)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background:
                          event.action === 'connected' ? '#d1fae5' :
                          event.action === 'disconnected' ? '#fee2e2' :
                          event.action === 'publish' ? '#dbeafe' :
                          event.action === 'subscribe' ? '#fef3c7' :
                          event.action === 'unsubscribe' ? '#f3e8ff' : '#f3f4f6',
                        color:
                          event.action === 'connected' ? '#065f46' :
                          event.action === 'disconnected' ? '#991b1b' :
                          event.action === 'publish' ? '#1e40af' :
                          event.action === 'subscribe' ? '#92400e' :
                          event.action === 'unsubscribe' ? '#6b21a8' : '#374151'
                      }}>
                        {event.action}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {event.og_client || event.client || 'Unknown'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {event.username || '-'}
                    </td>
                    <td style={{
                      padding: '16px',
                      color: '#1f2937',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {event.topic || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {event.qos !== null && event.qos !== undefined ? event.qos : '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {event.retain ? (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: '500',
                          background: '#fef3c7',
                          color: '#92400e'
                        }}>
                          Yes
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
                      {formatPayloadSize(event.payload_size)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f8f9fa'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems.toLocaleString()}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  background: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                  color: currentPage === 1 ? '#9ca3af' : '#ffffff',
                  border: currentPage === 1 ? '1px solid #d1d5db' : '1px solid #3b82f6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#3b82f6'
                  }
                }}
              >
                Previous
              </button>

              <span style={{
                padding: '8px 16px',
                fontSize: '14px',
                color: '#1f2937',
                fontWeight: '500',
                background: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  background: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                  color: currentPage === totalPages ? '#9ca3af' : '#ffffff',
                  border: currentPage === totalPages ? '1px solid #d1d5db' : '1px solid #3b82f6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#3b82f6'
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}