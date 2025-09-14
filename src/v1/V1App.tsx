import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { V1Layout } from './layouts/V1Layout'
import { useGlobalStateProvider } from './hooks/useGlobalState'

// Import all pages
import { OverviewPage } from './pages/OverviewPage'
import { ClientsPage } from './pages/ClientsPage'
import { SessionsPage } from './pages/SessionsPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { TopicsPage } from './pages/TopicsPage'
import { ACLPage } from './pages/ACLPage'
import { EventsPage } from './pages/EventsPage'
import { AlertsPage } from './pages/AlertsPage'
import { SettingsPage } from './pages/SettingsPage'
import { DiagnosticsPage } from './pages/DiagnosticsPage'

export const V1App: React.FC = () => {
  const { 
    state, 
    updateState, 
    brokerStatus, 
    GlobalStateContext 
  } = useGlobalStateProvider()

  // Add responsive CSS styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* V1 Dashboard Responsive Styles */
      .v1-dashboard {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      
      /* Ensure no horizontal overflow */
      .v1-dashboard * {
        box-sizing: border-box;
      }
      
      /* Mobile breakpoint */
      @media (max-width: 768px) {
        .v1-dashboard .top-bar {
          padding: 8px 12px !important;
        }
        
        .v1-dashboard .top-bar > div {
          gap: 8px !important;
        }
        
        .v1-dashboard .top-bar select {
          font-size: 12px !important;
          padding: 2px 4px !important;
        }
        
        .v1-dashboard .top-bar input {
          font-size: 12px !important;
        }
        
        .v1-dashboard .top-bar label {
          font-size: 12px !important;
        }
        
        .v1-dashboard .page-content {
          padding: 12px !important;
        }
      }
      
      /* Tablet breakpoint */
      @media (min-width: 769px) and (max-width: 1024px) {
        .v1-dashboard .top-bar {
          padding: 10px 16px !important;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <GlobalStateContext.Provider value={{
      state,
      updateState,
      brokerStatus
    }}>
      <div className="v1-dashboard">
        <V1Layout>
          <Routes>
            <Route path="overview" element={<OverviewPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="topics" element={<TopicsPage />} />
            <Route path="acl" element={<ACLPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="diagnostics" element={<DiagnosticsPage />} />
            <Route path="" element={<Navigate to="overview" replace />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </V1Layout>
      </div>
    </GlobalStateContext.Provider>
  )
}