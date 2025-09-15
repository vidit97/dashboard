import { useState, useEffect, useCallback } from 'react'

export interface GlobalState {
  broker: string
  autoRefresh: boolean
  refreshInterval: number
  sidebarOpen: boolean
  lastUpdated: Date | null
}

const defaultState: GlobalState = {
  broker: 'local',
  autoRefresh: true,
  refreshInterval: 30,
  sidebarOpen: true,
  lastUpdated: null
}

export const useGlobalState = () => {
  const [state, setState] = useState<GlobalState>(() => {
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('watchmqtt-v2-state')
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState
    } catch {
      return defaultState
    }
  })

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem('watchmqtt-v2-state', JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error)
    }
  }, [state])

  const updateState = useCallback((updates: Partial<GlobalState>) => {
    setState(prev => ({ ...prev, ...updates, lastUpdated: new Date() }))
  }, [])

  const resetState = useCallback(() => {
    setState(defaultState)
  }, [])

  return {
    state,
    updateState,
    resetState
  }
}