import { useState } from 'react'
import { ApiTable } from '../components/ApiTable'
import { API_CONFIGS } from '../types/api'

export const ApiTablesPage = () => {
  const [activeTab, setActiveTab] = useState('sessions')

  return (
    <div className="api-tables-page">
      <div className="page-header">
        <h1>API Data Tables</h1>
        <p>Browse and analyze all GRE MQTT broker data with pagination and column customization.</p>
      </div>

      <div className="api-tabs">
        {Object.entries(API_CONFIGS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
          >
            {config.displayName}
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
  margin: 0;
}

.api-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e1e5e9;
  padding-bottom: 0;
}

.tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
  position: relative;
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
  
  .api-tabs {
    flex-wrap: wrap;
  }
  
  .tab-button {
    padding: 10px 16px;
    font-size: 14px;
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
