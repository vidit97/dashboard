import axios from 'axios'

// Health API configuration - read from environment variable
const HEALTH_API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001'

const healthApi = axios.create({
  baseURL: HEALTH_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  }
})

// Type definition for health response
export interface HealthData {
  datname: string
  pg_up: number
  pg_database_size_bytes: number
  pg_exporter_last_scrape_success: number
  pg_exporter_last_scrape_duration_seconds: number
  pg_locks_total: number
  prom_ready: number
  prom_targets_total: number
  prom_targets_up: number
  watchmqtt_up_targets: number
}

// Health API service
export const healthApiService = {
  /**
   * Fetch database health information
   * @param datname Database name (default: 'watchmqtt')
   * @returns Promise with health data
   */
  async getHealthData(datname: string = 'watchmqtt'): Promise<HealthData> {
    try {
      const response = await healthApi.get<HealthData>(`/api/v1/db/health?datname=${datname}`)
      return response.data
    } catch (error) {
      console.error('Error fetching health data:', error)
      throw error
    }
  }
}

// Helper function to determine status based on metric value
export const getMetricStatus = (value: number, metric: string): 'ok' | 'warning' | 'error' => {
  switch (metric) {
    case 'pg_up':
    case 'pg_exporter_last_scrape_success':
    case 'prom_ready':
      return value === 1 ? 'ok' : 'error'
    
    case 'prom_targets_up':
    case 'prom_targets_total':
      // All targets should be up
      return value > 0 ? 'ok' : 'error'
    
    case 'watchmqtt_up_targets':
      return value > 0 ? 'ok' : 'warning'
    
    case 'pg_exporter_last_scrape_duration_seconds':
      // Consider anything under 1 second as good
      return value < 1 ? 'ok' : value < 5 ? 'warning' : 'error'
    
    case 'pg_locks_total':
      // Moderate number of locks is normal
      return value < 10 ? 'ok' : value < 50 ? 'warning' : 'error'
    
    default:
      return 'ok'
  }
}

// Helper function to format metric values for display
export const formatMetricValue = (value: number, metric: string): string => {
  switch (metric) {
    case 'pg_database_size_bytes':
      if (value === 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      const index = Math.floor(Math.log(value) / Math.log(1024))
      return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
    
    case 'pg_exporter_last_scrape_duration_seconds':
      return `${(value * 1000).toFixed(0)}ms`
    
    case 'pg_up':
    case 'pg_exporter_last_scrape_success':
    case 'prom_ready':
      return value === 1 ? 'Up' : 'Down'
    
    default:
      return value.toString()
  }
}

// Helper function to get metric description
export const getMetricDescription = (metric: string): string => {
  switch (metric) {
    case 'pg_up':
      return 'PostgreSQL database connectivity'
    case 'pg_database_size_bytes':
      return 'Database size on disk'
    case 'pg_exporter_last_scrape_success':
      return 'PostgreSQL exporter status'
    case 'pg_exporter_last_scrape_duration_seconds':
      return 'Last scrape duration'
    case 'pg_locks_total':
      return 'Active database locks'
    case 'prom_ready':
      return 'Prometheus readiness'
    case 'prom_targets_total':
      return 'Total Prometheus targets'
    case 'prom_targets_up':
      return 'Prometheus targets up'
    case 'watchmqtt_up_targets':
      return 'WatchMQTT monitoring targets'
    default:
      return metric
  }
}