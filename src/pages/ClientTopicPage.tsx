import React from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ClientTopicFootprintChart } from '../ui/ClientTopicFootprint'

export const ClientTopicPage = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <ErrorBoundary>
          <ClientTopicFootprintChart />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default ClientTopicPage
