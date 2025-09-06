import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService, formatShortTime, formatDuration } from '../services/greApi'
import { ClientGanttEntry } from '../config/greApi'
import SearchFilterTable from './SearchFilterTable'

interface ClientGanttProps {
  className?: string
  refreshInterval?: number
}

// Mock data for fallback
const MOCK_GANTT_DATA: ClientGanttEntry[] = [
  {
    client: 'auto-CA38A491-521C-B190-632A-60779B1E4E8F',
    username: 'greAgent',
    sessions: [
      {
        start: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        duration: 120,
        isActive: false
      },
      {
        start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        end: null,
        duration: 0,
        isActive: true
      }
    ]
  },
  {
    client: 'auto-02170251-989E-5A88-E25B-EE6556F570FD',
    username: 'mqttClient',
    sessions: [
      {
        start: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        duration: 180,
        isActive: false
      }
    ]
  }
]

export default function ClientGantt({ className, refreshInterval = 300 }: ClientGanttProps) {
  const [ganttData, setGanttData] = useState(MOCK_GANTT_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  // Smart filtering state - tracks which clients to show
  const [selectedClientIds, setSelectedClientIds] = useState([])
  const [selectedUsernames, setSelectedUsernames] = useState([])
  const [truncatedUsernames, setTruncatedUsernames] = useState([])
  const [initialLoad, setInitialLoad] = useState(true)

  // Filtering state
  const [filteredGanttData, setFilteredGanttData] = useState([])
  const [selectedFilters, setSelectedFilters] = useState({
    client: [],
    username: []
  })
  const [availableFilterData, setAvailableFilterData] = useState({
    client: [],
    username: []
  })
  const [searchInputs, setSearchInputs] = useState({
    client: '',
    username: ''
  })
  const [showDropdowns, setShowDropdowns] = useState({
    client: false,
    username: false
  })

  // Pagination for SearchFilterTable
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filteredTableEntries, setFilteredTableEntries] = useState([])
  const [totalClients, setTotalClients] = useState(0)
  const pageSize = 10

  const fetchGanttData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setGanttData(MOCK_GANTT_DATA)
        // Auto-select first 2 clients from mock data for initial state
        if (initialLoad) {
          const mockClientIds = MOCK_GANTT_DATA.map(entry => entry.client)
          setSelectedClientIds(mockClientIds)
          setSelectedFilters(prev => ({
            ...prev,
            client: mockClientIds
          }))
          setInitialLoad(false)
        }
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        
        if (initialLoad) {
          // First load: prefer username 'greAgent' if available, else pick one recent username
          try {
            const { usernames } = await GreApiService.searchClientsAndUsernames('', hoursBack, 200)
            const initialUsername = (usernames && usernames.includes('greAgent'))
              ? 'greAgent'
              : (usernames && usernames.length > 0 ? usernames[0] : null)

            if (initialUsername) {
              setSelectedUsernames([initialUsername])
              setSelectedFilters(prev => ({
                ...prev,
                username: [initialUsername]
              }))

              // Fetch gantt data for that username
              const { ganttData: usernameData, truncatedUsernames } = await GreApiService.getClientGanttForUsernames(
                [initialUsername],
                hoursBack,
                20
              )
              setGanttData(usernameData)
              setTruncatedUsernames(truncatedUsernames || [])
            } else {
              // Fallback: get 5 most recent clients and auto-select them
              const recentClients = await GreApiService.getRecentClients(hoursBack, 5)
              setSelectedClientIds(recentClients)
              setSelectedFilters(prev => ({
                ...prev,
                client: recentClients
              }))

              // Fetch gantt data for these recent clients
              const data = await GreApiService.getClientGanttForClients(recentClients, hoursBack)
              setGanttData(data)
            }

            setInitialLoad(false)
          } catch (err) {
            // If any error, fallback to recent clients like before
            const recentClients = await GreApiService.getRecentClients(hoursBack, 5)
            setSelectedClientIds(recentClients)
            setSelectedFilters(prev => ({
              ...prev,
              client: recentClients
            }))
            const data = await GreApiService.getClientGanttForClients(recentClients, hoursBack)
            setGanttData(data)
            setInitialLoad(false)
          }
        } else {
          // Subsequent loads: handle both selected clients and usernames
          let allGanttData: ClientGanttEntry[] = []
          let allTruncatedUsernames: string[] = []
          
          // Get data for selected clients
          if (selectedClientIds.length > 0) {
            const clientData = await GreApiService.getClientGanttForClients(selectedClientIds, hoursBack)
            allGanttData.push(...clientData)
          }
          
          // Get data for selected usernames (with limits)
          if (selectedUsernames.length > 0) {
            const { ganttData: usernameData, truncatedUsernames } = await GreApiService.getClientGanttForUsernames(
              selectedUsernames, 
              hoursBack, 
              20 // Max 20 clients per username
            )
            allGanttData.push(...usernameData)
            allTruncatedUsernames = truncatedUsernames
          }
          
          // Remove duplicates (in case a client is selected both directly and via username)
          const uniqueClients = new Map<string, ClientGanttEntry>()
          allGanttData.forEach(entry => {
            if (!uniqueClients.has(entry.client)) {
              uniqueClients.set(entry.client, entry)
            }
          })
          
          setGanttData(Array.from(uniqueClients.values()))
          setTruncatedUsernames(allTruncatedUsernames)
          
          // If no selections, fallback to recent clients
          if (selectedClientIds.length === 0 && selectedUsernames.length === 0) {
            const recentClients = await GreApiService.getRecentClients(hoursBack, 5)
            const data = await GreApiService.getClientGanttForClients(recentClients, hoursBack)
            setGanttData(data)
          }
        }
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch client gantt data'
      setError(errorMsg)
      console.error('Error fetching gantt data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setGanttData(MOCK_GANTT_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData, selectedClientIds, selectedUsernames, initialLoad])

  useEffect(() => {
    fetchGanttData()
    
    const interval = setInterval(fetchGanttData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchGanttData, refreshInterval])

  const getTimelineWidth = () => {
    const hours = timeRange === '24h' ? 24 : 168
    return hours * 60 // minutes
  }

  const getSessionPosition = (session: ClientGanttEntry['sessions'][0]) => {
    const now = Date.now()
    const timelineWidth = getTimelineWidth()
    const timelineStart = now - (timelineWidth * 60 * 1000)
    
    const sessionStart = new Date(session.start).getTime()
    const sessionEnd = session.end ? new Date(session.end).getTime() : now
    
    const leftPercent = Math.max(0, ((sessionStart - timelineStart) / (timelineWidth * 60 * 1000)) * 100)
    const widthPercent = Math.min(100 - leftPercent, ((sessionEnd - sessionStart) / (timelineWidth * 60 * 1000)) * 100)
    
    return { left: leftPercent, width: Math.max(0.5, widthPercent) }
  }

  // Filtering functions with smart search
  const fetchAvailableFilterData = useCallback(async (searchTerm: string = '') => {
    try {
      if (useMockData) {
        const clients = [...new Set(ganttData.map(entry => entry.client))].sort()
        const usernames = [...new Set(ganttData.map(entry => entry.username))].sort()
        
        setAvailableFilterData({
          client: clients,
          username: usernames
        })
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        const { clients, usernames } = await GreApiService.searchClientsAndUsernames(
          searchTerm, 
          hoursBack, 
          200 // Get more results for better search experience
        )
        
        setAvailableFilterData({
          client: clients,
          username: usernames
        })
      }
    } catch (err) {
      console.error('Error fetching filter data:', err)
      // Keep existing data on error
    }
  }, [ganttData, useMockData, timeRange])

  const applyFilters = useCallback((data: ClientGanttEntry[]) => {
    let filtered = data

    // Apply client filter
    if (selectedFilters.client && selectedFilters.client.length > 0) {
      filtered = filtered.filter(entry => 
        selectedFilters.client.includes(entry.client)
      )
    }

    // Apply username filter
    if (selectedFilters.username && selectedFilters.username.length > 0) {
      filtered = filtered.filter(entry => 
        selectedFilters.username.includes(entry.username)
      )
    }

    return filtered
  }, [selectedFilters])

  const updatePaginatedData = useCallback(() => {
    const filtered = applyFilters(ganttData)
    
    // Set filtered data for Gantt chart
    setFilteredGanttData(filtered)
    
    // Calculate pagination for table
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedEntries = filtered.slice(startIndex, endIndex)
    
    setFilteredTableEntries(paginatedEntries)
    setTotalClients(filtered.length)
    setTotalPages(Math.ceil(filtered.length / pageSize))
  }, [ganttData, applyFilters, currentPage, pageSize])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const clearAllFilters = async () => {
    setSelectedFilters({
      client: [],
      username: []
    })
    setCurrentPage(1)
    
    // Reset to initial 5 recent clients
    setSelectedClientIds([])
    setSelectedUsernames([])
    setTruncatedUsernames([])
    
    if (!useMockData) {
      try {
        setLoading(true)
        const hoursBack = timeRange === '24h' ? 24 : 168
        const recentClients = await GreApiService.getRecentClients(hoursBack, 5)
        setSelectedClientIds(recentClients)
        setSelectedFilters(prev => ({
          ...prev,
          client: recentClients
        }))
        
        const data = await GreApiService.getClientGanttForClients(recentClients, hoursBack)
        setGanttData(data)
      } catch (err) {
        console.error('Error resetting to recent clients:', err)
      } finally {
        setLoading(false)
      }
    } else {
      // For mock data, reset to all mock clients
      const mockClientIds = MOCK_GANTT_DATA.map(entry => entry.client)
      setSelectedClientIds(mockClientIds)
      setSelectedFilters(prev => ({
        ...prev,
        client: mockClientIds
      }))
    }
  }

  // Search functionality handlers
  const handleSearchChange = (filterKey: string, value: string) => {
    setSearchInputs(prev => ({ ...prev, [filterKey]: value }))
    
    // Debounced search for better performance
    setTimeout(() => {
      fetchAvailableFilterData(value)
    }, 300)
  }

  const handleToggleDropdown = (filterKey: string, show: boolean) => {
    setShowDropdowns(prev => ({ ...prev, [filterKey]: show }))
  }

  const handleSelectValue = async (filterKey: string, value: string) => {
    const currentValues = selectedFilters[filterKey] || []
    if (!currentValues.includes(value)) {
      const newValues = [...currentValues, value]
      setSelectedFilters(prev => ({
        ...prev,
        [filterKey]: newValues
      }))
      
      // If adding a client, update selectedClientIds and fetch new data
      if (filterKey === 'client') {
        const newClientIds = [...selectedClientIds, value]
        setSelectedClientIds(newClientIds)
        // Note: do not auto-fetch here. User will click "Apply Filters" to load data.
      }
      
      // If adding a username, update selectedUsernames and trigger data fetch
      if (filterKey === 'username') {
        const newUsernames = [...selectedUsernames, value]
        setSelectedUsernames(newUsernames)
        // Note: do not auto-fetch here. User will click "Apply Filters" to load data.
      }
    }
    // Clear search and close dropdown
    setSearchInputs(prev => ({ ...prev, [filterKey]: '' }))
    setShowDropdowns(prev => ({ ...prev, [filterKey]: false }))
  }

  const applySelectedFilters = async () => {
    // Reset initialLoad so fetchGanttData respects selected filters
    setInitialLoad(false)
    // Fetch data based on the currently selected client ids / usernames
    await fetchGanttData()
  }

  const handleRemoveValue = (filterKey: string, value: string) => {
    const currentValues = selectedFilters[filterKey] || []
    const newValues = currentValues.filter(v => v !== value)
    setSelectedFilters(prev => ({
      ...prev,
      [filterKey]: newValues
    }))
    
    // If removing a client, update selectedClientIds and remove from gantt data
    if (filterKey === 'client') {
      const newClientIds = selectedClientIds.filter(id => id !== value)
      setSelectedClientIds(newClientIds)
      
      // Remove client from gantt data
      setGanttData(prev => prev.filter(entry => entry.client !== value))
    }
    
    // If removing a username, update selectedUsernames and trigger data fetch
    if (filterKey === 'username') {
      const newUsernames = selectedUsernames.filter(id => id !== value)
      setSelectedUsernames(newUsernames)
      
      // Trigger fetchGanttData to reload without the removed username
      setTimeout(() => {
        fetchGanttData()
      }, 100)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('.filter-controls')) {
        setShowDropdowns({ client: false, username: false })
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    // Only fetch available filter data after initial gantt data is loaded
    if (!initialLoad) {
      fetchAvailableFilterData()
    }
  }, [fetchAvailableFilterData, initialLoad])

  useEffect(() => {
    updatePaginatedData()
  }, [updatePaginatedData])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when filters change
  }, [selectedFilters])

  // Reset initial load when time range changes
  useEffect(() => {
    setInitialLoad(true)
    setSelectedClientIds([])
    setSelectedUsernames([])
    setTruncatedUsernames([])
    setGanttData([])
  }, [timeRange])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Client Timeline</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchGanttData} disabled={loading} className="button-secondary">
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
      
      {truncatedUsernames.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <p className="text-yellow-800">
            <strong>Note:</strong> Some usernames have been limited to 20 clients each to improve performance: {truncatedUsernames.join(', ')}
          </p>
        </div>
      )}

      {/* Filter Controls */}
      <div className="filter-controls" style={{ 
        marginBottom: '20px', 
        padding: '16px', 
        backgroundColor: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px' 
      }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            Filter Client Sessions
          </h4>
          {(selectedFilters.client.length > 0 || selectedFilters.username.length > 0) && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {selectedFilters.client.length + selectedFilters.username.length} filter{(selectedFilters.client.length + selectedFilters.username.length) !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          {/* Client ID Filter */}
          <div className="filter-group" style={{ position: 'relative', minWidth: '250px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px', display: 'block' }}>
              Client IDs
            </label>
            
            <div style={{ position: 'relative', marginBottom: selectedFilters.client.length > 0 ? '8px' : '0' }}>
              <input
                type="text"
                placeholder="Search and select client ids..."
                value={searchInputs.client}
                onChange={(e) => handleSearchChange('client', e.target.value)}
                onClick={() => handleToggleDropdown('client', true)}
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
              
              {/* Dropdown */}
              {showDropdowns.client && (() => {
                const filteredOptions = (availableFilterData.client || []).filter(value => 
                  value.toLowerCase().includes(searchInputs.client.toLowerCase()) &&
                  !selectedFilters.client.includes(value)
                ).slice(0, 10)
                
                return filteredOptions.length > 0 && (
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
                        onClick={() => handleSelectValue('client', value)}
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
                )
              })()}
            </div>

            {selectedFilters.client.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '6px',
                alignItems: 'flex-start'
              }}>
                {selectedFilters.client.map((value) => (
                  <div
                    key={value}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      gap: '4px',
                      maxWidth: '200px',
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
                      onClick={() => handleRemoveValue('client', value)}
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
          </div>

          {/* Username Filter */}
          <div className="filter-group" style={{ position: 'relative', minWidth: '250px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px', display: 'block' }}>
              Usernames
            </label>
            
            <div style={{ position: 'relative', marginBottom: selectedFilters.username.length > 0 ? '8px' : '0' }}>
              <input
                type="text"
                placeholder="Search and select usernames..."
                value={searchInputs.username}
                onChange={(e) => handleSearchChange('username', e.target.value)}
                onClick={() => handleToggleDropdown('username', true)}
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
              
              {/* Dropdown */}
              {showDropdowns.username && (() => {
                const filteredOptions = (availableFilterData.username || []).filter(value => 
                  value.toLowerCase().includes(searchInputs.username.toLowerCase()) &&
                  !selectedFilters.username.includes(value)
                ).slice(0, 10)
                
                return filteredOptions.length > 0 && (
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
                        onClick={() => handleSelectValue('username', value)}
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
                )
              })()}
            </div>

            {selectedFilters.username.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '6px',
                alignItems: 'flex-start'
              }}>
                {selectedFilters.username.map((value) => (
                  <div
                    key={value}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      gap: '4px',
                      maxWidth: '200px',
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
                      onClick={() => handleRemoveValue('username', value)}
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
          </div>
        </div>
        
        {/* Apply Filters button placed next to filter groups */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={applySelectedFilters}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={clearAllFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            disabled={selectedFilters.client.length === 0 && selectedFilters.username.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      {!loading && filteredGanttData.length > 0 && (
        <div className="gantt-container">
          <div className="gantt-header">
            <div className="gantt-time-axis">
              {timeRange === '24h' ? (
                Array.from({ length: 25 }, (_, i) => (
                  <div key={i} className="time-tick">
                    {String(i).padStart(2, '0')}:00
                  </div>
                ))
              ) : (
                Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="time-tick">
                    Day {i + 1}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="gantt-body">
            {filteredGanttData.map((client, index) => (
              <div key={client.client} className="gantt-row">
                <div className="gantt-row-label">
                  <div className="client-name">{client.client.substring(0, 20)}...</div>
                  <div className="client-username">{client.username}</div>
                </div>
                <div className="gantt-timeline">
                  {client.sessions.map((session, sessionIndex) => {
                    const position = getSessionPosition(session)
                    return (
                      <div
                        key={sessionIndex}
                        className={`gantt-bar ${session.isActive ? 'active' : 'inactive'}`}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`
                        }}
                        title={`${formatShortTime(session.start)} - ${
                          session.end ? formatShortTime(session.end) : 'Active'
                        } (${session.isActive ? 'Active' : formatDuration(session.duration)})`}
                      >
                        <span className="gantt-bar-content">
                          {session.isActive ? '●' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && filteredGanttData.length === 0 && (
        <div className="no-data">
          {ganttData.length === 0 
            ? "No session data available for the selected time range"
            : "No clients match the selected filters"
          }
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}

      {/* SearchFilterTable Component for Client Sessions - Table Only */}
      <SearchFilterTable
        title="Client Sessions"
        data={filteredTableEntries}
        totalCount={totalClients}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        columns={[
          { key: 'client', label: 'Client ID' },
          { key: 'username', label: 'Username' },
          { 
            key: 'sessions_count', 
            label: 'Sessions',
            render: (value, row) => `${row.sessions.length} session${row.sessions.length !== 1 ? 's' : ''}`
          },
          { 
            key: 'sessions_active', 
            label: 'Active Sessions',
            render: (value, row) => {
              const activeSessions = row.sessions.filter(s => s.isActive)
              return `${activeSessions.length} active`
            }
          },
          { 
            key: 'sessions_duration', 
            label: 'Total Duration',
            render: (value, row) => {
              const totalDuration = row.sessions.reduce((sum, session) => sum + (session.duration || 0), 0)
              return formatDuration(totalDuration)
            }
          }
        ]}
        filterConfigs={[]}
        availableFilterData={{}}
        selectedFilters={{}}
        onFilterChange={() => {}}
        onPageChange={handlePageChange}
        onRefresh={fetchGanttData}
  onClearFilters={() => {}}
  showApplyButton={false}
        className=""
      />
    </div>
  )
}
