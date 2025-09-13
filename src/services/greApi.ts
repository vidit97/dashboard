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
  ClientTopicFootprint,
  TopicActivity,
  InactiveTopic,
  TopicAuditLog,
  TopicActionRun,
  TopicActionRequest,
  TopicActionResponse
} from '../config/greApi'
import { 
  Session as ApiSession, 
  Event as ApiEvent, 
  Client as ApiClient, 
  Subscription as ApiSubscription,
  PaginationParams,
  ApiDataType 
} from '../types/api'

const greApi = axios.create({
  baseURL: GRE_API_CONFIG.BASE_URL,
  timeout: 30000, // Increased to 30 seconds for large datasets
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

  // Get sessions from last 7 days with durations - optimized for performance
  static async getSessionsLast7Days(): Promise<SessionDuration[]> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const isoDate = sevenDaysAgo.toISOString()

      console.log(`Fetching sessions since: ${isoDate}`)

      // Limit to 5000 most recent sessions to prevent timeouts
      // This provides a good statistical sample for histogram analysis
      const response = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?select=start_ts,end_ts,client,username&start_ts=gte.${isoDate}&order=start_ts.desc`
      )

      console.log(`Fetched ${response.data.length} sessions for analysis`)

      return response.data
        .filter(session => session.start_ts) // Must have start time
        .map(session => {
          const start = new Date(session.start_ts!).getTime()
          const end = session.end_ts ? new Date(session.end_ts).getTime() : Date.now()
          const durationMinutes = (end - start) / (1000 * 60)
          
          return {
            duration: Math.max(0, durationMinutes), // Ensure non-negative
            client: session.client || 'Unknown',
            username: session.username || 'Unknown'
          }
        })
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

  // Get connect events only
  static async getConnectEvents(hoursBack: number = 24): Promise<Event[]> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoDate = fromDate.toISOString()

      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=in.(connected)&ts=gte.${isoDate}&order=ts.desc`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching connect events:', error)
      throw new Error('Failed to fetch connect events')
    }
  }

  // Get disconnect events only
  static async getDisconnectEvents(hoursBack: number = 24): Promise<Event[]> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoDate = fromDate.toISOString()

      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=in.(disconnected)&ts=gte.${isoDate}&order=ts.desc`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching disconnect events:', error)
      throw new Error('Failed to fetch disconnect events')
    }
  }

  // Robust count helpers that use PostgREST Prefer: count=exact and read Content-Range header
  // These avoid pulling large result sets when only counts are needed.
  static async getEventCountByAction(action: string, hoursBack: number = 24): Promise<number> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoDate = fromDate.toISOString()

      // Request a minimal page but ask server for exact count
      const url = `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?action=eq.${action}&ts=gte.${isoDate}&limit=1`
      const response = await greApi.get<Event[]>(url, {
        headers: {
          'Prefer': 'count=exact'
        }
      })

      // Try Content-Range header first (format 0-0/12345)
      const contentRange = (response.headers && (response.headers['content-range'] || response.headers['Content-Range'])) as string | undefined
      if (contentRange) {
        const parts = contentRange.split('/').map(p => p.trim())
        if (parts.length === 2) {
          const totalNum = parseInt(parts[1], 10)
          if (!isNaN(totalNum)) return totalNum
        }
      }

      // Fallback: some PostgREST setups return full array when count header isn't present
      return Array.isArray(response.data) ? response.data.length : 0
    } catch (error) {
      console.error('Error fetching event count for', action, error)
      throw new Error('Failed to fetch event count')
    }
  }

  // Convenience wrappers for connects/disconnects
  static async getConnectCount(hoursBack: number = 24): Promise<number> {
    return this.getEventCountByAction('connected', hoursBack)
  }

  static async getDisconnectCount(hoursBack: number = 24): Promise<number> {
    return this.getEventCountByAction('disconnected', hoursBack)
  }

  // Get subscription events for churn analysis - optimized for large datasets
  static async getSubscriptionEvents(hoursBack: number = 24): Promise<Event[]> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoDate = fromDate.toISOString()

      console.log(`Fetching subscription events since: ${isoDate}`)

      // Optimized query: only get fields we need, filter by action and time
      const response = await greApi.get<Event[]>(
        `${GRE_API_CONFIG.ENDPOINTS.EVENTS}?select=ts,action,client,topic&action=in.(subscribe,unsubscribe)&ts=gte.${isoDate}&order=ts.asc`
      )
      
      console.log(`Fetched ${response.data.length} subscription events`)
      
      return response.data
    } catch (error) {
      console.error('Error fetching subscription events:', error)
      throw new Error('Failed to fetch subscription events')
    }
  }

  // Process session timeline data
  // Fetch and process session timeline limited to the requested time window.
  // This avoids fetching ALL sessions which can be very large.
  static async getSessionTimeline(hoursBack: number = 24, limit: number = 1000): Promise<SessionTimelineEntry[]> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoFrom = fromDate.toISOString()

      // Ask the server for only sessions that started within the window.
      // Use a sensible default limit; callers can increase if needed.
      const url = `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${isoFrom}&order=start_ts.asc&limit=${limit}`
      const response = await greApi.get<Session[]>(url)
      const sessions = response.data

      const timeline: SessionTimelineEntry[] = []

      sessions.forEach(session => {
        if (!session.start_ts) return

        const startTime = new Date(session.start_ts)
        // skip entries that somehow are before the window
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
      // Preserve some context from axios errors when available
      if ((error as any).response) {
        const resp = (error as any).response
        throw new Error(`Failed to process session timeline: ${resp.status} ${JSON.stringify(resp.data).slice(0,200)}`)
      }
      throw new Error(`Failed to process session timeline: ${(error as Error).message}`)
    }
  }

  // Paginated session timeline: returns entries, total count (if available), and hasMore flag.
  // Accepts an optional AbortSignal to cancel requests.
  static async getSessionTimelinePaginated(
    hoursBack: number = 24,
    limit: number = 100,
    offset: number = 0,
    signal?: AbortSignal,
    searchTerm?: string,
    filters?: Record<string, string>,
    order?: string
  ): Promise<{ entries: SessionTimelineEntry[]; total: number | null; hasMore: boolean }> {
    try {
      const fromDate = new Date()
      fromDate.setHours(fromDate.getHours() - hoursBack)
      const isoFrom = fromDate.toISOString()

      // Build query string with filters, search and ordering
      const parts: string[] = []
      parts.push(`start_ts=gte.${isoFrom}`)
      parts.push(`limit=${limit}`)
      parts.push(`offset=${offset}`)
      // ordering: default to start_ts.desc if not provided
      parts.push(`order=${order || 'start_ts.desc'}`)

      // append simple filters (e.g., end_ts=is.null or client=in.(...))
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          parts.push(`${k}=${v}`)
        }
      }

      // add search OR across client and username when provided
      if (searchTerm && searchTerm.trim().length > 0) {
        // ilike search with wildcard
        const escaped = searchTerm.replace(/([%_])/g, '\\$1')
        parts.push(`or=(client.ilike.*${escaped}*,username.ilike.*${escaped}*)`)
      }

      const url = `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?${parts.join('&')}`

      const response = await greApi.get<Session[]>(url, {
        headers: {
          'Prefer': 'count=exact'
        },
        signal
      })

  const sessions = response.data

      const entries: SessionTimelineEntry[] = sessions
        .filter(s => !!s.start_ts)
        .map(s => {
          const start = new Date(s.start_ts!).getTime()
          const end = s.end_ts ? new Date(s.end_ts).getTime() : Date.now()
          const duration = (end - start) / (1000 * 60)
          return {
            client: s.client || 'Unknown',
            username: s.username || 'Unknown',
            start_ts: s.start_ts as string,
            end_ts: s.end_ts,
            duration,
            isActive: !s.end_ts
          }
        })

      // Try to read total from Content-Range header: format like 0-24/49530
      let total: number | null = null
      const contentRange = (response.headers && (response.headers['content-range'] || response.headers['Content-Range'])) as string | undefined
      if (contentRange) {
        const parts = contentRange.split('/').map(p => p.trim())
        if (parts.length === 2) {
          const totalNum = parseInt(parts[1], 10)
          if (!isNaN(totalNum)) total = totalNum
        }
      }

      const hasMore = typeof total === 'number' ? offset + sessions.length < total : sessions.length === limit

      return { entries, total, hasMore }
    } catch (error) {
      console.error('Error fetching paginated session timeline:', error)
      if ((error as any).response) {
        const resp = (error as any).response
        throw new Error(`Failed to fetch session timeline: ${resp.status} ${JSON.stringify(resp.data).slice(0,200)}`)
      }
      throw new Error(`Failed to fetch session timeline: ${(error as Error).message}`)
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

  // Process connection/disconnection events aggregated by time buckets
  static async getConnectionChurn(hoursBack: number = 24, bucketSizeMinutes: number = 5): Promise<SubscriptionEvent[]> {
    try {
      // Get connection and disconnection events from /events endpoint
      console.log(`Getting connection events for last ${hoursBack} hours`)
      const events = await this.getConnectionEvents(hoursBack)
      console.log(`Raw events fetched: ${events.length}`)
      
      // Filter for only connected and disconnected events
      const connectionEvents = events.filter(event => 
        event.action === 'connected' || event.action === 'disconnected'
      )
      console.log(`Filtered connection events: ${connectionEvents.length}`)
      console.log('Sample events:', connectionEvents.slice(0, 3))
      
      // Group events by time buckets
      const buckets = new Map<string, { connects: number, disconnects: number }>()
      
      connectionEvents.forEach(event => {
        const eventTime = new Date(event.ts)
        const bucketTime = new Date(
          eventTime.getFullYear(),
          eventTime.getMonth(),
          eventTime.getDate(),
          eventTime.getHours(),
          Math.floor(eventTime.getMinutes() / bucketSizeMinutes) * bucketSizeMinutes
        )
        
        const bucketKey = bucketTime.toISOString()
        
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, { connects: 0, disconnects: 0 })
        }
        
        const bucket = buckets.get(bucketKey)!
        if (event.action === 'connected') {
          bucket.connects++
        } else if (event.action === 'disconnected') {
          bucket.disconnects++
        }
      })

      console.log(`Created ${buckets.size} time buckets`)

      // Convert to array format compatible with SubscriptionEvent
      const result: SubscriptionEvent[] = []
      buckets.forEach((counts, timestamp) => {
        result.push({
          ts: timestamp,
          action: 'subscribe', // Reuse for connects 
          client: '',
          topic: '',
          count: counts.connects
        })
        result.push({
          ts: timestamp,
          action: 'unsubscribe', // Reuse for disconnects
          client: '',
          topic: '',
          count: counts.disconnects
        })
      })

      return result.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    } catch (error) {
      console.error('Error processing connection churn:', error)
      throw new Error('Failed to process connection churn data')
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

  // Get most recent N clients for initial display
  static async getRecentClients(hoursBack: number = 24, limit: number = 5): Promise<string[]> {
    try {
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      
      const response = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${fromTime}&select=client&order=start_ts.desc&limit=${limit}`
      )
      
      // Get unique clients from most recent sessions
      const uniqueClients = [...new Set(response.data.map(s => s.client).filter(Boolean))] as string[]
      return uniqueClients.slice(0, limit)
    } catch (error) {
      console.error('Error fetching recent clients:', error)
      throw new Error('Failed to fetch recent clients')
    }
  }

  // Get gantt data for specific clients only (optimized)
  static async getClientGanttForClients(clientIds: string[], hoursBack: number = 24): Promise<ClientGanttEntry[]> {
    try {
      if (clientIds.length === 0) return []
      
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      const clientFilter = clientIds.map(id => `"${id}"`).join(',')
      
      const response = await greApi.get<Session[]>(
        `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${fromTime}&client=in.(${clientFilter})&order=start_ts.desc`
      )

      // Group sessions by client
      const clientMap = new Map<string, ClientGanttEntry>()
      
      response.data.forEach(session => {
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
      console.error('Error fetching gantt data for specific clients:', error)
      throw new Error('Failed to fetch gantt data for specific clients')
    }
  }

  // Get gantt data for specific usernames (with smart client limits)
  static async getClientGanttForUsernames(usernames: string[], hoursBack: number = 24, maxClientsPerUsername: number = 20): Promise<{
    ganttData: ClientGanttEntry[],
    truncatedUsernames: string[]
  }> {
    try {
      if (usernames.length === 0) return { ganttData: [], truncatedUsernames: [] }
      
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      const allGanttData: ClientGanttEntry[] = []
      const truncatedUsernames: string[] = []
      
      // Process each username separately to control client limits
      for (const username of usernames) {
        // Get clients for this username with limit
        const clientsResponse = await greApi.get<Session[]>(
          `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${fromTime}&username=eq.${username}&select=client&order=start_ts.desc&limit=${maxClientsPerUsername * 2}`
        )
        
        // Get unique clients
        const uniqueClients = [...new Set(clientsResponse.data.map(s => s.client).filter(Boolean))] as string[]
        
        // Check if we're truncating
        if (uniqueClients.length > maxClientsPerUsername) {
          truncatedUsernames.push(username)
          uniqueClients.splice(maxClientsPerUsername) // Keep only first maxClientsPerUsername
        }
        
        // Get gantt data for these clients
        if (uniqueClients.length > 0) {
          const usernameGanttData = await this.getClientGanttForClients(uniqueClients, hoursBack)
          allGanttData.push(...usernameGanttData)
        }
      }
      
      return {
        ganttData: allGanttData,
        truncatedUsernames
      }
    } catch (error) {
      console.error('Error fetching gantt data for usernames:', error)
      throw new Error('Failed to fetch gantt data for usernames')
    }
  }

  // Search all available clients and usernames for dropdown (with smart pagination)
  static async searchClientsAndUsernames(
    searchTerm: string = '', 
    hoursBack: number = 24,
    limit: number = 100
  ): Promise<{ clients: string[], usernames: string[] }> {
    try {
      const fromTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString()
      
      let query = `${GRE_API_CONFIG.ENDPOINTS.SESSIONS}?start_ts=gte.${fromTime}&select=client,username&order=start_ts.desc&limit=${limit}`
      
      // Add search filter if provided
      if (searchTerm) {
        query += `&or=(client.ilike.*${searchTerm}*,username.ilike.*${searchTerm}*)`
      }
      
      const response = await greApi.get<Session[]>(query)
      
      const clients = [...new Set(response.data.map(s => s.client).filter(Boolean))] as string[]
      const usernames = [...new Set(response.data.map(s => s.username).filter(Boolean))] as string[]
      
      return {
        clients: clients.sort(),
        usernames: usernames.sort()
      }
    } catch (error) {
      console.error('Error searching clients and usernames:', error)
      // Fallback to empty results on error
      return { clients: [], usernames: [] }
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

  // Get total count of active subscriptions first
  static async getActiveSubscriptionsCount(): Promise<number> {
    try {
      const response = await greApi.get(
        `${GRE_API_CONFIG.ENDPOINTS.SUBSCRIPTIONS}?active=is.true&select=id`,
        { headers: { 'Prefer': 'count=exact' } }
      )
      return parseInt(response.headers['content-range']?.split('/')[1] || '0')
    } catch (error) {
      console.error('Error fetching active subscriptions count:', error)
      throw new Error('Failed to fetch active subscriptions count')
    }
  }

  // Get active subscriptions with topic aggregation (with optional limit for large datasets)
  static async getActiveSubscriptions(limit?: number): Promise<{ subscriptions: Subscription[], topicBreakdown: TopicSubscription[], totalCount: number }> {
    try {
      // Get total count first
      const totalCount = await this.getActiveSubscriptionsCount()
      
      // If count is very large and no limit specified, set a reasonable limit
      const effectiveLimit = limit || (totalCount > 10000 ? 5000 : undefined)
      
      const query = `${GRE_API_CONFIG.ENDPOINTS.SUBSCRIPTIONS}?active=is.true&order=updated_at.desc${effectiveLimit ? `&limit=${effectiveLimit}` : ''}`
      const response = await greApi.get<Subscription[]>(query)
      
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
      
      return { subscriptions, topicBreakdown, totalCount }
    } catch (error) {
      console.error('Error fetching active subscriptions:', error)
      throw new Error('Failed to fetch active subscriptions')
    }
  }

  // Get subscription state (who's subscribed to what)
  static async getSubscriptionState(): Promise<{ activeSubscriptions: Subscription[], topicBreakdown: TopicSubscription[], totalCount: number }> {
    try {
      const result = await this.getActiveSubscriptions()
      return {
        activeSubscriptions: result.subscriptions,
        topicBreakdown: result.topicBreakdown,
        totalCount: result.totalCount
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
      const { offset = 0, limit = 20, filters = {}, sortColumn, sortDirection = 'asc' } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      })
      
      // Add sorting if specified
      if (sortColumn) {
        queryParams.append('order', `${sortColumn}.${sortDirection}`)
      }
      
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
      const { offset = 0, limit = 20, filters = {}, sortColumn, sortDirection = 'desc' } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      })
      
      // Add sorting - default to ts.desc for events if no sort specified
      if (sortColumn) {
        queryParams.append('order', `${sortColumn}.${sortDirection}`)
      } else {
        queryParams.append('order', 'ts.desc')
      }
      
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
      const { offset = 0, limit = 20, filters = {}, sortColumn, sortDirection = 'desc' } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      })
      
      // Add sorting - default to last_seen.desc for clients if no sort specified
      if (sortColumn) {
        queryParams.append('order', `${sortColumn}.${sortDirection}`)
      } else {
        queryParams.append('order', 'last_seen.desc')
      }
      
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
      const { offset = 0, limit = 20, filters = {}, sortColumn, sortDirection = 'desc' } = params
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      })
      
      // Add sorting - default to created_at.desc for subscriptions if no sort specified
      if (sortColumn) {
        queryParams.append('order', `${sortColumn}.${sortDirection}`)
      } else {
        queryParams.append('order', 'created_at.desc')
      }
      
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

  // Generic method for any table with pagination
  static async getTableDataPaginated(
    endpoint: string, 
    params: PaginationParams = {}
  ): Promise<{ data: ApiDataType[], totalCount: number }> {
    try {
      const { offset = 0, limit = 20, filters = {}, sortColumn, sortDirection = 'desc' } = params
      
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString()
      })
      
      // Add sorting if specified, otherwise try smart defaults
      if (sortColumn) {
        queryParams.append('order', `${sortColumn}.${sortDirection}`)
      } else {
        // Try to add default ordering - fallback gracefully if field doesn't exist
        try {
          // For views and analytical tables, try different ordering fields
          if (endpoint.includes('_minute_60m') || endpoint.includes('_minute')) {
            queryParams.append('order', 'ts_bucket.desc')
          } else if (endpoint.includes('v_') || endpoint.includes('stats')) {
            // For views and stats tables, don't add default ordering 
            // as column availability varies
          } else {
            queryParams.append('order', 'id.desc')
          }
        } catch (e) {
          // Ordering failed, continue without it
        }
      }
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value)
      })
      
      const response = await greApi.get<ApiDataType[]>(
        `${endpoint}?${queryParams.toString()}`,
        { headers: { 'Prefer': 'count=exact' } }
      )
      
      const totalCount = parseInt(response.headers['content-range']?.split('/')[1] || '0')
      return { data: response.data, totalCount }
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error)
      throw new Error(`Failed to fetch data from ${endpoint}`)
    }
  }

  // Topic Management Methods
  
  // Get topic activity data
  static async getTopicActivity(): Promise<TopicActivity[]> {
    try {
      const response = await greApi.get<TopicActivity[]>('/topic_activity')
      return response.data
    } catch (error) {
      console.error('Error fetching topic activity:', error)
      throw new Error('Failed to fetch topic activity data')
    }
  }

  // Get inactive topics with filtering and pagination
  static async getInactiveTopics(params?: {
    order?: string
    limit?: number
    offset?: number
  }): Promise<InactiveTopic[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.order) queryParams.append('order', params.order)
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.offset) queryParams.append('offset', params.offset.toString())

      const response = await greApi.get<InactiveTopic[]>(`/v_inactive_topics?${queryParams.toString()}`)
      return response.data
    } catch (error) {
      console.error('Error fetching inactive topics:', error)
      throw new Error('Failed to fetch inactive topics data')
    }
  }

  // Get topic activity for a specific topic
  static async getTopicActivityByTopic(topic: string): Promise<TopicActivity[]> {
    try {
      const response = await greApi.get<TopicActivity[]>(`/topic_activity?topic=eq.${encodeURIComponent(topic)}&limit=1`)
      return response.data
    } catch (error) {
      console.error(`Error fetching topic activity for ${topic}:`, error)
      throw new Error(`Failed to fetch topic activity for ${topic}`)
    }
  }

  // Get topic audit log for a specific topic
  static async getTopicAuditLog(topic: string, limit: number = 50): Promise<TopicAuditLog[]> {
    try {
      const response = await greApi.get<TopicAuditLog[]>(`/topic_audit_log?topic=eq.${encodeURIComponent(topic)}&order=ts.desc&limit=${limit}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching topic audit log for ${topic}:`, error)
      throw new Error(`Failed to fetch topic audit log for ${topic}`)
    }
  }

  // Get topic action runs for a specific topic
  static async getTopicActionRuns(topic: string, limit: number = 50): Promise<TopicActionRun[]> {
    try {
      const response = await greApi.get<TopicActionRun[]>(`/topic_action_runs?topic=eq.${encodeURIComponent(topic)}&order=ts.desc&limit=${limit}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching topic action runs for ${topic}:`, error)
      throw new Error(`Failed to fetch topic action runs for ${topic}`)
    }
  }

  // RPC Action Methods

  // Archive a topic (quarantine)
  static async archiveTopic(request: TopicActionRequest): Promise<TopicActionResponse> {
    try {
      const response = await greApi.post<TopicActionResponse>('/rpc/api_archive_topic', request)
      return response.data
    } catch (error) {
      console.error(`Error archiving topic ${request.p_topic}:`, error)
      
      // Extract detailed error message from API response
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && errorData.message) {
          throw new Error(`Archive failed: ${errorData.message}`)
        } else if (typeof errorData === 'string') {
          throw new Error(`Archive failed: ${errorData}`)
        }
      }
      
      throw new Error(`Failed to archive topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Unarchive a topic (re-allow)
  static async unarchiveTopic(request: TopicActionRequest): Promise<TopicActionResponse> {
    try {
      const response = await greApi.post<TopicActionResponse>('/rpc/api_unarchive_topic', request)
      return response.data
    } catch (error) {
      console.error(`Error unarchiving topic ${request.p_topic}:`, error)
      
      // Extract detailed error message from API response
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && errorData.message) {
          throw new Error(`Unarchive failed: ${errorData.message}`)
        } else if (typeof errorData === 'string') {
          throw new Error(`Unarchive failed: ${errorData}`)
        }
      }
      
      throw new Error(`Failed to unarchive topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Delete a topic (cleanup)
  static async deleteTopic(request: TopicActionRequest): Promise<TopicActionResponse> {
    try {
      const response = await greApi.post<TopicActionResponse>('/rpc/api_delete_topic', request)
      return response.data
    } catch (error) {
      console.error(`Error deleting topic ${request.p_topic}:`, error)
      
      // Extract detailed error message from API response
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && errorData.message) {
          throw new Error(`Delete failed: ${errorData.message}`)
        } else if (typeof errorData === 'string') {
          throw new Error(`Delete failed: ${errorData}`)
        }
      }
      
      throw new Error(`Failed to delete topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Poll topic action runs until completion
  static async pollTopicActionRuns(
    topic: string, 
    expectedAction: string,
    timeoutMs: number = 20000,
    intervalMs: number = 2000
  ): Promise<TopicActionRun | null> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const runs = await this.getTopicActionRuns(topic, 1)
        if (runs.length > 0) {
          const latestRun = runs[0]
          if (latestRun.action === expectedAction && latestRun.status !== 'pending') {
            return latestRun
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (error) {
        console.error('Error polling topic action runs:', error)
        break
      }
    }
    
    return null // Timeout reached
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
