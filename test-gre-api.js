// Test script to verify GRE API connectivity
import { GreApiService } from './src/services/greApi.js'

async function testGreApi() {
  try {
    console.log('Testing GRE API connectivity...')
  console.log('Base URL:', 'https://gzip-lucia-stores-davidson.trycloudflare.com/')
    
    // Test basic sessions endpoint
  const response = await fetch('https://gzip-lucia-stores-davidson.trycloudflare.com/sessions')
    const data = await response.json()
    
    console.log('✅ API Response received')
    console.log('Total sessions:', data.length)
    console.log('Sample session:', data[0])
    
    // Test connected clients
  const connectedResponse = await fetch('https://gzip-lucia-stores-davidson.trycloudflare.com/sessions?end_ts=is.null')
    const connectedData = await connectedResponse.json()
    
    console.log('✅ Connected clients query successful')
    console.log('Connected clients:', connectedData.length)
    
  } catch (error) {
    console.error('❌ API Test failed:', error)
  }
}

testGreApi()
