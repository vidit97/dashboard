// Utility functions for handling time series data with complete time axis
import { calculateOptimalStep } from './prometheusStep'
import { formatTimestamp } from '../config/chartConfig'

export interface TimeSeriesPoint {
  timestamp: number
  time: string
  [key: string]: any // Allow dynamic properties for different metrics
}

/**
 * Generate complete time axis points for a given time range, regardless of data availability
 * This ensures the X-axis always shows the full requested time range
 */
export function generateCompleteTimeAxis(
  fromTimestamp: number,
  toTimestamp: number,
  stepSeconds: number
): Pick<TimeSeriesPoint, 'timestamp' | 'time'>[] {
  const timePoints: Pick<TimeSeriesPoint, 'timestamp' | 'time'>[] = []

  // Start from the first step boundary >= fromTimestamp
  const startTime = Math.ceil(fromTimestamp / stepSeconds) * stepSeconds

  // Generate time points up to toTimestamp
  for (let timestamp = startTime; timestamp <= toTimestamp; timestamp += stepSeconds) {
    timePoints.push({
      timestamp,
      time: formatTimestamp(timestamp)
    })
  }

  return timePoints
}

/**
 * Merge API data into a complete time axis, filling gaps with null values
 * This allows charts to show discontinuous lines when data is missing
 */
export function mergeDataIntoCompleteTimeAxis<T extends Record<string, any>>(
  timeAxis: Pick<TimeSeriesPoint, 'timestamp' | 'time'>[],
  apiData: Array<{ timestamp: number; [key: string]: any }>,
  defaultValues: Omit<T, 'timestamp' | 'time'>
): (Pick<TimeSeriesPoint, 'timestamp' | 'time'> & T)[] {
  return timeAxis.map(timePoint => {
    // Find matching data point from API
    const apiPoint = apiData.find(point => point.timestamp === timePoint.timestamp)

    if (apiPoint) {
      // Data exists for this timestamp
      return {
        ...timePoint,
        ...apiPoint
      } as Pick<TimeSeriesPoint, 'timestamp' | 'time'> & T
    } else {
      // No data for this timestamp, use default values (usually null for gaps)
      return {
        ...timePoint,
        ...defaultValues
      } as Pick<TimeSeriesPoint, 'timestamp' | 'time'> & T
    }
  })
}

/**
 * Transform API timeseries data with complete time axis
 * This is the main function to use in chart components
 */
export function transformTimeSeriesWithCompleteAxis<T extends Record<string, any>>(
  apiSeries: Array<{ name: string; points: [number, number][] }>,
  fromTimestamp: number,
  toTimestamp: number,
  stepSeconds: number,
  metricKeys: string[],
  defaultValue: number = 0 // Use 0 by default, null for gaps
): (Pick<TimeSeriesPoint, 'timestamp' | 'time'> & T)[] {
  console.log('transformTimeSeriesWithCompleteAxis called with:', {
    apiSeriesCount: apiSeries.length,
    fromTimestamp,
    toTimestamp,
    stepSeconds,
    metricKeys
  })

  // Generate complete time axis
  const completeTimeAxis = generateCompleteTimeAxis(fromTimestamp, toTimestamp, stepSeconds)
  console.log(`Generated ${completeTimeAxis.length} time axis points`)

  // Process API data into a map for easier lookup
  const dataMap = new Map<number, Record<string, number>>()

  apiSeries.forEach(series => {
    console.log(`Processing series: ${series.name} with ${series.points?.length || 0} points`)
    if (series.points && Array.isArray(series.points)) {
      series.points.forEach(([timestamp, value]) => {
        if (typeof timestamp === 'number' && typeof value === 'number') {
          if (!dataMap.has(timestamp)) {
            dataMap.set(timestamp, {})
          }
          dataMap.get(timestamp)![series.name] = value
        }
      })
    }
  })

  console.log(`Data map has ${dataMap.size} timestamps with data`)

  // Create default values object
  const defaultValues = metricKeys.reduce((acc, key) => {
    acc[key] = defaultValue
    return acc
  }, {} as Record<string, number>)

  // Convert dataMap entries to the format expected by mergeDataIntoCompleteTimeAxis
  const apiDataPoints = Array.from(dataMap.entries()).map(([timestamp, values]) => ({
    timestamp,
    ...defaultValues, // Start with defaults
    ...values // Override with actual values
  }))

  const result = mergeDataIntoCompleteTimeAxis(
    completeTimeAxis,
    apiDataPoints,
    defaultValues as Omit<T, 'timestamp' | 'time'>
  )

  console.log(`Final result: ${result.length} data points`)

  // Log a sample of the data for debugging
  if (result.length > 0) {
    console.log('Sample data points:', result.slice(0, 3))

    // Check for any non-zero values
    const hasData = result.some(point => {
      return metricKeys.some(key => point[key] > 0)
    })
    console.log(`Has non-zero data: ${hasData}`)

    // Show a data point that has values
    const pointWithData = result.find(point => {
      return metricKeys.some(key => point[key] > 0)
    })
    if (pointWithData) {
      console.log('Point with data:', pointWithData)
    }
  }

  return result
}

/**
 * Create a version of the data with gaps (null values) for missing data points
 * This allows recharts to show discontinuous lines
 */
export function createDataWithGaps<T extends Record<string, any>>(
  data: T[],
  metricKeys: string[]
): T[] {
  return data.map(point => {
    const newPoint = { ...point }

    // If all metric values are the default value (0), consider it a gap
    const hasActualData = metricKeys.some(key => point[key] !== 0)

    if (!hasActualData) {
      // Set all metric values to null to create gaps in the chart
      metricKeys.forEach(key => {
        newPoint[key] = null
      })
    }

    return newPoint
  })
}

/**
 * Get time range parameters for API calls
 */
export function getTimeRangeParams(minutes: number) {
  const now = Math.floor(Date.now() / 1000)
  const from = now - (minutes * 60)
  const to = now
  const step = calculateOptimalStep(minutes)

  return { from, to, step }
}