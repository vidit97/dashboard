// ACL API Configuration
export const ACL_API_CONFIG = {
  BASE_URL: (import.meta as any).env.VITE_GRE_API_BASE_URL,
  ENDPOINTS: {
    DYN_STATE: '/dyn_state',
    DYN_STATUS: '/dyn_status',
    DS_STATE_GET: '/rpc/ds_state_get',
    DS_PREVIEW: '/rpc/ds_preview',
    DS_APPLY: '/rpc/ds_apply',
    DS_BACKUP_NOW: '/rpc/ds_backup_now',
    DYN_BACKUPS: '/dyn_backups',
    DYN_OP_QUEUE: '/dyn_op_queue',
    DYN_AUDIT_LOG: '/dyn_audit_log'
  }
} as const

// Core API response types based on specification
export interface DynStatus {
  broker: string
  version: number
  updated_at: string
  client_count: number
  role_count: number
  group_count: number
  default_acl_publish_send: boolean
  default_acl_publish_recv: boolean
  default_acl_subscribe: boolean
  default_acl_unsubscribe: boolean
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

export interface DSPreviewResponse {
  broker: string
  version: number
  updated_at: string
  roles: {
    [rolename: string]: RoleACL[]
  }
  clients: {
    [username: string]: ClientRole[]
  }
  default_acl: {
    publish_send: boolean
    publish_recv: boolean
    subscribe: boolean
    unsubscribe: boolean
  }
}

export interface BackupItem {
  id: number
  broker: string
  data_json: any
  source: string
  notes: string
  created_at: string
}

export interface QueueItem {
  id: number
  broker: string
  op: string
  payload_json: any
  status: 'pending' | 'succeeded' | 'failed'
  actor: string
  enqueued_at: string
  processed_at: string | null
  error: string | null
}

export interface AuditLogItem {
  id: number
  broker: string
  op: string
  payload_json: any
  result_json: any
  queue_id: number
  ts: string
}

// Response wrapper types
export interface ApiError {
  message: string
  code?: string
  details?: any
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  ok: boolean
}

// Processed data types for UI
export interface OverviewData {
  broker: string
  version: number
  updated_at: string
  totalRoles: number
  totalClients: number
  totalGroups: number
  defaultACLAccess: {
    publish_send: boolean
    publish_recv: boolean
    subscribe: boolean
    unsubscribe: boolean
  }
}

export interface ProcessedRole {
  rolename: string
  acl_count: number
  acls: RoleACL[]
  last_updated: string
}

export interface ProcessedClient {
  username: string
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

// Legacy types for backward compatibility (to be removed gradually)
export interface DSStateResponse {
  broker: string
  data_json: any
  version: number
  updated_at: string
}
