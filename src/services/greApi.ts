import axios from 'axios'
import { 
  GRE_API_CONFIG, 
  Session, 
  Event,
  SessionStats, 
  SessionDuration, 
  ConnectedClient,
  SessionTimelineEntry,
  SubscriptionEvent,
  ClientGanttEntry,
  CheckpointEvent,
  ConnectionInfoEvent,
  ActivityEvent,
  Subscription,
  TopicSubscription,
  ClientTopicFootprint
} from '../config/greApi'
import { 
  Session as ApiSession, 
  Event as ApiEvent, 
  Client as ApiClient, 
  Subscription as ApiSubscription,
  PaginationParams 
} from '../types/api'

const greApi = axios.create({
  baseURL: GRE_API_CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  }
})

export class GreApiService {
  // Get all sessions
  static async getAllSessions(): Promise<Session[]> {
    try {
      const response = await greApi.get<Session[]>(GRE_API_CONFIG.ENDPOINTS.SESSIONS)
      return response.data
    } catch (error) {
      console.error('Error fetching sessions:', error)
      throw new Error('Failed to fetch sessions data')
    }
  }

  // Get currently connected clients (sessions without end_ts)
  static async getConnectedClients(): Promise<ConnectedClient[]> {
    try {
      const response = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?end_ts=is.null`
      )
      return response.data.map(session => ({
        client: session.client || 'Unknown',
        username: session.username || 'Unknown',
        start_ts: session.start_ts || '',
        session_id: session.id
      }))
    } catch (error) {
      console.error('Error fetching connected clients:', error)
      throw new Error('Failed to fetch connected clients')
    }
  }

  // Get paginated connected clients with count
  static async getConnectedClientsPaginated(limit: number = 10, offset: number = 0): Promise<{
    clients: ConnectedClient[],
    total: number,
    hasMore: boolean
  }> {
    try {
      // First get the total count
      const countResponse = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?end_ts=is.null`,
        {
          headers: {
            'Prefer': 'count=exact'
          }
        }
      )
      
      // Then get the paginated data
      const dataResponse = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?end_ts=is.null&order=start_ts.desc&limit=${limit}&offset=${offset}`
      )
      
      const clients = dataResponse.data.map(session => ({
        client: session.client || 'Unknown',
        username: session.username || 'Unknown',
        start_ts: session.start_ts || '',
        session_id: session.id
      }))
      
      const total = countResponse.data.length // Since PostgREST returns the full dataset for count
      const hasMore = offset + limit < total
      
      return {
        clients,
        total,
        hasMore
      }
    } catch (error) {
      console.error('Error fetching paginated connected clients:', error)
      throw new Error('Failed to fetch paginated connected clients')
    }
  }

  // Get sessions from last 7 days with durations
  static async getSessionsLast7Days(): Promise<SessionDuration[]> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const isoDate = sevenDaysAgo.toISOString()

      const response = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${isoDate}&end_ts=not.is.null`
      )

      return response.data
        .filter(session => session.start_ts && session.end_ts)
        .map(session => {
          const start = new Date(session.start_ts!).getTime()
          const end = new Date(session.end_ts!).getTime()
          const durationMinutes = (end - start) / (1000 * 60)
          
          return {
            duration: Math.max(0, durationMinutes), // Ensure non-negative
            client: session.client || 'Unknown',
            username: session.username || 'Unknown'
          }
        })
        .filter(session => session.duration > 0) // Filter out invalid durations
    } catch (error) {
      console.error('Error fetching sessions from last 7 days:', error)
      throw new Error('Failed to fetch session duration data')
    }
  }

  // Get all events
  static async getAllEvents(limit?: number): Promise<Event[]> {
    try {
      const url = limit 
        ? `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?limit=${limit}&order=ts.desc`
        : `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?order=ts.desc`
      
      const response = await greApi.get<Event[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching events:', error)
      throw new Error('Failed to fetch events data')
    }
  }

  // Get connection/disconnection events for timeline
  static async getConnectionEvents(hoursBack: number = 24): Promise<Event[]> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoDate = fromDate.toISOString()

      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=in.(connected,disconnected)&ts=gte.${isoDate}&order=ts.asc`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching connection events:', error)
      throw new Error('Failed to fetch connection events')
    }
  }

  // Get subscription events for churn analysis
  static async getSubscriptionEvents(hoursBack: number = 24): Promise<Event[]> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoDate = fromDate.toISOString()

      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=in.(subscribe,unsubscribe)&ts=gte.${isoDate}&order=ts.asc`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching subscription events:', error)
      throw new Error('Failed to fetch subscription events')
    }
  }

  // Process session timeline data
  static async getSessionTimeline(hoursBack: number = 24): Promise<SessionTimelineEntry[]> {
    try {
      const [sessions, connectionEvents] = await Promise.all([
        this.getAllSessions(),
        this.getConnectionEvents(hoursBack)
      ])

      const timeline: SessionTimelineEntry[] = []
      
      // Process sessions that started within the time window
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      
      sessions.forEach(session => {
        if (!session.start_ts) return
        
        const startTime = new Date(session.start_ts)
        if (startTime >= fromDate) {
          const duration = session.end_ts 
            ? (new Date(session.end_ts).getTime() - startTime.getTime()) / (1000 * 60)
            : (Date.now() - startTime.getTime()) / (1000 * 60)
          
          timeline.push({
            client: session.client || 'Unknown',
            username: session.username || 'Unknown',
            start_ts: session.start_ts,
            end_ts: session.end_ts,
            duration,
            isActive: !session.end_ts
          })
        }
      })

      return timeline.sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime())
    } catch (error) {
      console.error('Error processing session timeline:', error)
      throw new Error('Failed to process session timeline')
    }
  }

  // Process subscription churn data aggregated by time buckets
  static async getSubscriptionChurn(hoursBack: number = 24, bucketSizeMinutes: number = 5): Promise<SubscriptionEvent[]> {
    try {
      const events = await this.getSubscriptionEvents(hoursBack)
      
      // Group events by time buckets
      const buckets = new Map<string, { subscribes: number, unsubscribes: number }>()
      
      events.forEach(event => {
        const eventTime = new Date(event.ts)
        // Round down to nearest bucket
        const bucketTime = new Date(
          eventTime.getFullYear(),
          eventTime.getMonth(),
          eventTime.getDate(),
          eventTime.getHours(),
          Math.floor(eventTime.getMinutes() / bucketSizeMinutes) * bucketSizeMinutes
        )
        
        const bucketKey = bucketTime.toISOString()
        
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, { subscribes: 0, unsubscribes: 0 })
        }
        
        const bucket = buckets.get(bucketKey)!
        if (event.action === 'subscribe') {
          bucket.subscribes++
        } else if (event.action === 'unsubscribe') {
          bucket.unsubscribes++
        }
      })

      // Convert to array and sort by time
      const result: SubscriptionEvent[] = []
      buckets.forEach((counts, timestamp) => {
        result.push({
          ts: timestamp,
          action: 'subscribe',
          client: '',
          topic: '',
          count: counts.subscribes
        })
        result.push({
          ts: timestamp,
          action: 'unsubscribe',
          client: '',
          topic: '',
          count: counts.unsubscribes
        })
      })

      return result.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    } catch (error) {
      console.error('Error processing subscription churn:', error)
      throw new Error('Failed to process subscription churn data')
    }
  }

  // Get comprehensive session statistics
  static async getSessionStats(): Promise<SessionStats> {
    try {
      const [connectedClients, sessionsLast7Days] = await Promise.all([
        this.getConnectedClients(),
        this.getSessionsLast7Days()
      ])

      // Calculate statistics
      const durations = sessionsLast7Days.map(s => s.duration).sort((a, b) => a - b)
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
      const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0
      const percentile95Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0

      // User breakdown for connected clients
      const userBreakdown = connectedClients.reduce((acc, client) => {
        acc[client.username] = (acc[client.username] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalSessions: sessionsLast7Days.length,
        activeSessions: connectedClients.length,
        avgDuration,
        medianDuration,
        percentile95Duration,
        sessionsLast7Days,
        connectedClients,
        userBreakdown
      }
    } catch (error) {
      console.error('Error computing session stats:', error)
      throw new Error('Failed to compute session statistics')
    }
  }

  // Get client gantt data for timeline visualization
  static async getClientGantt(hoursBack: number = 24): Promise<ClientGanttEntry[]> {
    try {
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      
      // Get all sessions that started or were active in the time range
      const [sessions, events] = await Promise.all([
        greApi.get<Session[]>(
          `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${fromTime}&order=start_ts.asc`
        ),
        greApi.get<Event[]>(
          `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=in.(connected,disconnected)&ts=gte.${fromTime}&order=ts.asc`
        )
      ])

      // Group sessions by client
      const clientMap = new Map<string, ClientGanttEntry>()
      
      sessions.data.forEach(session => {
        const client = session.client || 'Unknown'
        const username = session.username || 'Unknown'
        
        if (!clientMap.has(client)) {
          clientMap.set(client, {
            client,
            username,
            sessions: []
          })
        }
        
        const duration = session.end_ts 
          ? (new Date(session.end_ts).getTime() - new Date(session.start_ts || '').getTime()) / 1000 / 60
          : 0
        
        clientMap.get(client)!.sessions.push({
          start: session.start_ts || '',
          end: session.end_ts,
          duration,
          isActive: !session.end_ts
        })
      })

      return Array.from(clientMap.values())
    } catch (error) {
      console.error('Error fetching client gantt data:', error)
      throw new Error('Failed to fetch client gantt data')
    }
  }

  // Get checkpoint events
  static async getCheckpointEvents(hoursBack: number = 24): Promise<CheckpointEvent[]> {
    try {
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      
      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=eq.checkpoint&ts=gt.${fromTime}&order=ts.asc`
      )
      
      return response.data.map(event => ({
        id: event.id,
        ts: event.ts,
        action: 'checkpoint' as const,
        raw: event.raw || ''
      }))
    } catch (error) {
      console.error('Error fetching checkpoint events:', error)
      throw new Error('Failed to fetch checkpoint events')
    }
  }

  // Get connection info events for TCP connections
  static async getConnectionInfoEvents(hoursBack: number = 24): Promise<ConnectionInfoEvent[]> {
    try {
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      
      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=eq.conn_info&ts=gt.${fromTime}&order=ts.asc`
      )
      
      // Process into 5-minute buckets
      const buckets = new Map<string, number>()
      
      response.data.forEach(event => {
        const eventTime = new Date(event.ts)
        const bucketTime = new Date(
          eventTime.getFullYear(),
          eventTime.getMonth(),
          eventTime.getDate(),
          eventTime.getHours(),
          Math.floor(eventTime.getMinutes() / 5) * 5
        )
        
        const bucketKey = bucketTime.toISOString()
        buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1)
      })

      return Array.from(buckets.entries()).map(([timeWindow, count], index) => ({
        id: index + 1,
        ts: timeWindow,
        action: 'conn_info' as const,
        count,
        timeWindow: formatShortTime(timeWindow)
      }))
    } catch (error) {
      console.error('Error fetching connection info events:', error)
      throw new Error('Failed to fetch connection info events')
    }
  }

  // Get recent activity for audit feed
  static async getRecentActivity(limit: number = 50): Promise<ActivityEvent[]> {
    try {
      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=in.(connected,disconnected,subscribe,unsubscribe,checkpoint,conn_info)&order=ts.desc&limit=${limit}`
      )
      
      return response.data.map(event => ({
        ...event,
        action: event.action as ActivityEvent['action'],
        icon: this.getActionIcon(event.action),
        description: this.getActionDescription(event)
      }))
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      throw new Error('Failed to fetch recent activity')
    }
  }

  // Helper method to get icon for action
  private static getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      connected: '🟢',
      disconnected: '🔴',
      subscribe: '📝',
      unsubscribe: '❌',
      checkpoint: '💾',
      conn_info: '🔗',
      error: '⚠️',
      unknown: '❓'
    }
    return iconMap[action] || '❓'
  }

  // Helper method to get description for action
  private static getActionDescription(event: Event): string {
    switch (event.action) {
      case 'connected':
        return `${event.client} connected${event.username ? ` as ${event.username}` : ''}`
      case 'disconnected':
        return `${event.client} disconnected`
      case 'subscribe':
        return `${event.client} subscribed to ${event.topic}`
      case 'unsubscribe':
        return `${event.client} unsubscribed from ${event.topic}`
      case 'checkpoint':
        return 'Broker saved database checkpoint'
      case 'conn_info':
        return 'New TCP connection established'
      case 'error':
        return 'System error occurred'
      default:
        return event.raw || 'Unknown activity'
    }
  }

  // Get active subscriptions with topic aggregation
  static async getActiveSubscriptions(): Promise<{ subscriptions: Subscription[], topicBreakdown: TopicSubscription[] }> {
    try {
      const response = await greApi.get<Subscription[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SUBSCRIPTIONS}?active=is.true&order=updated_at.desc`
      )
      
      const subscriptions = response.data
      
      // Aggregate by topic
      const topicMap = new Map<string, TopicSubscription>()
      
      subscriptions.forEach(sub => {
        if (!topicMap.has(sub.topic)) {
          topicMap.set(sub.topic, {
            topic: sub.topic,
            count: 0,
            qos_breakdown: {},
            clients: []
          })
        }
        
        const topicData = topicMap.get(sub.topic)!
        topicData.count++
        topicData.qos_breakdown[sub.qos] = (topicData.qos_breakdown[sub.qos] || 0) + 1
        if (!topicData.clients.includes(sub.client)) {
          topicData.clients.push(sub.client)
        }
      })
      
      const topicBreakdown = Array.from(topicMap.values())
        .sort((a, b) => b.count - a.count)
      
      return { subscriptions, topicBreakdown }
    } catch (error) {
      console.error('Error fetching active subscriptions:', error)
      throw new Error('Failed to fetch active subscriptions')
    }
  }

  // Get subscription state (who's subscribed to what)
  static async getSubscriptionState(): Promise<{ activeSubscriptions: Subscription[], topicBreakdown: TopicSubscription[] }> {
    try {
      const result = await this.getActiveSubscriptions()
      return {
        activeSubscriptions: result.subscriptions,
        topicBreakdown: result.topicBreakdown
      }
    } catch (error) {
      console.error('Error fetching subscription state:', error)
      throw new Error('Failed to fetch subscription state')
    }
  }

  // Get per-client topic footprint
  static async getClientTopicFootprints(): Promise<ClientTopicFootprint[]> {
    try {
      const [activeSubscriptions, allSubscriptions] = await Promise.all([
        greApi.get<Subscription[]>(`${GRE_API_CONFIG.ENDPOINTS.SUBSCRIPTIONS}?active=is.true`),
        greApi.get<Subscription[]>(`${GRE_API_CONFIG.ENDPOINTS.SUBSCRIPTIONS}`)
      ])
      
      // Count total clients per topic from all subscriptions
      const topicClientCounts = new Map<string, number>()
      allSubscriptions.data.forEach(sub => {
        if (sub.active) {
          topicClientCounts.set(sub.topic, (topicClientCounts.get(sub.topic) || 0) + 1)
        }
      })
      
      // Group by client
      const clientMap = new Map<string, ClientTopicFootprint>()
      
      activeSubscriptions.data.forEach(sub => {
        if (!clientMap.has(sub.client)) {
          clientMap.set(sub.client, {
            client: sub.client,
            topics: []
          })
        }
        
        clientMap.get(sub.client)!.topics.push({
          topic: sub.topic,
          qos: sub.qos,
          total_clients_on_topic: topicClientCounts.get(sub.topic) || 1,
          created_at: sub.created_at
        })
      })
      
      return Array.from(clientMap.values())
        .map(client => ({
          ...client,
          topics: client.topics.sort((a, b) => b.total_clients_on_topic - a.total_clients_on_topic)
        }))
        .sort((a, b) => b.topics.length - a.topics.length)
    } catch (error) {
      console.error('Error fetching client topic footprints:', error)
      throw new Error('Failed to fetch client topic footprints')
    }
  }

  // Generic pagination methods for all APIs
  static async getSessionsPaginated(params: PaginationParams = {}): Promise<{ data: ApiSession[], totalCount: number }> {
    try {
      const { offset = 0, limit = 20, filters = {} } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      })
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value)
      })
      
      const response = await greApi.get<ApiSession[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?${queryParams.toString()}`,
        { headers: { 'Prefer': 'count=exact' } }
      )
      const totalCount = parseInt(response.headers['content-range']?.split('/')[1] || '0')
      return { data: response.data, totalCount }
    } catch (error) {
      console.error('Error fetching sessions with pagination:', error)
      throw new Error('Failed to fetch sessions data')
    }
  }

  static async getEventsPaginated(params: PaginationParams = {}): Promise<{ data: ApiEvent[], totalCount: number }> {
    try {
      const { offset = 0, limit = 20, filters = {} } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        order: 'ts.desc'
      })
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value)
      })
      
      const response = await greApi.get<ApiEvent[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?${queryParams.toString()}`,
        { headers: { 'Prefer': 'count=exact' } }
      )
      const totalCount = parseInt(response.headers['content-range']?.split('/')[1] || '0')
      return { data: response.data, totalCount }
    } catch (error) {
      console.error('Error fetching events with pagination:', error)
      throw new Error('Failed to fetch events data')
    }
  }

  static async getClientsPaginated(params: PaginationParams = {}): Promise<{ data: ApiClient[], totalCount: number }> {
    try {
      const { offset = 0, limit = 20, filters = {} } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        order: 'last_seen.desc'
      })
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value)
      })
      
      const response = await greApi.get<ApiClient[]>(
        `/clients?${queryParams.toString()}`,
        { headers: { 'Prefer': 'count=exact' } }
      )
      const totalCount = parseInt(response.headers['content-range']?.split('/')[1] || '0')
      return { data: response.data, totalCount }
    } catch (error) {
      console.error('Error fetching clients with pagination:', error)
      throw new Error('Failed to fetch clients data')
    }
  }

  static async getSubscriptionsPaginated(params: PaginationParams = {}): Promise<{ data: ApiSubscription[], totalCount: number }> {
    try {
      const { offset = 0, limit = 20, filters = {} } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        order: 'created_at.desc'
      })
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value)
      })
      
      const response = await greApi.get<ApiSubscription[]>(
        `/subscriptions?${queryParams.toString()}`,
        { headers: { 'Prefer': 'count=exact' } }
      )
      const totalCount = parseInt(response.headers['content-range']?.split('/')[1] || '0')
      return { data: response.data, totalCount }
    } catch (error) {
      console.error('Error fetching subscriptions with pagination:', error)
      throw new Error('Failed to fetch subscriptions data')
    }
  }
}

// Helper functions
export const formatDuration = (minutes: number): string => {
  if (minutes === 0) return '0m'
  
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  const secs = Math.floor((minutes % 1) * 60)
  
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (secs > 0 && hours === 0) parts.push(`${secs}s`)
  
  return parts.join(' ') || '0m'
}

export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString()
}

export const formatShortTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}
