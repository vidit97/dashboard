// GRE API Configuration
export const GRE_API_CONFIG = {
  BASE_URL: import.meta.env.VITE_GRE_API_BASE_URL || 'https://gzip-lucia-stores-davidson.trycloudflare.com',
  ENDPOINTS: {
    SESSIONS: '/sessions',
    EVENTS: '/events',
    SUBSCRIPTIONS: '/subscriptions',
  }
} as const

// Type definitions for GRE API responses
export interface Session {
  id: number
  client_id: number | null
  client: string | null
  username: string | null
  start_ts: string | null
  end_ts: string | null
}

export interface Event {
  id: number
  ts: string
  action: string
  client: string | null
  topic: string | null
  qos: number | null
  username: string | null
  raw: string | null
}

export interface SessionResponse extends Array<Session> {}
export interface EventResponse extends Array<Event> {}

// Helper types for analysis
export interface SessionDuration {
  duration: number // in minutes
  client: string
  username: string
}

export interface ConnectedClient {
  client: string
  username: string
  start_ts: string
  session_id: number
}

export interface SessionTimelineEntry {
  client: string
  username: string
  start_ts: string
  end_ts: string | null
  duration: number
  isActive: boolean
}

export interface SubscriptionEvent {
  ts: string
  action: 'subscribe' | 'unsubscribe'
  client: string
  topic: string
  count: number
}

export interface SessionStats {
  totalSessions: number
  activeSessions: number
  avgDuration: number
  medianDuration: number
  percentile95Duration: number
  sessionsLast7Days: SessionDuration[]
  connectedClients: ConnectedClient[]
  userBreakdown: Record<string, number>
}

// New interfaces for additional components
export interface ClientGanttEntry {
  client: string
  username: string
  sessions: {
    start: string
    end: string | null
    duration: number
    isActive: boolean
  }[]
}

export interface CheckpointEvent {
  id: number
  ts: string
  action: 'checkpoint'
  raw: string
}

export interface ConnectionInfoEvent {
  id: number
  ts: string
  action: 'conn_info'
  count: number
  timeWindow: string
}

export interface ActivityEvent {
  id: number
  ts: string
  action: 'connected' | 'disconnected' | 'subscribe' | 'unsubscribe' | 'checkpoint' | 'conn_info' | 'error' | 'unknown'
  client: string | null
  topic: string | null
  qos: number | null
  username: string | null
  raw: string | null
  icon: string
  description: string
}

// Subscription interfaces
export interface Subscription {
  id: number
  session_id: number | null
  client: string
  topic: string
  qos: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionResponse extends Array<Subscription> {}

export interface TopicSubscription {
  topic: string
  count: number
  qos_breakdown: Record<number, number>
  clients: string[]
}

export interface ClientTopicFootprint {
  client: string
  topics: {
    topic: string
    qos: number
    total_clients_on_topic: number
    created_at: string
  }[]
}
