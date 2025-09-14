import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { Event as ApiEvent } from '../../types/api'

// Get API base URL
const API_BASE_URL = (import.meta as any).env?.VITE_GRE_API_BASE_URL || 'http://localhost:3001'

// Debounce utility function
const debounce = <T extends (...args: any[]) => void>(func: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

interface DetailedActivityFeedProps {
  className?: string
  refreshInterval?: number
}

// Use the ApiEvent type from our API types
type ActivityEvent = ApiEvent

interface PaginationInfo {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}

interface FilterState {
  action: string
  timeRange: string
  clientSearch: string
  topicSearch: string
  usernameSearch: string
}

interface CacheEntry {
  data: ActivityEvent[]
  totalCount: number
  timestamp: number
  filters: string // stringified filter state for cache key
}

// Time range options (exact hours, no buffer needed)
const TIME_RANGES = [
  { label: '1 Hour', value: '1h', hours: 1 },
  { label: '3 Hours', value: '3h', hours: 3 },
  { label: '6 Hours', value: '6h', hours: 6 },
  { label: '24 Hours', value: '24h', hours: 24 }
] as const

export const DetailedActivityFeed: React.FC<DetailedActivityFeedProps> = ({ 
  className = '', 
  refreshInterval = 30
}) => {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    action: 'all',
    timeRange: '1h', // Default to last 1 hour
    clientSearch: '',
    topicSearch: '',
    usernameSearch: ''
  })
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map())
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: getAdaptivePageSize(),
    totalItems: 0,
    totalPages: 0
  })

  // Adaptive page size based on screen width
  function getAdaptivePageSize(): number {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth
      if (width <= 768) return 10 // Mobile
      if (width <= 1024) return 20 // Tablet
      return 25 // Desktop
    }
    return 25 // Default
  }

  // Generate cache key from current filters and pagination
  const getCacheKey = (page: number, filterState: FilterState): string => {
    return `${page}_${JSON.stringify(filterState)}_${pagination.pageSize}`
  }

  // Check if cache entry is still valid (5 minutes)
  const isCacheValid = (entry: CacheEntry): boolean => {
    return (Date.now() - entry.timestamp) < 5 * 60 * 1000
  }

  // Update filter state
  const updateFilter = (filterKey: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((filterKey: keyof FilterState, value: string) => {
      setFilters(prev => ({ ...prev, [filterKey]: value }))
    }, 300),
    []
  )

  // Clear search filters
  const clearSearchFilters = () => {
    setFilters(prev => ({
      ...prev,
      clientSearch: '',
      topicSearch: '',
      usernameSearch: ''
    }))
  }

  // Helper function to calculate ISO8601 timestamp for time range filters
  const getTimeRangeFilter = (timeRange: string): string | null => {
    const selectedRange = TIME_RANGES.find(r => r.value === timeRange)
    if (selectedRange && selectedRange.hours) {
      const now = Date.now()
      const hoursAgo = selectedRange.hours * 60 * 60 * 1000
      const targetTime = now - hoursAgo
      const timeFilter = new Date(targetTime).toISOString()
      return timeFilter
    }
    return null
  }

  // Fetch activities with proper count-first approach
  const fetchActivities = useCallback(async (page: number = 1, useCache: boolean = true) => {
    try {
      // Check cache first
      const cacheKey = getCacheKey(page, filters)
      if (useCache && cache.has(cacheKey)) {
        const entry = cache.get(cacheKey)!
        if (isCacheValid(entry)) {
          setActivities(entry.data)
          setPagination({
            currentPage: page,
            pageSize: pagination.pageSize,
            totalItems: entry.totalCount,
            totalPages: Math.ceil(entry.totalCount / pagination.pageSize)
          })
          setLastUpdated(new Date(entry.timestamp))
          return
        }
      }

      setLoading(true)
      setError(null)
      
      // Clean the base URL
      const cleanBaseUrl = API_BASE_URL.replace(/\/$/, '')
      
      // Step 1: Build base query parameters for counting
      const baseParams = new URLSearchParams()
      
      // Time range filter - calculate exact timestamp
      const timeFilter = getTimeRangeFilter(filters.timeRange)
      if (timeFilter) {
        baseParams.append('ts', `gte.${timeFilter}`)
      }
      
      // Action filter
      if (filters.action !== 'all') {
        baseParams.append('action', `eq.${filters.action}`)
      }
      
      // Search filters
      if (filters.clientSearch.trim()) {
        baseParams.append('client', `like.*${filters.clientSearch.trim()}*`)
      }
      
      if (filters.topicSearch.trim()) {
        baseParams.append('topic', `like.*${filters.topicSearch.trim()}*`)
      }
      
      if (filters.usernameSearch.trim()) {
        baseParams.append('username', `like.*${filters.usernameSearch.trim()}*`)
      }
      
      // Step 2: First get the total count
      const countUrl = `${cleanBaseUrl}/events?${baseParams.toString()}`
      const countResponse = await axios.get(countUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        },
        timeout: 30000
      })
      
      // Extract total count from Content-Range header
      const contentRange = countResponse.headers['content-range']
      const totalCount = contentRange ? parseInt(contentRange.split('/')[1] || '0') : 0
      
      // Step 3: Now get the actual paginated data
      const dataParams = new URLSearchParams(baseParams)
      dataParams.append('offset', ((page - 1) * pagination.pageSize).toString())
      dataParams.append('limit', pagination.pageSize.toString())
      dataParams.append('order', 'ts.desc')
      dataParams.append('select', 'id,ts,action,client,topic,qos,username')
      
      const dataUrl = `${cleanBaseUrl}/events?${dataParams.toString()}`
      const dataResponse = await axios.get<ApiEvent[]>(dataUrl, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
      
      const eventData = dataResponse.data
      
      // Cache the result
      const cacheEntry: CacheEntry = {
        data: eventData,
        totalCount: totalCount,
        timestamp: Date.now(),
        filters: JSON.stringify(filters)
      }
      
      setCache(prev => new Map(prev.set(cacheKey, cacheEntry)))
      
      setActivities(eventData)
      setPagination({
        currentPage: page,
        pageSize: pagination.pageSize,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pagination.pageSize)
      })
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch events'
      console.error('Error fetching activities:', err)
      if (axios.isAxiosError(err)) {
        console.error('Axios error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        })
      }
      setError(`API Error: ${errorMsg}`)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.pageSize, cache])

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchActivities(1, false) // Don't use cache on filter changes
  }, [filters])
  
  // Clear cache when filters change
  useEffect(() => {
    setCache(new Map())
  }, [filters.action, filters.timeRange, filters.clientSearch, filters.topicSearch, filters.usernameSearch])

  // Auto-refresh functionality - only refresh page 1 and only if no search filters
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const hasSearchFilters = filters.clientSearch || filters.topicSearch || filters.usernameSearch
      
      // Only auto-refresh if on page 1 and no search filters active
      if (pagination.currentPage === 1 && !hasSearchFilters) {
        const interval = setInterval(() => {
          fetchActivities(1, false) // Don't use cache for refreshes
        }, refreshInterval * 1000)
        return () => clearInterval(interval)
      }
    }
  }, [fetchActivities, refreshInterval, pagination.currentPage, filters])

  // Navigation functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchActivities(page)
    }
  }

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      connected: '#10b981',
      disconnected: '#ef4444',
      subscribe: '#3b82f6',
      unsubscribe: '#f59e0b',
      publish: '#8b5cf6',
      checkpoint: '#06b6d4',
      conn_info: '#6b7280',
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  if (loading && activities.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        Loading events...
      </div>
    )
  }

  if (error && activities.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        color: '#ef4444',
        fontSize: '14px'
      }}>
        {error}
        <br />
        <button 
          onClick={() => fetchActivities(1)}
          style={{ 
            marginTop: '8px', 
            fontSize: '12px', 
            padding: '4px 8px',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto'
        }}>
          {/* Time Range Selector */}
          <select 
            value={filters.timeRange}
            onChange={(e) => updateFilter('timeRange', e.target.value)}
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: 'white',
              color: '#374151'
            }}
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select 
            value={filters.action}
            onChange={(e) => updateFilter('action', e.target.value)}
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: 'white',
              color: '#374151'
            }}
          >
            <option value="all">All Events</option>
            <option value="connected">Connections</option>
            <option value="disconnected">Disconnections</option>
            <option value="subscribe">Subscriptions</option>
            <option value="unsubscribe">Unsubscriptions</option>
            <option value="publish">Publish</option>
            <option value="checkpoint">Checkpoints</option>
            <option value="conn_info">Connection Info</option>
            <option value="error">Errors</option>
            <option value="unknown">Unknown</option>
          </select>
          
          {/* Search Toggle Button */}
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: isSearchExpanded ? '#3b82f6' : '#f3f4f6',
              color: isSearchExpanded ? 'white' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔍 Search
            {(filters.clientSearch || filters.topicSearch || filters.usernameSearch) && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.8)',
                color: 'white',
                borderRadius: '50%',
                width: '6px',
                height: '6px',
                fontSize: '6px'
              }} />
            )}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => fetchActivities(pagination.currentPage, false)} 
            disabled={loading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: loading ? '#f9fafb' : '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#374151'
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
          
          {/* Clear Cache Button */}
          <button 
            onClick={() => setCache(new Map())}
            title="Clear cache"
            style={{
              padding: '6px 8px',
              fontSize: '11px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Expanded Search Filters */}
      {isSearchExpanded && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'end'
          }}>
            {/* Client Search */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '4px'
              }}>
                Client ID
              </label>
              <input
                type="text"
                placeholder="Filter by client..."
                value={filters.clientSearch}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, clientSearch: e.target.value }))
                  debouncedSearch('clientSearch', e.target.value)
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: 'white'
                }}
              />
            </div>
            
            {/* Topic Search */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '4px'
              }}>
                Topic
              </label>
              <input
                type="text"
                placeholder="Filter by topic..."
                value={filters.topicSearch}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, topicSearch: e.target.value }))
                  debouncedSearch('topicSearch', e.target.value)
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: 'white'
                }}
              />
            </div>
            
            {/* Username Search */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '4px'
              }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Filter by username..."
                value={filters.usernameSearch}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, usernameSearch: e.target.value }))
                  debouncedSearch('usernameSearch', e.target.value)
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: 'white'
                }}
              />
            </div>
            
            {/* Clear Filters Button */}
            <div>
              <button
                onClick={clearSearchFilters}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event List */}
      <div style={{ 
        maxHeight: '600px', 
        overflowY: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        background: 'white'
      }}>
        {activities.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px', 
            color: '#6b7280',
            fontSize: '14px'
          }}>
            No events found in the last {TIME_RANGES.find(r => r.value === filters.timeRange)?.label.toLowerCase()}
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#9ca3af' }}>
              Try selecting a longer time range or different filters
            </div>
          </div>
        ) : (
          <div>
            {isMobile ? (
              /* Mobile Card Layout */
              <div>
                {activities.map((activity) => (
                  <div 
                    key={activity.id}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #f3f4f6',
                      background: 'white'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ 
                        backgroundColor: getActionColor(activity.action) + '20',
                        color: getActionColor(activity.action),
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {activity.action}
                      </span>
                      <span style={{ 
                        fontSize: '11px',
                        color: '#9ca3af'
                      }}>
                        {getRelativeTime(activity.ts)}
                      </span>
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#1f2937',
                      marginBottom: '4px',
                      wordBreak: 'break-all'
                    }}>
                      <strong>Client:</strong> {activity.client || <span style={{ color: '#9ca3af' }}>—</span>}
                    </div>

                    <div style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#1f2937',
                      marginBottom: '4px',
                      wordBreak: 'break-all'
                    }}>
                      <strong>Topic:</strong> {activity.topic || <span style={{ color: '#9ca3af' }}>—</span>}
                    </div>

                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      <strong>User:</strong> {activity.username || <span style={{ color: '#9ca3af' }}>—</span>}
                    </div>
                    
                    <div style={{ 
                      fontSize: '11px',
                      color: '#9ca3af',
                      fontFamily: 'monospace'
                    }}>
                      {formatTime(activity.ts)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop Table Layout */
              <div>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr 100px 120px 80px',
                  gap: '12px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#374151',
                  position: 'sticky',
                  top: 0
                }}>
                  <div>Action</div>
                  <div>Client</div>
                  <div>Topic</div>
                  <div>Username</div>
                  <div>Timestamp</div>
                  <div>Time</div>
                </div>

                {/* Event Rows */}
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 1fr 100px 120px 80px',
                      gap: '12px',
                      padding: '10px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '12px',
                      alignItems: 'center'
                    }}
                  >
                    {/* Action */}
                    <div>
                      <span style={{
                        backgroundColor: getActionColor(activity.action) + '20',
                        color: getActionColor(activity.action),
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {activity.action}
                      </span>
                    </div>

                    {/* Client */}
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {activity.client ? (
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#1f2937'
                        }}>
                          {activity.client.length > 25 ? activity.client.substring(0, 25) + '...' : activity.client}
                        </div>
                      ) : (
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>—</div>
                      )}
                    </div>

                    {/* Topic */}
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {activity.topic ? (
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#1f2937'
                        }}>
                          {activity.topic.length > 25 ? activity.topic.substring(0, 25) + '...' : activity.topic}
                        </div>
                      ) : (
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>—</div>
                      )}
                    </div>

                    {/* Username */}
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {activity.username ? (
                        <div style={{
                          fontSize: '11px',
                          color: '#1f2937'
                        }}>
                          {activity.username.length > 15 ? activity.username.substring(0, 15) + '...' : activity.username}
                        </div>
                      ) : (
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>—</div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#6b7280'
                    }}>
                      {formatTime(activity.ts)}
                    </div>

                    {/* Relative Time */}
                    <div style={{
                      fontSize: '11px',
                      color: '#9ca3af'
                    }}>
                      {getRelativeTime(activity.ts)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center',
          marginTop: '16px',
          gap: '12px',
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280' 
          }}>
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems.toLocaleString()} events
          </div>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Previous Page */}
            <button
              onClick={() => goToPage(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                background: pagination.currentPage === 1 ? '#f9fafb' : '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer',
                color: pagination.currentPage === 1 ? '#9ca3af' : '#374151'
              }}
            >
              ←
            </button>

            {/* Page Numbers */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {/* First page */}
              {pagination.currentPage > 3 && (
                <>
                  <button
                    onClick={() => goToPage(1)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#374151'
                    }}
                  >
                    1
                  </button>
                  {pagination.currentPage > 4 && (
                    <span style={{ padding: '6px 4px', fontSize: '12px', color: '#9ca3af' }}>...</span>
                  )}
                </>
              )}

              {/* Pages around current */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const startPage = Math.max(1, Math.min(pagination.currentPage - 2, pagination.totalPages - 4))
                const pageNum = startPage + i
                
                if (pageNum > pagination.totalPages) return null
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      background: pageNum === pagination.currentPage ? '#3b82f6' : '#f3f4f6',
                      color: pageNum === pagination.currentPage ? 'white' : '#374151',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}

              {/* Last page */}
              {pagination.currentPage < pagination.totalPages - 2 && (
                <>
                  {pagination.currentPage < pagination.totalPages - 3 && (
                    <span style={{ padding: '6px 4px', fontSize: '12px', color: '#9ca3af' }}>...</span>
                  )}
                  <button
                    onClick={() => goToPage(pagination.totalPages)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#374151'
                    }}
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Next Page */}
            <button
              onClick={() => goToPage(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                background: pagination.currentPage === pagination.totalPages ? '#f9fafb' : '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                color: pagination.currentPage === pagination.totalPages ? '#9ca3af' : '#374151'
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      {lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '12px', 
          fontSize: '11px', 
          color: '#9ca3af' 
        }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
          {refreshInterval > 0 && ` • Auto-refresh: ${refreshInterval}s`}
        </div>
      )}
    </div>
  )
}