import { useState, useEffect, createContext, useContext } from 'react'
import { GlobalState, TimeRange, StatusDot } from '../types/common'

const DEFAULT_STATE: GlobalState = {
  broker: 'local',
  timeRange: '24h',
  autoRefresh: true,
  refreshInterval: 15, // seconds
  searchTerm: '',
  sidebarOpen: true,
  showOriginalNavbar: false // Hidden by default
}

interface GlobalStateContextType {
  state: GlobalState
  updateState: (updates: Partial<GlobalState>) => void
  getTimeRangeMs: () => { from: number; to: number }
  brokerStatus: StatusDot
}

const GlobalStateContext = createContext<GlobalStateContextType | null>(null)

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext)
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider')
  }
  return context
}

export const useGlobalStateProvider = () => {
  const [state, setState] = useState<GlobalState>(DEFAULT_STATE)
  const [brokerStatus, setBrokerStatus] = useState<StatusDot>({
    color: 'green',
    message: 'Broker connected'
  })

  const updateState = (updates: Partial<GlobalState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const getTimeRangeMs = (): { from: number; to: number } => {
    const now = Date.now()
    
    if (state.timeRange === 'custom' && state.customTimeRange) {
      return {
        from: state.customTimeRange.from.getTime(),
        to: state.customTimeRange.to.getTime()
      }
    }

    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'custom': 24 * 60 * 60 * 1000 // fallback
    }

    return {
      from: now - ranges[state.timeRange],
      to: now
    }
  }

  // Simulate broker status checks
  useEffect(() => {
    const checkBrokerStatus = () => {
      // In real implementation, this would check actual broker connectivity
      // For now, randomly simulate status changes for demo
      const statuses: StatusDot[] = [
        { color: 'green', message: 'Broker connected' },
        { color: 'green', message: 'All systems operational' },
        { color: 'amber', message: 'High load detected' },
        { color: 'red', message: 'Connection issues' }
      ]
      
      // Mostly green status for demo
      const randomStatus = Math.random() < 0.9 ? statuses[0] : statuses[Math.floor(Math.random() * statuses.length)]
      setBrokerStatus(randomStatus)
    }

    checkBrokerStatus()
    const interval = setInterval(checkBrokerStatus, 30000) // Check every 30s
    
    return () => clearInterval(interval)
  }, [])

  return {
    state,
    updateState,
    getTimeRangeMs,
    brokerStatus,
    GlobalStateContext
  }
}

export { GlobalStateContext }