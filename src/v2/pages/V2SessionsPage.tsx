import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { GreApiService } from '../../services/greApi'
import { Session, Event } from '../../types/api'
// Reusing existing GRE components
import SessionReliability from '../../components/SessionReliability'
import RecentConnectDisconnects from '../../components/RecentConnectDisconnects'
import ClientGantt from '../../components/ClientGantt'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  const { allowTextInput = true, maxSelections = 8 } = filter

  const handleInputClick = () => {
    if (!allowTextInput) {
      onToggleDropdown(true)
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
                  filter.key === 'client' ? '#dbeafe' :
                  filter.key === 'username' ? '#d1fae5' :
                  filter.key === 'ip' ? '#fef3c7' :
                  filter.key === 'protocol' ? '#e0e7ff' : '#f3f4f6',
                color:
                  filter.key === 'client' ? '#1e40af' :
                  filter.key === 'username' ? '#065f46' :
                  filter.key === 'ip' ? '#92400e' :
                  filter.key === 'protocol' ? '#3730a3' : '#374151',
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

interface SessionWithDuration extends Session {
  duration?: string
  ip_port: string
}

interface SessionChartData {
  time: string
  connects: number
  disconnects: number
  net: number
}

interface TimeRange {
  label: string
  hours: number
  granularityMinutes: number
}

const TIME_RANGES: TimeRange[] = [
  { label: '1h', hours: 1, granularityMinutes: 5 },
  { label: '6h', hours: 6, granularityMinutes: 15 },
  { label: '24h', hours: 24, granularityMinutes: 60 },
  { label: '7d', hours: 168, granularityMinutes: 180 } // Changed from 60 to 180 (3 hours)
]

export const V2SessionsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [sessions, setSessions] = useState<SessionWithDuration[]>([])
  const [chartData, setChartData] = useState<SessionChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[2])

  // Server-side pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Server-side filter states (include)
  const [clientFilters, setClientFilters] = useState<string[]>([])
  const [usernameFilters, setUsernameFilters] = useState<string[]>([])
  const [ipFilters, setIpFilters] = useState<string[]>([])
  const [protocolFilters, setProtocolFilters] = useState<string[]>([])

  // Server-side filter states (exclude)
  const [clientExcludeFilters, setClientExcludeFilters] = useState<string[]>([])
  const [usernameExcludeFilters, setUsernameExcludeFilters] = useState<string[]>([])
  const [ipExcludeFilters, setIpExcludeFilters] = useState<string[]>([])
  const [protocolExcludeFilters, setProtocolExcludeFilters] = useState<string[]>([])

  const [sessionTimeRange, setSessionTimeRange] = useState('24h') // 1h, 6h, 24h, 7d, 30d, all
  const [sessionStatus, setSessionStatus] = useState('all') // all, active, ended

  // Multi-select UI states
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({})
  const [showDropdowns, setShowDropdowns] = useState<Record<string, boolean>>({})

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

  // Fetch sessions with server-side pagination and filtering
  const fetchSessions = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      // Build server-side filters
      const filters: Record<string, string> = {}

      // Session status filter
      if (sessionStatus === 'active') {
        filters['end_ts'] = 'is.null'
      } else if (sessionStatus === 'ended') {
        filters['end_ts'] = 'not.is.null'
      }

      // Time range filter
      const timeRangeTimestamp = getTimeRangeFilter(sessionTimeRange)
      if (timeRangeTimestamp) {
        filters['start_ts'] = `gte.${timeRangeTimestamp}`
      }

      // Include filters (original logic)
      if (clientFilters.length > 0) {
        filters['client'] = `in.(${clientFilters.join(',')})`
      }

      if (usernameFilters.length > 0) {
        const usernameConditions = usernameFilters.map(username => `username.ilike.*${username.trim()}*`).join(',')
        filters['or'] = `(${usernameConditions})`
      }

      if (ipFilters.length > 0) {
        const ipConditions = ipFilters.map(ip => `ip_address.ilike.*${ip.trim()}*`).join(',')
        if (filters['or']) {
          filters['and'] = `(${ipConditions})`
        } else {
          filters['or'] = `(${ipConditions})`
        }
      }

      if (protocolFilters.length > 0) {
        filters['protocol_version'] = `in.(${protocolFilters.join(',')})`
      }

      // Exclude filters - must be combined with existing filters using AND logic
      const excludeConditions: string[] = []

      // Client exclude filters
      if (clientExcludeFilters.length > 0) {
        if (filters['client']) {
          // Already have include filter, can't easily combine with exclude in same parameter
          // PostgREST limitation: need to use AND logic
          clientExcludeFilters.forEach(client => {
            excludeConditions.push(`client.neq.${client.trim()}`)
          })
        } else {
          // No include filter, can use direct not.in
          filters['client'] = `not.in.(${clientExcludeFilters.join(',')})`
        }
      }

      // Username exclude filters
      if (usernameExcludeFilters.length > 0) {
        usernameExcludeFilters.forEach(username => {
          excludeConditions.push(`username.not.ilike.*${username.trim()}*`)
        })
      }

      // IP exclude filters
      if (ipExcludeFilters.length > 0) {
        ipExcludeFilters.forEach(ip => {
          excludeConditions.push(`ip_address.not.ilike.*${ip.trim()}*`)
        })
      }

      // Protocol exclude filters
      if (protocolExcludeFilters.length > 0) {
        if (filters['protocol_version']) {
          // Already have include filter, can't easily combine
          protocolExcludeFilters.forEach(protocol => {
            excludeConditions.push(`protocol_version.neq.${protocol.trim()}`)
          })
        } else {
          // No include filter, can use direct not.in
          filters['protocol_version'] = `not.in.(${protocolExcludeFilters.join(',')})`
        }
      }

      // Add all exclude conditions to the AND clause
      if (excludeConditions.length > 0) {
        if (filters['and']) {
          // Already have AND conditions, append exclude conditions
          filters['and'] = `(${filters['and']},${excludeConditions.join(',')})`
        } else {
          // Create new AND clause with exclude conditions
          filters['and'] = `(${excludeConditions.join(',')})`
        }
      }

      // Debug: Log the filters being applied
      console.log('🔍 Applied filters:', filters)
      console.log('🔍 Filter states:', {
        clientFilters,
        clientExcludeFilters,
        usernameFilters,
        usernameExcludeFilters
      })

      // Get sessions data with pagination
      const sessionsResult = await GreApiService.getSessionsPaginated({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        filters,
        sortColumn: 'start_ts',
        sortDirection: 'desc'
      })

      // Enhance sessions with duration and ip_port
      const enhancedSessions: SessionWithDuration[] = sessionsResult.data.map(session => {
        let duration = 'ongoing'
        if (session.end_ts) {
          const startTime = new Date(session.start_ts).getTime()
          const endTime = new Date(session.end_ts).getTime()
          const durationMs = endTime - startTime
          const minutes = Math.floor(durationMs / 60000)
          const seconds = Math.floor((durationMs % 60000) / 1000)
          duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
        }

        return {
          ...session,
          duration,
          ip_port: `${session.ip_address || 'N/A'}:${session.port || 'N/A'}`
        }
      })

      setSessions(enhancedSessions)
      setTotalItems(sessionsResult.totalCount)
      setTotalPages(Math.ceil(sessionsResult.totalCount / pageSize))
      setCurrentPage(page)

      // Fetch connection events for chart based on selected time range
      try {
        const endTime = new Date()
        const startTime = new Date()
        startTime.setHours(startTime.getHours() - selectedTimeRange.hours)

        const eventsResult = await GreApiService.getEventsPaginated({
          limit: 10000,
          offset: 0,
          filters: {
            'ts': `gte.${startTime.toISOString()}`,
            'action': 'in.(connected,disconnected)'
          },
          sortColumn: 'ts',
          sortDirection: 'asc'
        })

        // Process events into chart data
        const intervals = Math.ceil(selectedTimeRange.hours * 60 / selectedTimeRange.granularityMinutes)
        const chartDataPoints: SessionChartData[] = []

        for (let i = 0; i < intervals; i++) {
          const intervalStart = new Date(startTime.getTime() + i * selectedTimeRange.granularityMinutes * 60000)
          const intervalEnd = new Date(intervalStart.getTime() + selectedTimeRange.granularityMinutes * 60000)

          const intervalEvents = eventsResult.data.filter(event => {
            const eventTime = new Date(event.ts).getTime()
            return eventTime >= intervalStart.getTime() && eventTime < intervalEnd.getTime()
          })

          const connects = intervalEvents.filter(e => e.action === 'connected').length
          const disconnects = intervalEvents.filter(e => e.action === 'disconnected').length

          // Format time label based on time range duration
          let timeLabel: string
          if (selectedTimeRange.hours <= 24) {
            // For 1h, 6h, 24h - show only time
            timeLabel = intervalStart.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
          } else {
            // For 7d - show date when day changes, otherwise show time (use UTC consistently)
            const currentDay = intervalStart.getUTCDate()
            const previousInterval = i > 0 ? new Date(startTime.getTime() + (i - 1) * selectedTimeRange.granularityMinutes * 60000) : null
            const previousDay = previousInterval ? previousInterval.getUTCDate() : null
            
            // Show date when day changes or for the first data point
            if (i === 0 || currentDay !== previousDay) {
              timeLabel = intervalStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
              })
            } else {
              // Show only time for other intervals
              timeLabel = intervalStart.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC'
              })
            }
          }

          chartDataPoints.push({
            time: timeLabel,
            connects,
            disconnects,
            net: connects - disconnects
          })
          
          // DEBUG: Log what we're actually pushing to the chart
          if (selectedTimeRange.hours > 24 && (i === 0 || i % 24 === 0)) {
            console.log('📊 Chart data point added:', { i, timeLabel, connects, disconnects })
          }
        }

        console.log('📈 Final chart data (first 10 points):', chartDataPoints.slice(0, 10).map(p => ({ time: p.time, connects: p.connects })))
        console.log('📈 Final chart data (last 10 points):', chartDataPoints.slice(-10).map(p => ({ time: p.time, connects: p.connects })))
        
        // DEBUG: Show all date labels in the data
        const dateLabels = chartDataPoints.filter(p => !p.time.includes(':'))
        console.log('📅 All date labels in chart data:', dateLabels.map(p => ({ time: p.time, index: chartDataPoints.indexOf(p) })))
        setChartData(chartDataPoints)
      } catch (chartError) {
        console.error('Error fetching chart data:', chartError)
        setChartData([])
      }

      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch sessions data'
      setError(errorMsg)
      console.error('Error fetching sessions data:', err)
    } finally {
      setLoading(false)
    }
  }, [clientFilters, usernameFilters, ipFilters, protocolFilters, clientExcludeFilters, usernameExcludeFilters, ipExcludeFilters, protocolExcludeFilters, sessionTimeRange, sessionStatus, pageSize, selectedTimeRange])

  // Multi-select handlers
  const handleSearchInputChange = (key: string, value: string) => {
    setSearchInputs(prev => ({ ...prev, [key]: value }))
  }

  const handleToggleDropdown = (key: string, show: boolean) => {
    setShowDropdowns(prev => ({ ...prev, [key]: show }))
  }

  const handleSelectValue = (key: string, value: string) => {
    console.log('🎯 handleSelectValue called:', { key, value })
    switch (key) {
      case 'client':
        setClientFilters(prev => [...prev, value])
        break
      case 'username':
        setUsernameFilters(prev => [...prev, value])
        break
      case 'ip':
        setIpFilters(prev => [...prev, value])
        break
      case 'protocol':
        setProtocolFilters(prev => [...prev, value])
        break
      case 'exclude-client':
        console.log('🚫 Adding client exclude:', value)
        setClientExcludeFilters(prev => [...prev, value])
        break
      case 'exclude-username':
        console.log('🚫 Adding username exclude:', value)
        setUsernameExcludeFilters(prev => [...prev, value])
        break
      case 'exclude-ip':
        console.log('🚫 Adding IP exclude:', value)
        setIpExcludeFilters(prev => [...prev, value])
        break
      case 'exclude-protocol':
        console.log('🚫 Adding protocol exclude:', value)
        setProtocolExcludeFilters(prev => [...prev, value])
        break
    }
  }

  const handleRemoveValue = (key: string, value: string) => {
    switch (key) {
      case 'client':
        setClientFilters(prev => prev.filter(v => v !== value))
        break
      case 'username':
        setUsernameFilters(prev => prev.filter(v => v !== value))
        break
      case 'ip':
        setIpFilters(prev => prev.filter(v => v !== value))
        break
      case 'protocol':
        setProtocolFilters(prev => prev.filter(v => v !== value))
        break
      case 'exclude-client':
        setClientExcludeFilters(prev => prev.filter(v => v !== value))
        break
      case 'exclude-username':
        setUsernameExcludeFilters(prev => prev.filter(v => v !== value))
        break
      case 'exclude-ip':
        setIpExcludeFilters(prev => prev.filter(v => v !== value))
        break
      case 'exclude-protocol':
        setProtocolExcludeFilters(prev => prev.filter(v => v !== value))
        break
    }
  }

  // Clear filters
  const clearFilters = () => {
    setClientFilters([])
    setUsernameFilters([])
    setIpFilters([])
    setProtocolFilters([])
    setClientExcludeFilters([])
    setUsernameExcludeFilters([])
    setIpExcludeFilters([])
    setProtocolExcludeFilters([])
    setSessionTimeRange('24h')
    setSessionStatus('all')
    setSearchInputs({})
    setShowDropdowns({})
  }

  // Load sessions on mount and when filters change
  useEffect(() => {
    fetchSessions(1) // Reset to page 1 when filters change
  }, [clientFilters, usernameFilters, ipFilters, protocolFilters, clientExcludeFilters, usernameExcludeFilters, ipExcludeFilters, protocolExcludeFilters, sessionTimeRange, sessionStatus, selectedTimeRange])

  // Load sessions when page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchSessions(currentPage)
    }
  }, [currentPage, fetchSessions])

  // Auto-refresh
  useEffect(() => {
    if (state.autoRefresh) {
      const interval = setInterval(() => fetchSessions(currentPage), state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchSessions, currentPage, state.autoRefresh, state.refreshInterval])

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchSessions(currentPage)
  }, [fetchSessions, currentPage])

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
          Sessions
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Session lifecycle and IP/protocol intelligence
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
            Error loading sessions data
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
            {error}
          </div>
          <button
            onClick={handleManualRefresh}
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

      {/* Session Starts/Stops Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Session Starts/Stops Rate (Last {selectedTimeRange.label})
            </h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              {TIME_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedTimeRange(range)}
                  style={{
                    padding: '6px 12px',
                    background: selectedTimeRange.label === range.label ? '#3b82f6' : '#f3f4f6',
                    color: selectedTimeRange.label === range.label ? 'white' : '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '300px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    interval={0}
                    angle={selectedTimeRange.hours > 24 ? -45 : 0}
                    textAnchor={selectedTimeRange.hours > 24 ? 'end' : 'middle'}
                    height={selectedTimeRange.hours > 24 ? 80 : 60}
                    tick={(props) => {
                      const { x, y, payload } = props
                      const value = payload.value
                      const isDate = !value.includes(':')
                      
                      if (selectedTimeRange.hours > 24) {
                        const index = payload.index
                        const isEvery6Hours = index % 2 === 0
                        if (!isDate && !isEvery6Hours) return null
                      }
                      
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={16}
                            textAnchor={selectedTimeRange.hours > 24 ? 'end' : 'middle'}
                            fill={isDate ? '#1f2937' : '#6b7280'}
                            fontSize={isDate ? 13 : 12}
                            fontWeight={isDate ? 600 : 400}
                            transform={selectedTimeRange.hours > 24 ? 'rotate(-45)' : ''}
                          >
                            {value}
                          </text>
                        </g>
                      )
                    }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="connects"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Connects"
                  />
                  <Line
                    type="monotone"
                    dataKey="disconnects"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Disconnects"
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Net Change"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                {loading ? 'Loading chart data...' : 'No chart data available'}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Recent Connects/Disconnects Component - Full Width */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <RecentConnectDisconnects
            className="recent-connects-chart"
            refreshInterval={60}
          />
        </div>
      </div>

      {/* Client Gantt Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <ClientGantt
            className="client-gantt-chart"
            refreshInterval={30}
          />
        </div>
      </div>

      {/* Session Reliability Component - Full Width */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <SessionReliability
            className="session-reliability-chart"
            refreshInterval={120}
            timeRange={sessionTimeRange}
          />
        </div>
      </div>

      {/* Filters */}
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
            Session Filters
          </h3>
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

        {/* Time Range Filter */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
            Time Range
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['1h', '6h', '24h', '7d', '30d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setSessionTimeRange(range)}
                style={{
                  padding: '6px 12px',
                  background: sessionTimeRange === range ? '#3b82f6' : '#f3f4f6',
                  color: sessionTimeRange === range ? 'white' : '#374151',
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

        {/* Session Status Filter */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
            Session Status
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'all', label: 'All Sessions' },
              { value: 'active', label: 'Active Only' },
              { value: 'ended', label: 'Ended Only' }
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setSessionStatus(status.value)}
                style={{
                  padding: '6px 12px',
                  background: sessionStatus === status.value ? '#3b82f6' : '#f3f4f6',
                  color: sessionStatus === status.value ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {status.label}
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

          {/* IP Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'ip',
              label: 'IP Addresses',
              placeholder: 'Add IP filters...',
              selectedValues: ipFilters,
              searchInput: searchInputs.ip || '',
              showDropdown: showDropdowns.ip || false,
              maxSelections: 8,
              allowTextInput: true
            }}
            onSearchChange={(value) => handleSearchInputChange('ip', value)}
            onToggleDropdown={(show) => handleToggleDropdown('ip', show)}
            onSelectValue={(value) => handleSelectValue('ip', value)}
            onRemoveValue={(value) => handleRemoveValue('ip', value)}
          />

          {/* Protocol Filter */}
          <MultiSelectDropdown
            filter={{
              key: 'protocol',
              label: 'Protocol Versions',
              placeholder: 'Add protocol filters...',
              selectedValues: protocolFilters,
              searchInput: searchInputs.protocol || '',
              showDropdown: showDropdowns.protocol || false,
              maxSelections: 5,
              allowTextInput: true
            }}
            onSearchChange={(value) => handleSearchInputChange('protocol', value)}
            onToggleDropdown={(show) => handleToggleDropdown('protocol', show)}
            onSelectValue={(value) => handleSelectValue('protocol', value)}
            onRemoveValue={(value) => handleRemoveValue('protocol', value)}
          />
        </div>

        {/* Exclude Filters Section */}
        <div style={{ marginTop: '24px' }}>
          <h4 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '8px'
          }}>
            🚫 Exclude Filters (Remove from results)
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {/* Exclude Client Filter */}
            <MultiSelectDropdown
              filter={{
                key: 'exclude-client',
                label: 'Exclude Clients',
                placeholder: 'Add clients to exclude...',
                selectedValues: clientExcludeFilters,
                searchInput: searchInputs['exclude-client'] || '',
                showDropdown: showDropdowns['exclude-client'] || false,
                maxSelections: 8,
                allowTextInput: true
              }}
              onSearchChange={(value) => handleSearchInputChange('exclude-client', value)}
              onToggleDropdown={(show) => handleToggleDropdown('exclude-client', show)}
              onSelectValue={(value) => handleSelectValue('exclude-client', value)}
              onRemoveValue={(value) => handleRemoveValue('exclude-client', value)}
            />

            {/* Exclude Username Filter */}
            <MultiSelectDropdown
              filter={{
                key: 'exclude-username',
                label: 'Exclude Usernames',
                placeholder: 'Add usernames to exclude...',
                selectedValues: usernameExcludeFilters,
                searchInput: searchInputs['exclude-username'] || '',
                showDropdown: showDropdowns['exclude-username'] || false,
                maxSelections: 8,
                allowTextInput: true
              }}
              onSearchChange={(value) => handleSearchInputChange('exclude-username', value)}
              onToggleDropdown={(show) => handleToggleDropdown('exclude-username', show)}
              onSelectValue={(value) => handleSelectValue('exclude-username', value)}
              onRemoveValue={(value) => handleRemoveValue('exclude-username', value)}
            />

            {/* Exclude IP Filter */}
            <MultiSelectDropdown
              filter={{
                key: 'exclude-ip',
                label: 'Exclude IP Addresses',
                placeholder: 'Add IPs to exclude...',
                selectedValues: ipExcludeFilters,
                searchInput: searchInputs['exclude-ip'] || '',
                showDropdown: showDropdowns['exclude-ip'] || false,
                maxSelections: 8,
                allowTextInput: true
              }}
              onSearchChange={(value) => handleSearchInputChange('exclude-ip', value)}
              onToggleDropdown={(show) => handleToggleDropdown('exclude-ip', show)}
              onSelectValue={(value) => handleSelectValue('exclude-ip', value)}
              onRemoveValue={(value) => handleRemoveValue('exclude-ip', value)}
            />

            {/* Exclude Protocol Filter */}
            <MultiSelectDropdown
              filter={{
                key: 'exclude-protocol',
                label: 'Exclude Protocol Versions',
                placeholder: 'Add protocols to exclude...',
                selectedValues: protocolExcludeFilters,
                searchInput: searchInputs['exclude-protocol'] || '',
                showDropdown: showDropdowns['exclude-protocol'] || false,
                maxSelections: 5,
                allowTextInput: true
              }}
              onSearchChange={(value) => handleSearchInputChange('exclude-protocol', value)}
              onToggleDropdown={(show) => handleToggleDropdown('exclude-protocol', show)}
              onSelectValue={(value) => handleSelectValue('exclude-protocol', value)}
              onRemoveValue={(value) => handleRemoveValue('exclude-protocol', value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{totalItems.toLocaleString()} sessions found | Page {currentPage} of {totalPages}</span>
        </div>
      </div>

      {/* Sessions Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Session Details ({totalItems.toLocaleString()})
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>IP:Port</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Protocol</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Start Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>End Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Duration</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    Loading sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No sessions found
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr
                    key={session.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {session.client}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {session.username || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontFamily: 'monospace', fontSize: '13px' }}>
                      {session.ip_port}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {session.protocol_version || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {formatTimestamp(session.start_ts)}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {session.end_ts ? formatTimestamp(session.end_ts) : '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {session.duration}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: session.end_ts ? '#fee2e2' : '#d1fae5',
                        color: session.end_ts ? '#991b1b' : '#065f46'
                      }}>
                        {session.end_ts ? 'Ended' : 'Active'}
                      </span>
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