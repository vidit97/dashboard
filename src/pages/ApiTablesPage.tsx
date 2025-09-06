import { useState } from 'react'
import { ApiTable } from '../components/ApiTable'
import { API_CONFIGS } from '../types/api'

// Group tables by category for better organization
const TABLE_CATEGORIES = {
  'Core Data': ['sessions', 'events', 'clients', 'subscriptions', 'wills', 'broker_metrics'],
  'Time Series': ['pub_minute', 'sub_minute', 'drop_minute']
}

export const ApiTablesPage = () => {
  const [activeCategory, setActiveCategory] = useState('Core Data')
  const [activeTab, setActiveTab] = useState('sessions')

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    const firstTableInCategory = TABLE_CATEGORIES[category as keyof typeof TABLE_CATEGORIES][0]
    setActiveTab(firstTableInCategory)
  }

  const currentCategoryTables = TABLE_CATEGORIES[activeCategory as keyof typeof TABLE_CATEGORIES]

  return (
    <div className="api-tables-page">
      <div className="page-header">
        <h1>API Data Tables</h1>
        <p>Browse and analyze all GRE MQTT broker data with pagination and column customization.</p>
        <p className="table-count">Total: {Object.keys(API_CONFIGS).length} tables available</p>
      </div>

      {/* Category Selector */}
      <div className="category-tabs">
        {Object.keys(TABLE_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`category-button ${activeCategory === category ? 'active' : ''}`}
          >
            {category}
            <span className="table-count-badge">
              {TABLE_CATEGORIES[category as keyof typeof TABLE_CATEGORIES].length}
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
            {API_CONFIGS[key].displayName}
          </button>
        ))}
      </div>

      <div className="api-table-content">
        <ApiTable apiType={activeTab as keyof typeof API_CONFIGS} />
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
