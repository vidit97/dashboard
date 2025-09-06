import React, { useState, useEffect, useCallback, useRef } from 'react'
import { GreApiService, formatTimestamp } from '../services/greApi'
import { SessionTimelineEntry } from '../config/greApi'
import SearchFilterTable from './SearchFilterTable'

interface RecentSessionsProps {
  className?: string
  refreshInterval?: number
  limit?: number
}

// (No mock data in this component; rely on live API)

export default function RecentSessions({ className, refreshInterval = 60, limit = 20 }: RecentSessionsProps) {
  // keep initial state empty and populate from API
  const [sessionEntries, setSessionEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [totalCount, setTotalCount] = useState(null)
  const [hoursBack, setHoursBack] = useState(1) // default last 1 hour
  // RecentSessions uses client/username filters via SearchFilterTable; no free-text input here
  const [statusSort, setStatusSort] = useState('all')
  const abortRef = useRef(null)

  // Page-based pagination (SearchFilterTable style)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(limit)
  const [totalPages, setTotalPages] = useState(0)

  // Filters UI compatible with SearchFilterTable (client, username)
  const [selectedFilters, setSelectedFilters] = useState({ client: [], username: [] })
  const [availableFilterData, setAvailableFilterData] = useState({ client: [], username: [] })

  // Fetch first page (or refresh) — cancels previous request via AbortSignal
  // pageOffset is row offset. Accept optional overrides to avoid race when setting filters then immediately fetching.
  const fetchSessionData = useCallback(async (pageOffset = 0, overrides?: {
    selectedFilters?: any,
    statusSort?: string,
    hoursBack?: number
  }) => {
    try {
      setLoading(true)
      setError(null)
      // cancel previous request if any
      if (abortRef.current) {
        try { abortRef.current.abort() } catch (_) {}
      }
      abortRef.current = new AbortController()
      const sig = abortRef.current.signal
      // Build filters for API call using overrides or current state
      const useFilters = overrides && overrides.selectedFilters ? overrides.selectedFilters : selectedFilters
  const useStatus = overrides && typeof overrides.statusSort === 'string' ? overrides.statusSort : statusSort
      const useHours = overrides && typeof overrides.hoursBack === 'number' ? overrides.hoursBack : hoursBack
      
      const filters: Record<string,string> = {}
      if (useStatus === 'active') filters['end_ts'] = 'is.null'
      if (useStatus === 'ended') filters['end_ts'] = 'not.is.null'

      if (useFilters && useFilters.client && useFilters.client.length > 0) {
        const clientList = useFilters.client.map((c:any) => `"${c}"`).join(',')
        filters['client'] = `in.(${clientList})`
      }
      if (useFilters && useFilters.username && useFilters.username.length > 0) {
        const userList = useFilters.username.map((u:any) => `"${u}"`).join(',')
        filters['username'] = `in.(${userList})`
      }

  const res = await GreApiService.getSessionTimelinePaginated(useHours, pageSize, pageOffset, sig, undefined, filters)
      setSessionEntries(res.entries)
      setTotalCount(res.total)
      setTotalPages(res.total ? Math.ceil(res.total / pageSize) : 0)
    setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch session data'
      setError(errorMsg)
      console.error('Error fetching session data:', err)
    // Do not fallback to mock; surface the error so user can debug.
    } finally {
      setLoading(false)
    }
  }, [selectedFilters, statusSort, hoursBack, pageSize])

  useEffect(() => {
    // load initial page
    setCurrentPage(1)
    fetchSessionData(0)

    // regular refresh will reload first page
    const interval = setInterval(() => fetchSessionData(0), refreshInterval * 1000)
    return () => {
      clearInterval(interval)
      if (abortRef.current) try { abortRef.current.abort() } catch (_) {}
    }
  }, [fetchSessionData, refreshInterval])

  // fetch available filter values (sample) to populate dropdowns similar to ConnectedClients
  const fetchAvailableFilterData = useCallback(async () => {
    try {
      const res = await GreApiService.getSessionTimelinePaginated(hoursBack, 1000, 0)
      const clients = [...new Set(res.entries.map(e => e.client))].filter(Boolean).sort()
      const users = [...new Set(res.entries.map(e => e.username))].filter(Boolean).sort()
      setAvailableFilterData({ client: clients, username: users })
    } catch (err) {
      console.error('Error fetching available filter data:', err)
      setAvailableFilterData({ client: [], username: [] })
    }
  }, [hoursBack])

  useEffect(() => { fetchAvailableFilterData() }, [fetchAvailableFilterData])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Recent Sessions</h2>
        <div className="chart-controls">
          <select
            className="select"
            value={hoursBack}
            onChange={(e) => { const val = parseInt(e.target.value, 10); setHoursBack(val); setCurrentPage(1); }}
            style={{ marginRight: '8px' }}
          >
            <option value={1}>Last 1 hour</option>
            <option value={24}>Last 24 hours</option>
          </select>

          {/* Search handled by filter controls below (client / username multiselects) */}

          <select className="select" value={statusSort} onChange={(e) => { setStatusSort(e.target.value); setCurrentPage(1); }} style={{ marginRight: '8px' }}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>

          <button onClick={() => { setCurrentPage(1); fetchSessionData(0) }} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {/* Use SearchFilterTable to match ConnectedClients UI and behavior */}
      <SearchFilterTable
        title="Recent Sessions"
        data={sessionEntries}
        totalCount={totalCount || 0}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        columns={[
          { key: 'client', label: 'Client' },
          { key: 'username', label: 'Username' },
          { key: 'start_ts', label: 'Start Time', render: (value: any) => formatTimestamp(value) },
          { key: 'end_ts', label: 'End Time', render: (value: any) => value ? formatTimestamp(value) : 'Still connected' },
          { key: 'duration', label: 'Duration', render: (value: any) => `${Math.round(value)}m` },
          { key: 'isActive', label: 'Status', render: (value: any) => (
            <span className={`status-badge ${value ? 'status-active' : 'status-ended'}`}>{value ? 'Active' : 'Ended'}</span>
          ) }
        ]}
        filterConfigs={[
          { key: 'client', label: 'Client IDs', searchable: true, type: 'multiselect' },
          { key: 'username', label: 'Usernames', searchable: true, type: 'multiselect' }
        ]}
        availableFilterData={availableFilterData}
        selectedFilters={selectedFilters}
        onFilterChange={(f) => { setSelectedFilters(f) }}
        onPageChange={(page) => {
          if (page >= 1 && (!totalPages || page <= totalPages)) {
            setCurrentPage(page)
            const newOffset = (page - 1) * pageSize
            fetchSessionData(newOffset)
          }
        }}
        onRefresh={() => { 
          // Apply current selected filters
          setCurrentPage(1)
          fetchSessionData(0, { selectedFilters })
        }}
        onClearFilters={() => { 
          const cleared = { client: [], username: [] }
          setSelectedFilters(cleared)
          setCurrentPage(1)
          fetchSessionData(0, { selectedFilters: cleared })
        }}
        className="recent-sessions-section"
      />

      {/* Pagination summary */}
      {totalCount !== null && (
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          Showing {sessionEntries.length} of {totalCount} sessions
        </div>
      )}

      {!loading && sessionEntries.length === 0 && (
        <div className="no-data">
          No recent session data available
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {/* no mock data fallback */}
        </div>
      )}
    </div>
  )
}
