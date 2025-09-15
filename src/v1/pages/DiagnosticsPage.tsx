import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'

interface ConnectivityCheck {
  service: string
  status: 'ok' | 'error' | 'checking'
  lastChecked: string
  endpoint: string
  responseTime?: number
  error?: string
}

export const DiagnosticsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [connectivityChecks, setConnectivityChecks] = useState<ConnectivityCheck[]>([
    {
      service: 'Database',
      status: 'ok',
      lastChecked: '2024-01-15T10:30:00Z',
      endpoint: 'postgres://localhost:5432',
      responseTime: 15
    },
    {
      service: 'PostgREST',
      status: 'ok',
      lastChecked: '2024-01-15T10:30:00Z',
      endpoint: 'http://localhost:3001',
      responseTime: 25
    },
    {
      service: 'Prom Adapter',
      status: 'error',
      lastChecked: '2024-01-15T10:25:00Z',
      endpoint: 'http://localhost:8080',
      error: 'Connection refused'
    },
    {
      service: 'Broker Exporter',
      status: 'ok',
      lastChecked: '2024-01-15T10:30:00Z',
      endpoint: 'http://localhost:9234',
      responseTime: 8
    }
  ])

  const [sampleQueries, setSampleQueries] = useState([
    {
      name: 'Last 5 Events',
      query: 'SELECT * FROM events ORDER BY ts DESC LIMIT 5',
      status: 'idle' as 'idle' | 'running' | 'success' | 'error',
      result: null as any,
      error: null as string | null
    },
    {
      name: 'Pub Minute (1m)',
      query: 'SELECT * FROM pub_minute WHERE ts_bucket > NOW() - INTERVAL \'1 minute\' ORDER BY ts_bucket DESC',
      status: 'idle' as 'idle' | 'running' | 'success' | 'error',
      result: null as any,
      error: null as string | null
    }
  ])

  const [testToolsEnabled] = useState(true) // In real app, this would come from config

  const runConnectivityCheck = async (service: string) => {
    setConnectivityChecks(prev => prev.map(check => 
      check.service === service 
        ? { ...check, status: 'checking' }
        : check
    ))

    // Simulate API call
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3 // 70% success rate for demo
      
      setConnectivityChecks(prev => prev.map(check => 
        check.service === service 
          ? {
              ...check,
              status: isSuccess ? 'ok' : 'error',
              lastChecked: new Date().toISOString(),
              responseTime: isSuccess ? Math.floor(Math.random() * 50) + 10 : undefined,
              error: isSuccess ? undefined : 'Connection timeout'
            }
          : check
      ))
    }, 2000)
  }

  const runSampleQuery = async (index: number) => {
    setSampleQueries(prev => prev.map((query, i) => 
      i === index 
        ? { ...query, status: 'running', result: null, error: null }
        : query
    ))

    // Simulate query execution
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2 // 80% success rate
      
      setSampleQueries(prev => prev.map((query, i) => 
        i === index 
          ? {
              ...query,
              status: isSuccess ? 'success' : 'error',
              result: isSuccess ? [
                { id: 1, ts: '2024-01-15T10:30:15.123Z', action: 'connected', client: 'test_client' },
                { id: 2, ts: '2024-01-15T10:30:10.456Z', action: 'subscribe', client: 'test_client' }
              ] : null,
              error: isSuccess ? null : 'Query execution failed'
            }
          : query
      ))
    }, 1500)
  }

  const startSteadySubscriber = () => {
    alert('Started steady subscriber for testing (test_subscriber_001)')
  }

  const stopSteadySubscriber = () => {
    alert('Stopped steady subscriber')
  }

  const sendTestPublish = () => {
    const topic = prompt('Enter topic to publish to:', 'test/diagnostics')
    if (topic) {
      alert(`Test message published to ${topic}`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅'
      case 'error': return '❌'
      case 'checking': return '⏳'
      case 'running': return '⏳'
      case 'success': return '✅'
      default: return '❓'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'checking': case 'running': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{
      width: '100%',
      padding: '16px',
      minHeight: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Diagnostics
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          margin: 0 
        }}>
          Quick checks and tooling for {state.broker} broker system health
        </p>
      </div>

      {/* Connectivity Checks */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Connectivity Checks
            </h2>
          </div>
          
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {connectivityChecks.map((check, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getStatusIcon(check.status)}</span>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>{check.service}</span>
                    </div>
                    <button
                      onClick={() => runConnectivityCheck(check.service)}
                      disabled={check.status === 'checking'}
                      style={{
                        padding: '4px 8px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: check.status === 'checking' ? 'not-allowed' : 'pointer',
                        opacity: check.status === 'checking' ? 0.6 : 1
                      }}
                    >
                      {check.status === 'checking' ? 'Checking...' : 'Test'}
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', marginBottom: '8px' }}>
                    {check.endpoint}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Last checked: {new Date(check.lastChecked).toLocaleString()}
                  </div>
                  
                  {check.responseTime && (
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                      Response time: {check.responseTime}ms
                    </div>
                  )}
                  
                  {check.error && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      Error: {check.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sample Queries */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Sample Queries
            </h2>
          </div>
          
          <div style={{ padding: '20px' }}>
            {sampleQueries.map((query, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  background: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getStatusIcon(query.status)}</span>
                    <span style={{ fontWeight: '600', color: '#1f2937' }}>{query.name}</span>
                  </div>
                  <button
                    onClick={() => runSampleQuery(index)}
                    disabled={query.status === 'running'}
                    style={{
                      padding: '4px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: query.status === 'running' ? 'not-allowed' : 'pointer',
                      opacity: query.status === 'running' ? 0.6 : 1
                    }}
                  >
                    {query.status === 'running' ? 'Running...' : 'Run Query'}
                  </button>
                </div>
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  fontFamily: 'monospace', 
                  marginBottom: '12px',
                  padding: '8px',
                  background: '#f1f5f9',
                  borderRadius: '4px'
                }}>
                  {query.query}
                </div>
                
                {query.result && (
                  <div style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    background: '#f0fdf4',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #bbf7d0',
                    marginTop: '8px'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(query.result, null, 2)}
                    </pre>
                  </div>
                )}
                
                {query.error && (
                  <div style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    background: '#fef2f2',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #fecaca',
                    marginTop: '8px'
                  }}>
                    {query.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Tools */}
      {testToolsEnabled && (
        <div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Test Tools
              </h2>
              <div style={{ fontSize: '14px', color: '#ef4444', marginTop: '4px' }}>
                ⚠️ Development mode only - use with caution
              </div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f8fafc'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                    Steady Subscriber
                  </h3>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    Start/stop a test subscriber for load testing
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={startSteadySubscriber}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Start Subscriber
                    </button>
                    <button
                      onClick={stopSteadySubscriber}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Stop Subscriber
                    </button>
                  </div>
                </div>

                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f8fafc'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                    Test Publish
                  </h3>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    Send a test message to any topic
                  </div>
                  <button
                    onClick={sendTestPublish}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Send Test Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}