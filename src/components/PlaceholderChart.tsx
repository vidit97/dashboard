import React from 'react'

interface PlaceholderChartProps {
  title: string
  description: string
}

export function PlaceholderChart({ title, description }: PlaceholderChartProps) {
  return (
    <div className="chart-section chart-half-width">
      <h2 className="chart-title">{title}</h2>
      <div className="chart-placeholder">
        {description}
      </div>
    </div>
  )
}
