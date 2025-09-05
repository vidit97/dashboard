import React from 'react'
import ConnectedClients from '../components/ConnectedClients'
import SessionReliability from '../components/SessionReliability'
import RecentSessions from '../components/RecentSessions'
import SubscriptionChurn from '../components/SubscriptionChurn'
import ClientGantt from '../components/ClientGantt'
import BrokerCheckpoints from '../components/BrokerCheckpoints'
import TcpConnections from '../components/TcpConnections'
import RecentActivity from '../components/RecentActivity'
import { ActiveSubscriptions } from '../ui/ActiveSubscriptions'
import { SubscriptionState } from '../ui/SubscriptionState'
import { ClientTopicFootprintChart } from '../ui/ClientTopicFootprint'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ApiTester } from '../components/ApiTester'

export default function GreDashboard() {
  return (
    <div className="container">
      <div className="header">
        <h1>GRE Session Analytics</h1>
        <div className="header-controls">
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            Real-time session monitoring and reliability metrics
          </span>
        </div>
      </div>

      {/* API Connectivity Test */}
      <ApiTester />

      {/* Connected Clients Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <ConnectedClients 
            className="chart-half-width"
            refreshInterval={30}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <SessionReliability 
            className="chart-half-width"
            refreshInterval={300}
          />
        </ErrorBoundary>
      </div>

      {/* Events Analysis Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <RecentSessions 
            className="chart-half-width"
            refreshInterval={60}
            limit={10}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <SubscriptionChurn 
            className="chart-half-width"
            refreshInterval={120}
          />
        </ErrorBoundary>
      </div>

      {/* Client Timeline Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <ClientGantt 
            className="chart-full-width"
            refreshInterval={300}
          />
        </ErrorBoundary>
      </div>

      {/* System Monitoring Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <BrokerCheckpoints 
            className="chart-half-width"
            refreshInterval={300}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <TcpConnections 
            className="chart-half-width"
            refreshInterval={180}
          />
        </ErrorBoundary>
      </div>

      {/* Activity Feed Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <RecentActivity 
            className="chart-full-width"
            refreshInterval={60}
            limit={50}
          />
        </ErrorBoundary>
      </div>

      {/* Subscription Management Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <ActiveSubscriptions 
            className="chart-half-width"
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <SubscriptionState 
            className="chart-half-width"
          />
        </ErrorBoundary>
      </div>

      {/* Client Topic Footprint Section */}
      <div className="charts-row">
        <ErrorBoundary>
          <ClientTopicFootprintChart 
            className="chart-full-width"
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
