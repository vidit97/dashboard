import { useState, useEffect } from 'react'
import { ApiTable } from '../components/ApiTable'
import { dynamicApiService } from '../services/dynamicApiService'

// Debug component to show validation status
const DebugInfo = () => {
  const [validationStatus, setValidationStatus] = useState<{validated: string[], invalid: string[]}>({
    validated: [],
    invalid: []
  })

  useEffect(() => {
    const status = dynamicApiService.getValidationStatus()
    setValidationStatus(status)
  }, [])

  return (
    <div className="debug-info">
      <div className="debug-section">
        <h4>✅ Accessible Tables ({validationStatus.validated.length})</h4>
        <div className="table-list">
          {validationStatus.validated.length > 0 ? (
            validationStatus.validated.map(table => (
              <span key={table} className="table-tag accessible">{table}</span>
            ))
          ) : (
            <p>No tables validated yet</p>
          )}
        </div>
      </div>
      
      <div className="debug-section">
        <h4>❌ Inaccessible Tables ({validationStatus.invalid.length})</h4>
        <div className="table-list">
          {validationStatus.invalid.length > 0 ? (
            validationStatus.invalid.map(table => (
              <span key={table} className="table-tag inaccessible">{table}</span>
            ))
          ) : (
            <p>No failed validations</p>
          )}
        </div>
      </div>
      
      <div className="debug-actions">
        <button 
          onClick={() => {
            dynamicApiService.clearValidationCache()
            window.location.reload()
          }}
          className="btn-clear-cache"
        >
          Clear Cache & Reload
        </button>
      </div>
    </div>
  )
}

export const ApiTablesPage = () => {
  const [activeCategory, setActiveCategory] = useState('')
  const [activeTab, setActiveTab] = useState('')
  const [tableCategories, setTableCategories] = useState<Record<string, string[]>>({})
  const [totalTableCount, setTotalTableCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // Load dynamic table categories
  const loadTableCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const categories = await dynamicApiService.getCategorizedTables()
      const allConfigs = await dynamicApiService.getAllTableConfigs()
      
      setTableCategories(categories)
      setTotalTableCount(Object.keys(allConfigs).length)
      
      // Set initial active category and tab
      const firstCategory = Object.keys(categories)[0]
      if (firstCategory && categories[firstCategory].length > 0) {
        setActiveCategory(firstCategory)
        setActiveTab(categories[firstCategory][0])
      }
    } catch (err) {
      console.error('Failed to load table categories:', err)
      setError('Failed to load table information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTableCategories()
  }, [])

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    const firstTableInCategory = tableCategories[category]?.[0]
    if (firstTableInCategory) {
      setActiveTab(firstTableInCategory)
    }
  }

  const currentCategoryTables = tableCategories[activeCategory] || []

  if (loading) {
    return (
      <div className="api-tables-page">
        <div className="page-header">
          <h1>API Data Tables</h1>
          <p>Loading table information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="api-tables-page">
        <div className="page-header">
          <h1>API Data Tables</h1>
          <div className="error-message">
            <h3>Error Loading Tables</h3>
            <p>{error}</p>
            <button onClick={loadTableCategories} className="btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="api-tables-page">
      <div className="page-header">
        <h1>API Data Tables</h1>
        <p>Browse and analyze all GRE MQTT broker data with pagination and column customization.</p>
        <p className="table-count">Total: {totalTableCount} tables available</p>
        <button 
          onClick={loadTableCategories} 
          className="btn-refresh"
          title="Refresh table list"
        >
          🔄 Refresh Tables
        </button>
        <button 
          onClick={() => setShowDebugInfo(!showDebugInfo)} 
          className="btn-debug"
          title="Show debug information"
        >
          🐛 Debug
        </button>
      </div>

      {/* Debug Information */}
      {showDebugInfo && (
        <div className="debug-panel">
          <h3>Debug Information</h3>
          <div className="debug-content">
            <DebugInfo />
          </div>
        </div>
      )}

      {/* Category Selector */}
      <div className="category-tabs">
        {Object.keys(tableCategories).map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`category-button ${activeCategory === category ? 'active' : ''}`}
          >
            {category}
            <span className="table-count-badge">
              {tableCategories[category].length}
            </span>
          </button>
        ))}
      </div>

      {/* Table Tabs within Category */}
      <div className="api-tabs">
        {currentCategoryTables.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
          >
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="api-table-content">
        <ApiTable apiType={activeTab} />
      </div>
    </div>
  )
}

const apiTablesPageStyles = `
.api-tables-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
  text-align: center;
  position: relative;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 16px;
  color: #6c757d;
  margin: 4px 0;
}

.table-count {
  font-size: 14px;
  color: #28a745;
  font-weight: 600;
}

.btn-refresh {
  position: absolute;
  top: 0;
  right: 60px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-refresh:hover {
  background: #0056b3;
}

.btn-debug {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8px 16px;
  background: #ffc107;
  color: #212529;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-debug:hover {
  background: #e0a800;
}

.debug-panel {
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.debug-panel h3 {
  margin-top: 0;
  color: #495057;
}

.debug-info {
  display: grid;
  gap: 16px;
}

.debug-section h4 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.table-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.table-tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.table-tag.accessible {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.table-tag.inaccessible {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.debug-actions {
  margin-top: 16px;
}

.btn-clear-cache {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-clear-cache:hover {
  background: #c82333;
}

.error-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  text-align: center;
}

.error-message h3 {
  color: #856404;
  margin-bottom: 10px;
}

.error-message p {
  color: #856404;
  margin-bottom: 15px;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #0056b3;
}

/* Category Navigation */
.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
  flex-wrap: wrap;
}

.category-button {
  padding: 10px 16px;
  background: white;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-button:hover {
  border-color: #007bff;
  background: #f0f8ff;
  color: #007bff;
}

.category-button.active {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.table-count-badge {
  background: rgba(0, 0, 0, 0.1);
  color: inherit;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.category-button.active .table-count-badge {
  background: rgba(255, 255, 255, 0.2);
}

/* Table Tabs */
.api-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e1e5e9;
  padding-bottom: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.api-tabs::-webkit-scrollbar {
  display: none;
}

.tab-button {
  padding: 12px 20px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;
}

.tab-button:hover {
  background: #f8f9fa;
  color: #495057;
}

.tab-button.active {
  background: #007bff;
  color: white;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #007bff;
}

.api-table-content {
  min-height: 400px;
}

@media (max-width: 768px) {
  .api-tables-page {
    padding: 16px;
  }
  
  .category-tabs {
    padding: 8px;
  }
  
  .category-button {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .tab-button {
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .page-header h1 {
    font-size: 24px;
  }
}
`

// Add styles to document if not already added
if (typeof document !== 'undefined' && !document.getElementById('api-tables-page-styles')) {
  const style = document.createElement('style')
  style.id = 'api-tables-page-styles'
  style.textContent = apiTablesPageStyles
  document.head.appendChild(style)
}
