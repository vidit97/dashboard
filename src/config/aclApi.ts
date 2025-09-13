// ACL API Configuration
export const ACL_API_CONFIG = {
  BASE_URL: 'https://berkeley-funny-booking-rebate.trycloudflare.com',
  ENDPOINTS: {
    DYN_STATE: '/dyn_state',
    DS_STATE_GET: '/rpc/ds_state_get',
    DS_PREVIEW: '/rpc/ds_preview',
    DS_APPLY: '/rpc/ds_apply', 
    DS_BACKUP_NOW: '/rpc/ds_backup_now',
    DYN_BACKUPS: '/dyn_backups',
    DYN_OP_QUEUE: '/dyn_op_queue',
    DYN_AUDIT_LOG: '/dyn_audit_log',
    CLIENTS: '/clients'
  }
} as const

// Core API response types based on actual PostgREST schema
export interface DynState {
  broker: string
  data_json: any
  version: number
  updated_at: string
}

export interface RoleACL {
  acltype: string
  topic: string
  allow: boolean
  priority: number
}

export interface ClientRole {
  rolename: string
  priority: number
}

export interface Role {
  rolename: string
  acls: RoleACL[]
}

export interface Client {
  username: string
  disabled?: boolean
  roles?: ClientRole[]
  password?: string
}

// Data structure from dyn_state.data_json
export interface DSStateData {
  roles: Role[]
  clients: Client[]
  groups?: any[]
  defaultACLAccess?: {
    publishClientSend: boolean
    publishClientReceive: boolean
    subscribe: boolean
    unsubscribe: boolean
  }
}

export interface BackupItem {
  id: number
  broker: string
  taken_at: string
  data_json: any
  source: string
  notes: string
}

export interface QueueItem {
  id: number
  broker: string
  op: string
  payload_json: any
  status: 'pending' | 'succeeded' | 'failed'
  actor: string
  enqueued_at: string
  processed_at?: string
  error?: string
}

export interface AuditLogItem {
  id: number
  ts: string
  actor: string
  broker: string
  op: string
  payload_json: any
  result_json: any
  queue_id: number
}

export interface ClientInfo {
  id: number
  client: string
  username: string
  first_seen: string
  last_seen: string
  cert_cn?: string
  cert_san?: string
  cert_fingerprint?: string
  created_at: string
}

// Processed types for UI display
export interface ProcessedRole {
  rolename: string
  acl_count: number
  acls: RoleACL[]
  client_count: number
  status: 'active' | 'inactive'
  last_updated: string
}

export interface ProcessedClient {
  username: string
  disabled: boolean
  role_count: number
  roles: ClientRole[]
  status: 'enabled' | 'disabled'
  last_updated: string
}

// Operation types for ds_apply
export type DSOperation = 
  | 'add_role_acl'
  | 'remove_role_acl'
  | 'add_client_role'
  | 'remove_client_role'
  | 'create_client'
  | 'create_role'
  | 'enable_client'
  | 'disable_client'
  | 'set_client_password'
  | 'refresh_state'

export interface DSApplyResponse {
  queued: boolean
  queue_id: number
}

// Response wrapper types
export interface ApiError {
  message: string
  code?: string
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  ok: boolean
}

// Overview data for dashboard - derived from DynState
export interface OverviewData {
  broker: string
  version: number
  updatedAt: string
  roleCount: number
  clientCount: number
  groupCount: number
  defaultAcl: {
    publishSend: boolean
    publishRecv: boolean
    subscribe: boolean
    unsubscribe: boolean
  }
}

// ACL Types enum
export type ACLType = 
  | 'publishClientSend'
  | 'publishClientReceive'
  | 'subscribePattern'
  | 'subscribeLiteral'
  | 'unsubscribePattern'
  | 'unsubscribeLiteral'

// Role data for dropdowns
export interface RoleData {
  rolename: string
  acls: RoleACL[]
}
