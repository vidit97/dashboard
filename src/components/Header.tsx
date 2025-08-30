import React from 'react'

interface HeaderProps {
  selectedBroker: string
  onBrokerChange: (broker: string) => void
  refreshInterval: number
  onRefreshIntervalChange: (interval: number) => void
  loading: boolean
  onRefresh: () => void
  onTestAPI: () => void
}

export function Header({
  selectedBroker,
  onBrokerChange,
  refreshInterval,
  onRefreshIntervalChange,
  loading,
  onRefresh,
  onTestAPI
}: HeaderProps) {
  return (
    <div className="header">
      <h1>WatchMQTT Dashboard</h1>
      <div className="header-controls">
        <select 
          className="select" 
          value={selectedBroker} 
          onChange={(e) => onBrokerChange(e.target.value)}
        >
          <option value="local">Broker: local</option>
        </select>
        
        <select className="select" defaultValue="15m">
          <option value="5m">Last 5m</option>
          <option value="15m">Last 15m</option>
          <option value="1h">Last 1h</option>
          <option value="24h">Last 24h</option>
        </select>

        <label>
          Refresh:
          <input 
            type="number" 
            className="input" 
            style={{ width: '80px', marginLeft: '8px' }}
            value={refreshInterval} 
            onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
            min={5}
            max={300}
          />s
        </label>

        <button onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>

        <button onClick={onTestAPI}>
          Test API Direct
        </button>
      </div>
    </div>
  )
}
