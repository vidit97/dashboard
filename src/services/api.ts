import axios from 'axios'
import { API_CONFIG, OverviewData, TrafficData, ConnectionsData, StorageData, Rollups24hData } from '../config/api'

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  }
})

// Helper to format uptime seconds to human readable
export const formatUptime = (seconds: number): string => {
  if (seconds === 0) return '0s'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 && parts.length < 2) parts.push(`${secs}s`)
  
  return parts.join(' ')
}

// Helper to format numbers with units
export const formatMetric = (value: number | undefined | null, unit?: string): string => {
  if (!value || value === 0) return '0'
  
  // For bytes
  if (unit === 'bytes') {
    if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`
    if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`
    return `${value}B`
  }
  
  // For rates (per second)
  if (unit === 'rate') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k/s`
    return `${value.toFixed(1)}/s`
  }
  
  // For large numbers
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  
  return Math.round(value).toString()
}

// API service functions
export const watchMQTTService = {
  // Get overview/KPI data
  async getOverview(broker: string = API_CONFIG.DEFAULT_BROKER): Promise<OverviewData> {
    try {
      console.log(`Making API call to: ${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OVERVIEW}?broker=${broker}`)
      const response = await api.get(API_CONFIG.ENDPOINTS.OVERVIEW, {
        params: { broker }
      })
      console.log('Raw API response:', response.data)
      return response.data
    } catch (error) {
      console.error('API call failed:', error)
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - API server may be slow')
        }
        if (error.response) {
          throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`)
        }
        if (error.request) {
          throw new Error('Network error - Check if API server is reachable')
        }
      }
      throw error
    }
  },

  // Get traffic timeseries data
  async getTraffic(
    broker: string = API_CONFIG.DEFAULT_BROKER,
    from?: number,
    to?: number,
    step?: number
  ): Promise<TrafficData> {
    try {
      const params: any = { broker }
      if (from) params.from = from
      if (to) params.to = to
      if (step) params.step = step
      
      console.log(`Making traffic API call to: ${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAFFIC}`, params)
      const response = await api.get(API_CONFIG.ENDPOINTS.TRAFFIC, { params })
      console.log('Traffic API response:', response.data)
      return response.data
    } catch (error) {
      console.error('Traffic API call failed:', error)
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - API server may be slow')
        }
        if (error.response) {
          throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`)
        }
        if (error.request) {
          throw new Error('Network error - Check if API server is reachable')
        }
      }
      throw error
    }
  },

  // Get connections timeseries data
  async getConnections(
    broker: string = API_CONFIG.DEFAULT_BROKER,
    from?: number,
    to?: number,
    step?: number
  ): Promise<ConnectionsData> {
    const response = await api.get(API_CONFIG.ENDPOINTS.CONNECTIONS, {
      params: { broker, from, to, step }
    })
    return response.data
  },

  // Get storage timeseries data
  async getStorage(
    broker: string = API_CONFIG.DEFAULT_BROKER,
    from?: number,
    to?: number,
    step?: number
  ): Promise<StorageData> {
    const response = await api.get(API_CONFIG.ENDPOINTS.STORAGE, {
      params: { broker, from, to, step }
    })
    return response.data
  },

  // Get 24h rollup data
  async getRollups24h(broker: string = API_CONFIG.DEFAULT_BROKER): Promise<Rollups24hData> {
    const response = await api.get(API_CONFIG.ENDPOINTS.ROLLUPS_24H, {
      params: { broker }
    })
    return response.data
  }
}
