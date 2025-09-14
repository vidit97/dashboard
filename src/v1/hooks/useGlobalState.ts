import { useState, useEffect, createContext, useContext } from 'react'
import { GlobalState, StatusDot } from '../types/common'

const DEFAULT_STATE: GlobalState = {
  broker: 'local',
  autoRefresh: false,
  refreshInterval: 15, // seconds
  searchTerm: '',
  sidebarOpen: true,
  showOriginalNavbar: false // Hidden by default
}

interface GlobalStateContextType {
  state: GlobalState
  updateState: (updates: Partial<GlobalState>) => void
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
    brokerStatus,
    GlobalStateContext
  }
}

export { GlobalStateContext }