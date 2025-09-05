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

export type ApiDataType = Session | Event | Client | Subscription;

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
  }
};
