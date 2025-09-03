import React, { useState } from 'react'

interface ApiTestResult {
  success: boolean
  data?: any
  error?: string
  endpoint: string
}

export function ApiTester() {
  const [results, setResults] = useState<ApiTestResult[]>([])
  const [testing, setTesting] = useState(false)

  const testEndpoint = async (endpoint: string, description: string) => {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        success: true,
        data: Array.isArray(data) ? `Array with ${data.length} items` : data,
        endpoint: `${description}: ${endpoint}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: `${description}: ${endpoint}`
      }
    }
  }

  const runTests = async () => {
    setTesting(true)
    setResults([])
    
  const baseUrl = 'REPLACE_WITH_NEW_URL'
    
    const tests = [
      { endpoint: `${baseUrl}/sessions?limit=1`, description: 'All Sessions (limited)' },
      { endpoint: `${baseUrl}/sessions?end_ts=is.null`, description: 'Connected Clients' },
      { endpoint: `${baseUrl}/sessions?start_ts=gte.2025-08-01T00:00:00`, description: 'Recent Sessions' }
    ]
    
    const testResults = []
    for (const test of tests) {
      const result = await testEndpoint(test.endpoint, test.description)
      testResults.push(result)
      setResults([...testResults])
    }
    
    setTesting(false)
  }

  return (
    <div style={{ 
      background: '#f9fafb', 
      border: '1px solid #e5e7eb', 
      borderRadius: '8px', 
      padding: '16px', 
      margin: '16px 0' 
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>GRE API Connectivity Test</h3>
      
      <button 
        onClick={runTests} 
        disabled={testing}
        style={{
          background: testing ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          cursor: testing ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {testing ? 'Testing...' : 'Test API Endpoints'}
      </button>

      {results.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Results:</h4>
          {results.map((result, index) => (
            <div 
              key={index}
              style={{
                background: result.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '8px'
              }}
            >
              <div style={{ 
                fontWeight: '600', 
                color: result.success ? '#15803d' : '#dc2626',
                marginBottom: '4px'
              }}>
                {result.success ? '✅' : '❌'} {result.endpoint}
              </div>
              {result.success ? (
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  Response: {typeof result.data === 'string' ? result.data : JSON.stringify(result.data)}
                </div>
              ) : (
                <div style={{ color: '#dc2626', fontSize: '14px' }}>
                  Error: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
