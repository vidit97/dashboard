// Simple test to verify API connectivity
import { watchMQTTService } from '../services/api'

export async function testAPIConnection() {
  try {
    console.log('Testing WatchMQTT API connection...')
    const overview = await watchMQTTService.getOverview()
    console.log('✅ API connection successful!')
    console.log('Overview data:', overview)
    return true
  } catch (error) {
    console.error('❌ API connection failed:', error)
    return false
  }
}

// Test on module load in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  testAPIConnection()
}
