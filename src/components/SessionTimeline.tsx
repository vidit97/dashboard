import React, { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService, formatTimestamp, formatShortTime } from '../services/greApi'
import { SessionTimelineEntry } from '../config/greApi'
import SearchFilterTable from './SearchFilterTable'

// Type assertion for Recharts components to avoid TypeScript issues
const Chart = AreaChart as any
const AreaComponent = Area as any
const XAxisComponent = XAxis as any
const YAxisComponent = YAxis as any
const TooltipComponent = Tooltip as any

interface SessionTimelineProps {
  className?: string
  refreshInterval?: number
}

interface TimelineData {
  timestamp: string
  time: string
  activeConnections: number
  newConnections: number
  disconnections: number
}

// Mock data for fallback
const MOCK_TIMELINE_DATA: SessionTimelineEntry[] = [
  {
    client: 'auto-2FA7DDFC-CF8E-93A9-C123-F5F5BCD0277F',
    username: 'greAgent',
    start_ts: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    end_ts: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 120,
    isActive: false
  },
  {
    client: 'auto-65EED061-83DD-66CA-E7DD-85CFA285C1A1',
    username: 'testClient',
    start_ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    end_ts: null,
    duration: 180,
    isActive: true
  },
  {
    client: 'auto-EEEC9676-7E77-58B0-E53B-061F8DA9C6E6',
    username: 'testClient',
    start_ts: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    end_ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    duration: 30,
    isActive: false
  }
]

export default function SessionTimeline({ className, refreshInterval = 60 }: SessionTimelineProps) {
  const [timelineData, setTimelineData] = useState([])
  const [sessionEntries, setSessionEntries] = useState(MOCK_TIMELINE_DATA)
  const [filteredSessionEntries, setFilteredSessionEntries] = useState(MOCK_TIMELINE_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalSessions, setTotalSessions] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Search and filter state for SearchFilterTable
  const [selectedFilters, setSelectedFilters] = useState({
    client: [],
    username: []
  })
  const [availableFilterData, setAvailableFilterData] = useState({
    client: [],
    username: []
  })

  const processTimelineData = useCallback((entries: SessionTimelineEntry[]) => {
    // Create 5-minute buckets for the chart
    const bucketSizeMinutes = 5
    const hoursBack = timeRange === '24h' ? 24 : 168 // 7 days
    const bucketsCount = (hoursBack * 60) / bucketSizeMinutes
    
    const now = new Date()
    const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000)
    
    const buckets: TimelineData[] = []
    
    for (let i = 0; i < bucketsCount; i++) {
      const bucketStart = new Date(startTime.getTime() + i * bucketSizeMinutes * 60 * 1000)
      const bucketEnd = new Date(bucketStart.getTime() + bucketSizeMinutes * 60 * 1000)
      
      let activeConnections = 0
      let newConnections = 0
      let disconnections = 0
      
      entries.forEach(entry => {
        const sessionStart = new Date(entry.start_ts)
        const sessionEnd = entry.end_ts ? new Date(entry.end_ts) : new Date()
        
        // Check if session was active during this bucket
        if (sessionStart <= bucketEnd && sessionEnd >= bucketStart) {
          activeConnections++
        }
        
        // Check if session started in this bucket
        if (sessionStart >= bucketStart && sessionStart < bucketEnd) {
          newConnections++
        }
        
        // Check if session ended in this bucket
        if (entry.end_ts && sessionEnd >= bucketStart && sessionEnd < bucketEnd) {
          disconnections++
        }
      })
      
      buckets.push({
        timestamp: bucketStart.toISOString(),
        time: formatShortTime(bucketStart.toISOString()),
        activeConnections,
        newConnections,
        disconnections
      })
    }
    
    return buckets
  }, [timeRange])

  const fetchAvailableFilterData = useCallback(async () => {
    try {
      if (useMockData) {
        const usernames = [...new Set(MOCK_TIMELINE_DATA.map(s => s.username))]
        const clientIds = [...new Set(MOCK_TIMELINE_DATA.map(s => s.client))]
        setAvailableFilterData({
          client: clientIds.sort(),
          username: usernames.sort()
        })
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        const timeline = await GreApiService.getSessionTimeline(hoursBack)
        const usernames = [...new Set(timeline.map(s => s.username))]
        const clientIds = [...new Set(timeline.map(s => s.client))]
        setAvailableFilterData({
          client: clientIds.sort(),
          username: usernames.sort()
        })
      }
    } catch (err) {
      console.error('Error fetching filter data:', err)
      const usernames = [...new Set(MOCK_TIMELINE_DATA.map(s => s.username))]
      const clientIds = [...new Set(MOCK_TIMELINE_DATA.map(s => s.client))]
      setAvailableFilterData({
        client: clientIds.sort(),
        username: usernames.sort()
      })
    }
  }, [useMockData, timeRange])

  const applyFilters = useCallback((entries: SessionTimelineEntry[]) => {
    let filtered = entries
    
    // Apply client filter
    if (selectedFilters.client.length > 0) {
      filtered = filtered.filter(entry => selectedFilters.client.includes(entry.client))
    }
    
    // Apply username filter
    if (selectedFilters.username.length > 0) {
      filtered = filtered.filter(entry => selectedFilters.username.includes(entry.username))
    }
    
    return filtered
  }, [selectedFilters])

  const updatePaginatedData = useCallback(() => {
    const filtered = applyFilters(sessionEntries)
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedEntries = filtered.slice(startIndex, endIndex)
    
    setFilteredSessionEntries(paginatedEntries)
    setTotalSessions(filtered.length)
    setTotalPages(Math.ceil(filtered.length / pageSize))
  }, [sessionEntries, applyFilters, currentPage, pageSize])

  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const hoursBack = timeRange === '24h' ? 24 : 168
      
      if (useMockData) {
        setSessionEntries(MOCK_TIMELINE_DATA)
        const chartData = processTimelineData(MOCK_TIMELINE_DATA)
        setTimelineData(chartData)
      } else {
        const timeline = await GreApiService.getSessionTimeline(hoursBack)
        setSessionEntries(timeline)
        const chartData = processTimelineData(timeline)
        setTimelineData(chartData)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch timeline data'
      setError(errorMsg)
      console.error('Error fetching timeline data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setSessionEntries(MOCK_TIMELINE_DATA)
        const chartData = processTimelineData(MOCK_TIMELINE_DATA)
        setTimelineData(chartData)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData, processTimelineData])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const clearAllFilters = () => {
    setSelectedFilters({
      client: [],
      username: []
    })
    setCurrentPage(1)
  }

  useEffect(() => {
    fetchAvailableFilterData()
    fetchTimelineData()
    
    const interval = setInterval(fetchTimelineData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchTimelineData, fetchAvailableFilterData, refreshInterval])

  useEffect(() => {
    updatePaginatedData()
  }, [updatePaginatedData])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when filters change
  }, [selectedFilters])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Session Timeline</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchTimelineData} disabled={loading} className="button-secondary">
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

      {/* Connection Activity Chart */}
      {!loading && timelineData.length > 0 && (
        <div className="timeline-chart">
          <h3 className="breakdown-title">Connection Activity Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <Chart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxisComponent 
                  dataKey="time" 
                  stroke="#6b7280"
                  fontSize={12}
                  interval="preserveStartEnd"
                />
                <YAxisComponent stroke="#6b7280" fontSize={12} />
                <TooltipComponent 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <AreaComponent 
                  type="monotone" 
                  dataKey="activeConnections" 
                  stackId="1"
                  stroke="#3b82f6" 
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Active Connections"
                />
                <AreaComponent 
                  type="monotone" 
                  dataKey="newConnections" 
                  stackId="2"
                  stroke="#10b981" 
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="New Connections"
                />
                <AreaComponent 
                  type="monotone" 
                  dataKey="disconnections" 
                  stackId="3"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Disconnections"
                />
              </Chart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SearchFilterTable Component for Session Timeline */}
      <SearchFilterTable
        title="Session Timeline"
        data={filteredSessionEntries}
        totalCount={totalSessions}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        columns={[
          { key: 'client', label: 'Client ID' },
          { key: 'username', label: 'Username' },
          { 
            key: 'start_ts', 
            label: 'Start Time',
            render: (value) => formatTimestamp(value)
          },
          { 
            key: 'end_ts', 
            label: 'End Time',
            render: (value) => value ? formatTimestamp(value) : 'Still connected'
          },
          { 
            key: 'duration', 
            label: 'Duration',
            render: (value) => `${Math.round(value)}m`
          },
          { 
            key: 'isActive', 
            label: 'Status',
            render: (value) => (
              <span className={`status-badge ${value ? 'status-active' : 'status-ended'}`}>
                {value ? 'Active' : 'Ended'}
              </span>
            )
          }
        ]}
        filterConfigs={[
          { key: 'client', label: 'Client IDs', searchable: true, type: 'multiselect' },
          { key: 'username', label: 'Usernames', searchable: true, type: 'multiselect' }
        ]}
        availableFilterData={availableFilterData}
        selectedFilters={selectedFilters}
        onFilterChange={setSelectedFilters}
        onPageChange={handlePageChange}
        onRefresh={() => fetchTimelineData()}
        onClearFilters={clearAllFilters}
        className="session-timeline-section"
      />

      {!loading && sessionEntries.length === 0 && !useMockData && (
        <div className="no-data" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
          No session data available for the selected time range
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
