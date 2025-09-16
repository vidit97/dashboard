// Utility functions for optimizing Prometheus API calls

/**
 * Calculate optimal step parameter for Prometheus API calls based on time range
 * Goal: Get around 50-100 data points for clean line graphs
 * 
 * @param minutes - Time range in minutes
 * @returns Optimal step in seconds
 */
export function calculateOptimalStep(minutes: number): number {
  const targetDataPoints = 80 // Sweet spot for line charts
  const timeRangeSeconds = minutes * 60
  
  // Calculate ideal step
  let step = Math.ceil(timeRangeSeconds / targetDataPoints)
  
  // Round to common Prometheus intervals for better caching
  if (step <= 15) return 15        // 15 seconds
  if (step <= 30) return 30        // 30 seconds  
  if (step <= 60) return 60        // 1 minute
  if (step <= 120) return 120      // 2 minutes
  if (step <= 300) return 300      // 5 minutes
  if (step <= 600) return 600      // 10 minutes
  if (step <= 900) return 900      // 15 minutes
  if (step <= 1800) return 1800    // 30 minutes
  if (step <= 3600) return 3600    // 1 hour
  if (step <= 7200) return 7200    // 2 hours
  if (step <= 14400) return 14400  // 4 hours
  
  // For very long ranges, use longer steps
  return 21600 // 6 hours
}

/**
 * Get optimal step for common time range labels
 */
export function getStepForTimeRange(timeRangeLabel: string): number {
  switch (timeRangeLabel) {
    case 'Last 5m':
    case '5m': 
      return calculateOptimalStep(5)    // 15s
    case 'Last 15m':
    case '15m':
      return calculateOptimalStep(15)   // 30s
    case 'Last 30m':
    case '30m':
      return calculateOptimalStep(30)   // 1m
    case 'Last 1h':
    case '1h':
      return calculateOptimalStep(60)   // 1m
    case 'Last 3h':
    case '3h':
      return calculateOptimalStep(180)  // 5m
    case 'Last 6h':
    case '6h':
      return calculateOptimalStep(360)  // 10m
    case 'Last 24h':
    case '24h':
      return calculateOptimalStep(1440) // 30m
    case 'Last 7d':
    case '7d':
      return calculateOptimalStep(10080) // 4h
    default:
      // Extract minutes from label if possible, otherwise default
      const minutesMatch = timeRangeLabel.match(/(\d+)m/)
      const hoursMatch = timeRangeLabel.match(/(\d+)h/)
      const daysMatch = timeRangeLabel.match(/(\d+)d/)
      
      if (minutesMatch) {
        return calculateOptimalStep(parseInt(minutesMatch[1]))
      } else if (hoursMatch) {
        return calculateOptimalStep(parseInt(hoursMatch[1]) * 60)
      } else if (daysMatch) {
        return calculateOptimalStep(parseInt(daysMatch[1]) * 24 * 60)
      }
      
      return 60 // Default 1 minute
  }
}

/**
 * Debug helper to show what step will be used
 */
export function debugStepCalculation(minutes: number): void {
  const step = calculateOptimalStep(minutes)
  const actualDataPoints = Math.ceil((minutes * 60) / step)
  console.log(`Time range: ${minutes}m, Step: ${step}s, Data points: ~${actualDataPoints}`)
}