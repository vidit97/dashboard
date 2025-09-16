import { useEffect } from 'react'

/**
 * Hook to listen for manual refresh events from the top bar
 * @param refreshFunction - Function to call when manual refresh is triggered
 * @param pageName - Name of the page for logging purposes
 */
export const useManualRefresh = (refreshFunction: () => void, pageName: string) => {
  useEffect(() => {
    const handleManualRefresh = (event: CustomEvent) => {
      console.log(`Manual refresh triggered for ${pageName} page`)
      refreshFunction()
    }

    window.addEventListener('manualRefresh', handleManualRefresh as EventListener)

    return () => {
      window.removeEventListener('manualRefresh', handleManualRefresh as EventListener)
    }
  }, [refreshFunction, pageName])
}