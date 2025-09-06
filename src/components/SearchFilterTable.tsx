import React, { useState, useEffect, useCallback } from 'react'

interface FilterConfig {
  key: string
  label: string
  searchable: boolean
  type: 'text' | 'select' | 'multiselect'
}

interface SearchFilterTableProps {
  title: string
  data: any[]
  totalCount: number
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  pageSize: number
  columns: Array<{
    key: string
    label: string
    render?: (value: any, row: any) => any
  }>
  filterConfigs: FilterConfig[]
  availableFilterData: Record<string, string[]> // key -> array of available values
  selectedFilters: Record<string, string[]>
  onFilterChange: (filters: Record<string, string[]>) => void
  onPageChange: (page: number) => void
  onRefresh: () => void
  onClearFilters: () => void
  className?: string
}

interface FilterDropdownProps {
  config: FilterConfig
  availableValues: string[]
  selectedValues: string[]
  searchInput: string
  showDropdown: boolean
  onSearchChange: (value: string) => void
  onToggleDropdown: (show: boolean) => void
  onSelectValue: (value: string) => void
  onRemoveValue: (value: string) => void
}

const FilterDropdown = ({
  config,
  availableValues,
  selectedValues,
  searchInput,
  showDropdown,
  onSearchChange,
  onToggleDropdown,
  onSelectValue,
  onRemoveValue
}) => {
  const filteredOptions = availableValues.filter(value => 
    value.toLowerCase().includes(searchInput.toLowerCase()) &&
    !selectedValues.includes(value)
  ).slice(0, 10)

  const handleInputClick = () => {
    onToggleDropdown(true)
  }

  const handleSelectValue = (value: string) => {
    onSelectValue(value)
    onSearchChange('')
    onToggleDropdown(false)
  }

  return (
    <div className="filter-group" style={{ position: 'relative', minWidth: '250px' }}>
      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px', display: 'block' }}>
        {config.label}
      </label>
      
      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: selectedValues.length > 0 ? '8px' : '0' }}>
        <input
          type="text"
          placeholder={`Search and select ${config.label.toLowerCase()}...`}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={handleInputClick}
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
        {showDropdown && filteredOptions.length > 0 && (
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

      {/* All Selected Values (below input) */}
      {selectedValues.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px',
          alignItems: 'flex-start'
        }}>
          {selectedValues.map((value) => (
            <div
              key={value}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: config.key.includes('client') ? '#dbeafe' : '#d1fae5',
                color: config.key.includes('client') ? '#1e40af' : '#065f46',
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
    </div>
  )
}

export const SearchFilterTable = ({
  title,
  data,
  totalCount,
  loading,
  error,
  currentPage,
  totalPages,
  pageSize,
  columns,
  filterConfigs,
  availableFilterData,
  selectedFilters,
  onFilterChange,
  onPageChange,
  onRefresh,
  onClearFilters,
  className
}) => {
  const [searchInputs, setSearchInputs] = useState({})
  const [showDropdowns, setShowDropdowns] = useState({})

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('.filter-controls')) {
        setShowDropdowns({})
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSearchChange = (filterKey: string, value: string) => {
    setSearchInputs(prev => ({ ...prev, [filterKey]: value }))
  }

  const handleToggleDropdown = (filterKey: string, show: boolean) => {
    setShowDropdowns(prev => ({ ...prev, [filterKey]: show }))
  }

  const handleSelectValue = (filterKey: string, value: string) => {
    const currentValues = selectedFilters[filterKey] || []
    if (!currentValues.includes(value)) {
      onFilterChange({
        ...selectedFilters,
        [filterKey]: [...currentValues, value]
      })
    }
  }

  const handleRemoveValue = (filterKey: string, value: string) => {
    const currentValues = selectedFilters[filterKey] || []
    onFilterChange({
      ...selectedFilters,
      [filterKey]: currentValues.filter(v => v !== value)
    })
  }

  const hasActiveFilters = Object.values(selectedFilters).some(values => Array.isArray(values) && values.length > 0)
  const totalSelectedCount = Object.values(selectedFilters).reduce((sum, values) => {
    return Number(sum) + (Array.isArray(values) ? values.length : 0)
  }, 0)

  return (
    <div className={`search-filter-table ${className || ''}`}>
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
            Filter {title}
          </h4>
          {hasActiveFilters && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {totalSelectedCount} filter{totalSelectedCount !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          {filterConfigs.map((config) => (
            <div key={config.key}>
              <FilterDropdown
                config={config}
                availableValues={availableFilterData[config.key] || []}
                selectedValues={selectedFilters[config.key] || []}
                searchInput={searchInputs[config.key] || ''}
                showDropdown={showDropdowns[config.key] || false}
                onSearchChange={(value) => handleSearchChange(config.key, value)}
                onToggleDropdown={(show) => handleToggleDropdown(config.key, show)}
                onSelectValue={(value) => handleSelectValue(config.key, value)}
                onRemoveValue={(value) => handleRemoveValue(config.key, value)}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '6px', 
          color: '#dc2626' 
        }}>
          Error: {error}
        </div>
      )}

      {/* Table */}
      {!loading && data.length > 0 && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              {title}
            </h3>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing page {currentPage} of {totalPages} ({totalCount} total)
            </div>
          </div>
          
          <div style={{ 
            overflowX: 'auto', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            background: '#ffffff'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate', 
              borderSpacing: 0,
              backgroundColor: '#ffffff' 
            }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  {columns.map((column, colIdx) => (
                    <th key={column.key} style={{ 
                      padding: '12px', 
                      textAlign: column.key === 'qos' ? 'center' : 'left', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: colIdx < columns.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} style={{ 
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fbfdfe',
                    borderBottom: index < data.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    {columns.map((column, colIdx) => (
                      <td key={column.key} style={{ 
                        padding: '12px', 
                        color: '#374151',
                        fontSize: '14px',
                        textAlign: column.key === 'qos' ? 'center' : 'left',
                        verticalAlign: 'middle',
                        borderRight: colIdx < columns.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}>
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              marginTop: '16px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage <= 1 ? '#f3f4f6' : '#6b7280',
                  color: currentPage <= 1 ? '#9ca3af' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Previous
              </button>
              
              <span style={{ fontSize: '14px', color: '#374151' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage >= totalPages ? '#f3f4f6' : '#6b7280',
                  color: currentPage >= totalPages ? '#9ca3af' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && data.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px', 
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          No data available
        </div>
      )}
    </div>
  )
}

export default SearchFilterTable
