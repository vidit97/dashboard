// Test script to verify GRE API connectivity
import { GRE_API_CONFIG } from './src/config/greApi.js'

async function testGreApi() {
  try {
    console.log('Testing GRE API connectivity...')
    console.log('Base URL:', GRE_API_CONFIG.BASE_URL)
    
    // Test basic sessions endpoint
    const response = await fetch(`${GRE_API_CONFIG.BASE_URL}/sessions`)
    const data = await response.json()
    
    console.log('✅ API Response received')
    console.log('Total sessions:', data.length)
    console.log('Sample session:', data[0])
    
    // Test connected clients
    const connectedResponse = await fetch(`${GRE_API_CONFIG.BASE_URL}/sessions?end_ts=is.null`)
    const connectedData = await connectedResponse.json()
    
    console.log('✅ Connected clients query successful')
    console.log('Connected clients:', connectedData.length)
    
  } catch (error) {
    console.error('❌ API Test failed:', error)
  }
}

testGreApi()
