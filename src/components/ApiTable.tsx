import { useState, useEffect } from 'react'
import { GreApiService } from '../services/greApi'
import { ColumnSelector } from '../ui/ColumnSelector'
import { 
  ApiDataType, 
  API_CONFIGS, 
  Session as ApiSession,
  Event as ApiEvent,
  Client as ApiClient,
  Subscription as ApiSubscription 
} from '../types/api'

interface ApiTableProps {
  apiType: keyof typeof API_CONFIGS
}

export const ApiTable = ({ apiType }: ApiTableProps) => {
  const config = API_CONFIGS[apiType]
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedColumns, setSelectedColumns] = useState(config.defaultColumns)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  
  // Filter states
  const [searchClientId, setSearchClientId] = useState('')
  const [selectedUsername, setSelectedUsername] = useState('')
  const [availableUsernames, setAvailableUsernames] = useState([])
  const [filters, setFilters] = useState({})
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const loadData = async (offset = 0, limit = pageSize, applyFilters = true) => {
    setLoading(true)
    setError(null)
    try {
      let result: { data: ApiDataType[], totalCount: number }
      
      // Build filter parameters
      const filterParams = {}
      if (applyFilters) {
        if (searchClientId.trim()) {
          filterParams['client'] = `ilike.*${searchClientId.trim()}*`
        }
        if (selectedUsername) {
          filterParams['username'] = `eq.${selectedUsername}`
        }
      }
      
      // Build pagination params with sorting
      const paginationParams = {
        offset,
        limit,
        filters: filterParams,
        ...(sortColumn && { sortColumn, sortDirection })
      }
      
      switch (apiType) {
        case 'sessions':
          result = await GreApiService.getSessionsPaginated(paginationParams) as { data: ApiSession[], totalCount: number }
          break
        case 'events':
          result = await GreApiService.getEventsPaginated(paginationParams) as { data: ApiEvent[], totalCount: number }
          break
        case 'clients':
          result = await GreApiService.getClientsPaginated(paginationParams) as { data: ApiClient[], totalCount: number }
          break
        case 'subscriptions':
          result = await GreApiService.getSubscriptionsPaginated(paginationParams) as { data: ApiSubscription[], totalCount: number }
          break
        default:
          // Use generic method for all new tables
          result = await GreApiService.getTableDataPaginated(config.endpoint, paginationParams)
          break
      }
      
      setData(result.data)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Load available usernames for dropdown
  const loadAvailableUsernames = async () => {
    try {
      let result
      switch (apiType) {
        case 'sessions':
          result = await GreApiService.getSessionsPaginated({ offset: 0, limit: 1000 })
          break
        case 'events':
          result = await GreApiService.getEventsPaginated({ offset: 0, limit: 1000 })
          break
        case 'clients':
          result = await GreApiService.getClientsPaginated({ offset: 0, limit: 1000 })
          break
        case 'subscriptions':
          result = await GreApiService.getSubscriptionsPaginated({ offset: 0, limit: 1000 })
          break
        default:
          // Use generic method for all new tables
          result = await GreApiService.getTableDataPaginated(config.endpoint, { offset: 0, limit: 1000 })
          break
      }
      
      const usernames = [...new Set(
        result.data
          .map(item => item.username)
          .filter(username => username !== null && username !== undefined && username !== '')
      )].sort()
      
      setAvailableUsernames(usernames)
    } catch (err) {
      console.error('Failed to load usernames:', err)
    }
  }

  useEffect(() => {
    // Reset column selection when switching API types
    setSelectedColumns(config.defaultColumns)
    setSearchClientId('')
    setSelectedUsername('')
    setCurrentPage(0)
    
    // Reset sorting
    setSortColumn(null)
    setSortDirection('asc')
    
    loadData()
    loadAvailableUsernames()
  }, [apiType])

  useEffect(() => {
    loadData()
  }, [currentPage, pageSize, searchClientId, selectedUsername, sortColumn, sortDirection])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    loadData(newPage * pageSize, pageSize)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(0)
    loadData(0, newSize)
  }

  const handleSearchClientId = (value: string) => {
    setSearchClientId(value)
    setCurrentPage(0)
  }

  const handleUsernameFilter = (value: string) => {
    setSelectedUsername(value)
    setCurrentPage(0)
  }

  const handleClearFilters = () => {
    setSearchClientId('')
    setSelectedUsername('')
    setCurrentPage(0)
  }

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    )
  }

  const handleSelectAll = () => {
    setSelectedColumns(config.allColumns)
  }

  const handleSelectDefault = () => {
    setSelectedColumns(config.defaultColumns)
  }

  // Sorting functionality
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // If clicking a new column, set it as sort column with ascending direction
      setSortColumn(column)
      setSortDirection('asc')
    }
    // Reset to first page when sorting changes
    setCurrentPage(0)
  }

  const isTimestampColumn = (column: string): boolean => {
    return column.includes('_ts') || column.includes('_at') || column === 'ts' || 
           column.includes('_seen') || column === 'ts_bucket' || column === 'published_at'
  }

  const formatCellValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '-'
    
    // Format timestamps with consistent format
    if (isTimestampColumn(column)) {
      try {
        const date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
        
        // Use a consistent timestamp format
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      } catch (error) {
        return String(value)
      }
    }
    
    // Format boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    // Truncate long text
    const str = String(value)
    if (str.length > 50) {
      return str.substring(0, 47) + '...'
    }
    
    return str
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = currentPage * pageSize + 1
  const endIndex = Math.min((currentPage + 1) * pageSize, totalCount)

  if (error) {
    return (
      <div className="api-table-error">
        <h3>Error loading {config.displayName}</h3>
        <p>{error}</p>
        <button onClick={() => loadData()} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="api-table-container">
      <div className="api-table-header">
        <div className="api-table-title">
          <h2>{config.displayName}</h2>
          <div className="api-table-info">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>
                Showing {startIndex}-{endIndex} of {totalCount} records
                {sortColumn && (
                  <span className="sort-status">
                    {' • '}Sorted by {sortColumn.replace(/_/g, ' ')} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        
        <div className="api-table-controls">
          <button 
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="btn-secondary"
          >
            {showColumnSelector ? 'Hide' : 'Show'} Columns
          </button>
          {sortColumn && (
            <button 
              onClick={() => {
                setSortColumn(null)
                setSortDirection('asc')
              }}
              className="btn-clear-sort"
              title="Clear sorting"
            >
              Clear Sort
            </button>
          )}
          <button 
            onClick={() => loadData(currentPage * pageSize, pageSize)}
            className="btn-primary"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {showColumnSelector && (
        <ColumnSelector
          availableColumns={config.allColumns}
          selectedColumns={selectedColumns}
          onColumnToggle={handleColumnToggle}
          onSelectAll={handleSelectAll}
          onSelectDefault={handleSelectDefault}
        />
      )}

      {/* Filter Controls */}
      {(config.allColumns.includes('client') || config.allColumns.includes('username')) && (
        <div className="api-table-filters">
          <div className="filter-section">
            <h4>Filters</h4>
            <div className="filter-controls">
              {config.allColumns.includes('client') && (
                <div className="filter-group">
                  <label htmlFor="client-search">Search Client ID:</label>
                  <input
                    id="client-search"
                    type="text"
                    value={searchClientId}
                    onChange={(e) => handleSearchClientId(e.target.value)}
                    placeholder="Enter client ID..."
                    className="filter-input"
                  />
                </div>
              )}

              {config.allColumns.includes('username') && availableUsernames.length > 0 && (
                <div className="filter-group">
                  <label htmlFor="username-filter">Filter by Username:</label>
                  <select
                    id="username-filter"
                    value={selectedUsername}
                    onChange={(e) => handleUsernameFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Usernames</option>
                    {availableUsernames.map(username => (
                      <option key={username} value={username}>
                        {username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(searchClientId || selectedUsername) && (
                <div className="filter-group">
                  <button 
                    onClick={handleClearFilters}
                    className="btn-clear-filters"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="api-table-wrapper">
        <table className="api-table">
          <thead>
            <tr>
              {selectedColumns.map(column => (
                <th 
                  key={column} 
                  className={`sortable-header ${sortColumn === column ? 'sorted' : ''}`}
                  onClick={() => handleSort(column)}
                >
                  <div className="header-content">
                    <span className="header-text">
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="sort-indicator">
                      {sortColumn === column ? (
                        sortDirection === 'asc' ? '↑' : '↓'
                      ) : (
                        '↕'
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={selectedColumns.length} className="loading-cell">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length} className="empty-cell">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index}>
                  {selectedColumns.map(column => (
                    <td key={column} title={String(row[column as keyof typeof row] || '')}>
                      {formatCellValue(row[column as keyof typeof row], column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="api-table-pagination">
        <div className="pagination-info">
          <label>
            Page size:
            <select 
              value={pageSize} 
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
        
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0 || loading}
            className="btn-pagination"
          >
            First
          </button>
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0 || loading}
            className="btn-pagination"
          >
            Previous
          </button>
          
          <span className="pagination-current">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || loading}
            className="btn-pagination"
          >
            Next
          </button>
          <button 
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1 || loading}
            className="btn-pagination"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  )
}

const apiTableStyles = `
.api-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  margin-bottom: 24px;
}

.api-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.api-table-title h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.api-table-info {
  font-size: 13px;
  color: #6c757d;
}

.sort-status {
  color: #1976d2;
  font-weight: 500;
}

.api-table-controls {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-clear-sort {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #ffc107;
  color: #000;
}

.btn-clear-sort:hover {
  background: #e0a800;
}

.api-table-wrapper {
  overflow: auto;
  max-height: 600px;
}

.api-table {
  width: 100%;
  border-collapse: collapse;
}

.api-table th {
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #e1e5e9;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.sortable-header:hover {
  background: #e9ecef !important;
}

.sortable-header.sorted {
  background: #e3f2fd;
  color: #1976d2;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.header-text {
  flex: 1;
}

.sort-indicator {
  font-size: 12px;
  color: #6c757d;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.sortable-header:hover .sort-indicator {
  opacity: 1;
}

.sortable-header.sorted .sort-indicator {
  color: #1976d2;
  opacity: 1;
  font-weight: bold;
}

.api-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f4;
  vertical-align: top;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-table tbody tr:hover {
  background-color: #f8f9fa;
}

.loading-cell, .empty-cell {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 32px 16px;
}

.api-table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
}

.pagination-info label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #495057;
}

.pagination-info select {
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-pagination {
  padding: 6px 12px;
  border: 1px solid #ced4da;
  background: white;
  color: #495057;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
}

.btn-pagination:disabled {
  color: #6c757d;
  background: #f8f9fa;
  cursor: not-allowed;
}

.pagination-current {
  padding: 0 12px;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.api-table-error {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.api-table-error h3 {
  color: #dc3545;
  margin-bottom: 12px;
}

.api-table-error p {
  color: #6c757d;
  margin-bottom: 20px;
}

.api-table-filters {
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
  border-bottom: 1px solid #e1e5e9;
  padding: 16px 20px;
}

.filter-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.filter-controls {
  display: flex;
  gap: 20px;
  align-items: end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}

.filter-group label {
  font-size: 13px;
  color: #495057;
  font-weight: 500;
}

.filter-input, .filter-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.filter-input:focus, .filter-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.filter-input::placeholder {
  color: #6c757d;
}

.btn-clear-filters {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  height: fit-content;
}

.btn-clear-filters:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: unset;
  }
}
`

// Add styles to document if not already added
if (typeof document !== 'undefined' && !document.getElementById('api-table-styles')) {
  const style = document.createElement('style')
  style.id = 'api-table-styles'
  style.textContent = apiTableStyles
  document.head.appendChild(style)
}
