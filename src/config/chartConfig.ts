// chartConfig.ts - Standardized chart configuration
// This ensures all charts have consistent spacing and alignment

export const CHART_MARGINS = {
  top: 10,
  right: 30,
  bottom: 50, // Reduced from 80 to eliminate excess space below X-axis
  left: 60    // Reduced from 70 for more compact layout
}

export const CHART_HEIGHTS = {
  container: '350px',  // Reduced from 400px to better match V2SessionsPage
  responsive: '100%'   // Height for ResponsiveContainer
}

export const AXIS_STYLES = {
  tick: { fontSize: 11 },
  axisLine: { stroke: '#d1d5db' },
  tickLine: { stroke: '#d1d5db' },
  label: { fontSize: 12, fill: '#6b7280' }
}

export const AXIS_DIMENSIONS = {
  xAxisHeight: 50, // Reduced from 70 to eliminate excess space below Time label
  yAxisWidth: 60   // Reduced from 65
}

export const AXIS_LABELS = {
  xAxis: {
    value: 'Time',
    position: 'insideBottom' as const,
    offset: 0, // Reduced from -5 to bring label closer to axis
    style: { fontSize: 12, fill: '#6b7280' }
  }
}

// Y-axis domain configuration for better visual spacing
export const AXIS_DOMAIN = ['dataMin - 10%', 'dataMax + 15%'] // More padding especially on top

// Time formatting function for consistent HH:MM format across all charts
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
    // Removed seconds to make labels cleaner
  })
}

// Common chart styling for consistent look
export const CHART_STYLES = {
  cartesianGrid: {
    strokeDasharray: "3 3",
    stroke: "#f0f0f0"
  },
  tooltip: {
    backgroundColor: 'white',
    padding: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tooltipLabel: {
    margin: '0 0 8px 0',
    fontWeight: '600'
  },
  tooltipValue: {
    margin: '4px 0'
  }
}