interface ColumnSelectorProps {
  availableColumns: string[]
  selectedColumns: string[]
  onColumnToggle: (column: string) => void
  onSelectAll: () => void
  onSelectDefault: () => void
}

export const ColumnSelector = ({
  availableColumns,
  selectedColumns,
  onColumnToggle,
  onSelectAll,
  onSelectDefault
}) => {
  return (
    <div className="column-selector">
      <div className="column-selector-header">
        <h4>Select Columns</h4>
        <div className="column-selector-controls">
          <button 
            onClick={onSelectDefault}
            className="btn-secondary btn-sm"
          >
            Default
          </button>
          <button 
            onClick={onSelectAll}
            className="btn-secondary btn-sm"
          >
            Select All
          </button>
        </div>
      </div>
      
      <div className="column-list">
        {availableColumns.map(column => (
          <label key={column} className="column-checkbox">
            <input
              type="checkbox"
              checked={selectedColumns.includes(column)}
              onChange={() => onColumnToggle(column)}
            />
            <span className="column-name">
              {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

const columnSelectorStyles = `
.column-selector {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.column-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.column-selector-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.column-selector-controls {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm:hover {
  background: #e9ecef;
}

.column-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.column-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.column-checkbox:hover {
  background-color: #f8f9fa;
}

.column-checkbox input[type="checkbox"] {
  margin: 0;
}

.column-name {
  font-size: 13px;
  color: #495057;
  user-select: none;
}
`

// Add styles to document if not already added
if (typeof document !== 'undefined' && !document.getElementById('column-selector-styles')) {
  const style = document.createElement('style')
  style.id = 'column-selector-styles'
  style.textContent = columnSelectorStyles
  document.head.appendChild(style)
}
