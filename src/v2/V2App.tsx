import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { V2Layout } from './layouts/V2Layout'
import { V2OverviewPage } from './pages/V2OverviewPage'
import { V2ClientsPage } from './pages/V2ClientsPage'
import { V2SessionsPage } from './pages/V2SessionsPage'
import { V2TopicsPage } from './pages/V2TopicsPage'
import { V2SubscriptionsPage } from './pages/V2SubscriptionsPage'
import { V2EventsPage } from './pages/V2EventsPage'
import { V2ACLPage } from './pages/V2ACLPage'

// Import V1 pages temporarily for V2 (will be replaced with proper V2 versions)
import { AlertsPage } from '../v1/pages/AlertsPage'
import { SettingsPage } from '../v1/pages/SettingsPage'
import { DiagnosticsPage } from '../v1/pages/DiagnosticsPage'

export const V2App: React.FC = () => {
  return (
    <V2Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/v2/overview" replace />} />
        <Route path="/overview" element={<V2OverviewPage />} />
        <Route path="/topics" element={<V2TopicsPage />} />
        <Route path="/subscriptions" element={<V2SubscriptionsPage />} />
        <Route path="/events" element={<V2EventsPage />} />
        <Route path="/sessions" element={<V2SessionsPage />} />
        <Route path="/clients" element={<V2ClientsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/acl" element={<V2ACLPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="*" element={<Navigate to="/v2/overview" replace />} />
      </Routes>
    </V2Layout>
  )
}