// API Types for GRE Dashboard

export interface Session {
  id: number;
  client_id: number;
  client: string;
  username: string | null;
  start_ts: string;
  end_ts: string | null;
  protocol: string | null;
  protocol_version: string | null;
  clean_session: boolean | null;
  keepalive: number | null;
  ip_address: string | null;
  port: number | null;
  tls_version: string | null;
  tls_cipher: string | null;
}

export interface Event {
  id: number;
  ts: string;
  action: string;
  client: string | null;
  topic: string | null;
  qos: number | null;
  username: string | null;
  raw: string | null;
}

export interface Client {
  id: number;
  client: string;
  username: string;
  first_seen: string;
  last_seen: string;
}

export interface Subscription {
  id: number;
  session_id: number | null;
  client: string;
  topic: string;
  qos: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Statistics Tables
export interface PubStats {
  id: number;
  session_id: number | null;
  client: string;
  topic: string;
  packets_published: number;
  bytes_published: number;
  first_ts: string;
  last_ts: string;
}

export interface SubStats {
  id: number;
  session_id: number | null;
  client: string;
  topic: string;
  packets_delivered: number;
  bytes_subscribed: number;
  first_ts: string;
  last_ts: string;
}

export interface DropStats {
  id: number;
  client: string;
  topic: string;
  packets_dropped: number;
  bytes_dropped: number;
  first_ts: string;
  last_ts: string;
}

// Will Messages
export interface Will {
  id: number;
  session_id: number | null;
  client: string;
  topic: string;
  qos: number;
  retain: boolean;
  payload: string | null;
  published_at: string;
}

// Broker Metrics
export interface BrokerMetric {
  id: number;
  broker: string;
  metric: string;
  value: number;
  ts: string;
}

// Time-series Tables
export interface PubMinute {
  ts_bucket: string;
  client: string;
  topic: string;
  packets: number;
  bytes: number;
}

export interface SubMinute {
  ts_bucket: string;
  client: string;
  topic: string;
  packets: number;
  bytes: number;
}

export interface DropMinute {
  ts_bucket: string;
  client: string;
  topic: string;
  packets: number;
  bytes: number;
}

// Analytical Views
export interface ActiveSubscription {
  id: number;
  session_id: number | null;
  client: string;
  topic: string;
  qos: number;
  created_at: string;
  updated_at: string;
}

export interface ClientLastSession {
  id: number;
  client_id: number;
  client: string;
  username: string | null;
  start_ts: string;
  end_ts: string | null;
  protocol: string | null;
  protocol_version: string | null;
  clean_session: boolean | null;
  keepalive: number | null;
  ip_address: string | null;
  port: number | null;
  tls_version: string | null;
  tls_cipher: string | null;
}

export interface SessionOpen {
  id: number;
  client_id: number;
  client: string;
  username: string | null;
  start_ts: string;
  protocol: string | null;
  protocol_version: string | null;
  clean_session: boolean | null;
  keepalive: number | null;
  ip_address: string | null;
  port: number | null;
  tls_version: string | null;
  tls_cipher: string | null;
}

export interface ClientDetail {
  client: string;
  last_start_ts: string | null;
  last_end_ts: string | null;
  protocol: string | null;
  protocol_version: string | null;
  clean_session: boolean | null;
  keepalive: number | null;
  ip_address: string | null;
  port: number | null;
  tls_version: string | null;
  tls_cipher: string | null;
  packets_published_24h: number | null;
  bytes_published_24h: number | null;
  packets_delivered_24h: number | null;
  bytes_subscribed_24h: number | null;
  active_subscriptions: any | null;
  last_will_published_at: string | null;
}

export interface OverviewGre {
  total_clients: number | null;
  connected_clients: number | null;
  active_subscriptions: number | null;
  messages_published_24h: number | null;
  bytes_published_24h: number | null;
  messages_delivered_24h: number | null;
  bytes_subscribed_24h: number | null;
  wills_7d: number | null;
  last_event_ts: string | null;
}

export interface ClientStats24h {
  client: string;
  packets_published_24h: number | null;
  bytes_published_24h: number | null;
  packets_delivered_24h: number | null;
  bytes_subscribed_24h: number | null;
}

export interface TopicDetail24h {
  topic: string;
  packets_published_24h: number | null;
  bytes_published_24h: number | null;
  packets_delivered_24h: number | null;
  bytes_subscribed_24h: number | null;
  active_clients: any | null;
}

export interface Drops24h {
  client: string;
  topic: string;
  packets_dropped_24h: number | null;
  bytes_dropped_24h: number | null;
}

export interface WillRecent {
  id: number;
  session_id: number | null;
  client: string;
  topic: string;
  qos: number;
  retain: boolean;
  payload: string | null;
  published_at: string;
}

// Time-series View Types (60-minute aggregates)
export interface PubMinute60m {
  ts_bucket: string;
  packets: number | null;
  bytes: number | null;
}

export interface SubMinute60m {
  ts_bucket: string;
  packets: number | null;
  bytes: number | null;
}

export interface DropMinute60m {
  ts_bucket: string;
  packets: number | null;
  bytes: number | null;
}

export type ApiDataType = Session | Event | Client | Subscription | PubStats | SubStats | DropStats | Will | BrokerMetric | 
  PubMinute | SubMinute | DropMinute | ActiveSubscription | ClientLastSession | SessionOpen | ClientDetail | 
  OverviewGre | ClientStats24h | TopicDetail24h | Drops24h | WillRecent | PubMinute60m | SubMinute60m | DropMinute60m;

export interface PaginationParams {
  offset?: number;
  limit?: number;
  filters?: Record<string, string>;
}

export interface ApiTableConfig {
  name: string;
  endpoint: string;
  displayName: string;
  defaultColumns: string[];
  allColumns: string[];
}

export const API_CONFIGS: Record<string, ApiTableConfig> = {
  // Core Tables
  sessions: {
    name: 'sessions',
    endpoint: '/sessions',
    displayName: 'Sessions',
    defaultColumns: ['id', 'client', 'username', 'start_ts', 'end_ts', 'protocol'],
    allColumns: ['id', 'client_id', 'client', 'username', 'start_ts', 'end_ts', 'protocol', 'protocol_version', 'clean_session', 'keepalive', 'ip_address', 'port', 'tls_version', 'tls_cipher']
  },
  events: {
    name: 'events',
    endpoint: '/events',
    displayName: 'Events',
    defaultColumns: ['id', 'ts', 'action', 'client', 'topic', 'username'],
    allColumns: ['id', 'ts', 'action', 'client', 'topic', 'qos', 'username', 'raw']
  },
  clients: {
    name: 'clients',
    endpoint: '/clients',
    displayName: 'Clients',
    defaultColumns: ['id', 'client', 'username', 'first_seen', 'last_seen'],
    allColumns: ['id', 'client', 'username', 'first_seen', 'last_seen']
  },
  subscriptions: {
    name: 'subscriptions',
    endpoint: '/subscriptions',
    displayName: 'Subscriptions',
    defaultColumns: ['id', 'client', 'topic', 'qos', 'active', 'created_at'],
    allColumns: ['id', 'session_id', 'client', 'topic', 'qos', 'active', 'created_at', 'updated_at']
  },
  wills: {
    name: 'wills',
    endpoint: '/wills',
    displayName: 'Will Messages',
    defaultColumns: ['id', 'client', 'topic', 'qos', 'retain', 'published_at'],
    allColumns: ['id', 'session_id', 'client', 'topic', 'qos', 'retain', 'payload', 'published_at']
  },
  broker_metrics: {
    name: 'broker_metrics',
    endpoint: '/broker_metrics',
    displayName: 'Broker Metrics',
    defaultColumns: ['id', 'broker', 'metric', 'value', 'ts'],
    allColumns: ['id', 'broker', 'metric', 'value', 'ts']
  },

  // Statistics tables removed (server no longer exposes these views)

  // Time-series Tables
  pub_minute: {
    name: 'pub_minute',
    endpoint: '/pub_minute',
    displayName: 'Publishing (Per Minute)',
    defaultColumns: ['ts_bucket', 'client', 'topic', 'packets', 'bytes'],
    allColumns: ['ts_bucket', 'client', 'topic', 'packets', 'bytes']
  },
  sub_minute: {
    name: 'sub_minute',
    endpoint: '/sub_minute',
    displayName: 'Subscriptions (Per Minute)',
    defaultColumns: ['ts_bucket', 'client', 'topic', 'packets', 'bytes'],
    allColumns: ['ts_bucket', 'client', 'topic', 'packets', 'bytes']
  },
  drop_minute: {
    name: 'drop_minute',
    endpoint: '/drop_minute',
    displayName: 'Drops (Per Minute)',
    defaultColumns: ['ts_bucket', 'client', 'topic', 'packets', 'bytes'],
    allColumns: ['ts_bucket', 'client', 'topic', 'packets', 'bytes']
  },
  // Time-series Views (60-minute aggregates)
  // (removed server-side views have been deleted from the API and so are not exposed here)
};
