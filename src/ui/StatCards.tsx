import React from 'react'

export interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  color?: string
  loading?: boolean
}

export function MetricCard({ label, value, unit, trend, color, loading }: MetricCardProps) {
  const displayValue = loading ? '...' : typeof value === 'number' ? value.toLocaleString() : value
  
  return (
    <div className="metric-card" style={{ borderLeft: color ? `4px solid ${color}` : undefined }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {displayValue}
        {unit && <span className="metric-unit"> {unit}</span>}
      </div>
      {trend && (
        <div className={`metric-trend trend-${trend}`}>
          {trend === 'up' && '↗'} {trend === 'down' && '↘'} {trend === 'stable' && '→'}
        </div>
      )}
    </div>
  )
}

// Legacy component for backward compatibility
export function SimpleStatCard({ label, value, status }: { label: string, value: string, status?: string }) {
  let color = '#e0e0e0'
  if (label === 'Broker Health') {
    if (status === 'Healthy') color = '#4caf50'
    else if (status === 'Stressed') color = '#ff9800'
    else if (status === 'Bad') color = '#f44336'
  }
  return <MetricCard label={label} value={value} color={color} />
}

// Placeholder for future visual charts
export function GaugeChart() {
  return null
}
