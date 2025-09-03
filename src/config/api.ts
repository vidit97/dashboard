// API Configuration for WatchMQTT
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL,
  DEFAULT_BROKER: import.meta.env.VITE_DEFAULT_BROKER || 'local',
  REFRESH_INTERVALS: {
    OVERVIEW: Number(import.meta.env.VITE_REFRESH_INTERVAL_OVERVIEW) * 1000 || 300000, // 5 minutes
    TIMESERIES: Number(import.meta.env.VITE_REFRESH_INTERVAL_TIMESERIES) * 1000 || 30000, // 30 seconds
    ROLLUPS: Number(import.meta.env.VITE_REFRESH_INTERVAL_ROLLUPS) * 1000 || 300000, // 5 minutes
  },
  ENDPOINTS: {
    OVERVIEW: '/api/v1/overview',
    TRAFFIC: '/api/v1/timeseries/traffic',
    CONNECTIONS: '/api/v1/timeseries/connections',
    STORAGE: '/api/v1/timeseries/storage',
    ROLLUPS_24H: '/api/v1/rollups/24h',
  }
} as const

// Type definitions for API responses
export interface OverviewData {
  broker: string
  at: number
  connected: number
  disconnected: number
  active: number
  inactive: number
  subscriptions: number
  retained: number
  uptime_seconds: number
  messages_sent_per_sec_1m: number
  messages_received_per_sec_1m: number
  bytes_sent_per_sec_1m: number
  bytes_received_per_sec_1m: number
}

export interface TimeseriesPoint {
  timestamp: number
  value: number
}

export interface TimeseriesSeries {
  name: string
  points: [number, number][]
}

export interface TrafficData {
  broker: string
  from: number
  to: number
  step: string
  series: TimeseriesSeries[]
}

export interface ConnectionsData {
  broker: string
  from: number
  to: number
  step: string
  series: TimeseriesSeries[]
}

export interface StorageData {
  broker: string
  from: number
  to: number
  step: string
  series: TimeseriesSeries[]
}

export interface Rollups24hData {
  broker: string
  window: string
  msgs_sent_total_24h: number
  msgs_received_total_24h: number
  bytes_sent_total_24h: number
  bytes_received_total_24h: number
  avg_connections_24h: number
  peak_connections_24h: number
  at: number
}
