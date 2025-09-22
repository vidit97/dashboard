import axios, { AxiosResponse } from 'axios'
import { 
  ACL_API_CONFIG,
  DynState,
  DSStateData,
  OverviewData,
  ProcessedRole,
  ProcessedClient,
  ApiResponse,
  BackupItem,
  QueueItem,
  AuditLogItem,
  DSOperation,
  DSApplyResponse,
  ClientInfo,
  Role,
  Client,
  RoleACL,
  ClientRole
} from '../config/aclApi'

// Create axios instance for ACL API
const aclApi = axios.create({
  baseURL: ACL_API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Utility function to format timestamps
export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString()
}

export class ACLApiService {
  // Cache the current broker to use for operations
  private static currentBroker: string | null = null

  // Get dynamic security state (main data source)
  static async getState(broker?: string): Promise<ApiResponse<DynState>> {
    try {
      console.log('Getting dynamic security state', broker ? `for broker: ${broker}` : 'for all brokers')
      
      let response: any
      if (broker) {
        // If broker is specified, filter by that broker
        response = await aclApi.get<DynState[]>(
          `${ACL_API_CONFIG.ENDPOINTS.DYN_STATE}?broker=eq.${broker}`
        )
      } else {
        // If no broker specified, get all available brokers
        response = await aclApi.get<DynState[]>(ACL_API_CONFIG.ENDPOINTS.DYN_STATE)
      }
      
      console.log('State response:', response.data)
      
      if (!response.data || response.data.length === 0) {
        return {
          error: { message: 'No broker data found' },
          ok: false
        }
      }
      
      // If multiple brokers, use the first one (or you could implement broker selection logic)
      const state = response.data[0]
      console.log('Using broker:', state.broker)
      
      // Cache the broker for use in operations
      this.currentBroker = state.broker
      
      return { data: state, ok: true }
    } catch (error) {
      console.error('State API call failed:', error)
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get state' },
        ok: false
      }
    }
  }

  // Create backup
  static async backupNow(broker?: string, notes: string = 'Manual backup'): Promise<ApiResponse<number>> {
    try {
      const targetBroker = broker || this.currentBroker || 'local'
      console.log('Creating backup for broker:', targetBroker)
      const response = await aclApi.post<number>(
        ACL_API_CONFIG.ENDPOINTS.DS_BACKUP_NOW,
        { p_broker: targetBroker, p_notes: notes }
      )
      console.log('Backup response:', response.data)
      return { data: response.data, ok: true }
    } catch (error) {
      console.error('Backup API call failed:', error)
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to create backup' },
        ok: false
      }
    }
  }

  // Get backups list
  static async getBackups(broker?: string): Promise<ApiResponse<BackupItem[]>> {
    try {
      const targetBroker = broker || this.currentBroker || 'local'
      const response = await aclApi.get<BackupItem[]>(
        `${ACL_API_CONFIG.ENDPOINTS.DYN_BACKUPS}?broker=eq.${targetBroker}&order=taken_at.desc`
      )
      return { data: response.data, ok: true }
    } catch (error) {
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get backups' },
        ok: false
      }
    }
  }

  // Get queue items
  static async getQueue(limit: number = 50): Promise<ApiResponse<QueueItem[]>> {
    try {
      const response = await aclApi.get<QueueItem[]>(
        `${ACL_API_CONFIG.ENDPOINTS.DYN_OP_QUEUE}?order=id.desc&limit=${limit}`
      )
      return { data: response.data, ok: true }
    } catch (error) {
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get queue' },
        ok: false
      }
    }
  }

  // Get audit log
  static async getAuditLog(limit: number = 50, queueId?: number): Promise<ApiResponse<AuditLogItem[]>> {
    try {
      let url = `${ACL_API_CONFIG.ENDPOINTS.DYN_AUDIT_LOG}?order=id.desc&limit=${limit}`
      if (queueId) {
        url = `${ACL_API_CONFIG.ENDPOINTS.DYN_AUDIT_LOG}?queue_id=eq.${queueId}`
      }
      const response = await aclApi.get<AuditLogItem[]>(url)
      return { data: response.data, ok: true }
    } catch (error) {
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get audit log' },
        ok: false
      }
    }
  }

  // Get client info
  static async getClients(limit: number = 100): Promise<ApiResponse<ClientInfo[]>> {
    try {
      const response = await aclApi.get<ClientInfo[]>(
        `${ACL_API_CONFIG.ENDPOINTS.CLIENTS}?order=created_at.desc&limit=${limit}`
      )
      return { data: response.data, ok: true }
    } catch (error) {
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get clients' },
        ok: false
      }
    }
  }

  // Apply DS operation
  static async applyOperation(
    broker: string,
    operation: DSOperation,
    payload: any,
    dryRun: boolean = false
  ): Promise<ApiResponse<DSApplyResponse>> {
    try {
      const response = await aclApi.post<DSApplyResponse>(
        ACL_API_CONFIG.ENDPOINTS.DS_APPLY,
        {
          p_broker: broker,
          p_op: operation,
          p_payload: payload,
          p_dry_run: dryRun
        }
      )
      return { data: response.data, ok: true }
    } catch (error) {
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to apply operation' },
        ok: false
      }
    }
  }

  // Poll queue item for completion
  static async pollQueueItem(queueId: number, maxAttempts: number = 10, intervalMs: number = 1000): Promise<ApiResponse<QueueItem>> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await aclApi.get<QueueItem[]>(
          `${ACL_API_CONFIG.ENDPOINTS.DYN_OP_QUEUE}?id=eq.${queueId}`
        )
        
        const queueItem = response.data[0]
        if (!queueItem) {
          return {
            error: { message: 'Queue item not found' },
            ok: false
          }
        }

        if (queueItem.status === 'succeeded' || queueItem.status === 'failed') {
          return { data: queueItem, ok: true }
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          return {
            error: { message: error instanceof Error ? error.message : 'Failed to poll queue item' },
            ok: false
          }
        }
      }
    }

    return {
      error: { message: 'Queue polling timeout' },
      ok: false
    }
  }

  // === WRITE OPERATIONS ===

  // Create a new role
  static async createRole(rolename: string, acls: RoleACL[] = [], dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'create_role', { 
      rolename, 
      acls 
    }, dryRun)
  }

  // Add ACL to role
  static async addRoleACL(role: string, acltype: string, topic: string, allow: boolean, priority: number = 0, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'add_role_acl', {
      role,
      acltype,
      topic,
      allow,
      priority
    }, dryRun)
  }

  // Remove ACL from role
  static async removeRoleACL(role: string, acltype: string, topic: string, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'remove_role_acl', {
      role,
      acltype,
      topic
    }, dryRun)
  }

  // Create a new client
  static async createClient(username: string, password: string, enable: boolean = true, roles: ClientRole[] = [], dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'create_client', {
      username,
      password,
      enable,
      roles
    }, dryRun)
  }

  // Add role to client
  static async addClientRole(username: string, rolename: string, priority: number = 0, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'add_client_role', {
      username,
      rolename,
      priority
    }, dryRun)
  }

  // Remove role from client
  static async removeClientRole(username: string, rolename: string, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'remove_client_role', {
      username,
      rolename
    }, dryRun)
  }

  // Enable client
  static async enableClient(username: string, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'enable_client', {
      username
    }, dryRun)
  }

  // Disable client
  static async disableClient(username: string, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'disable_client', {
      username
    }, dryRun)
  }

  // Set client password
  static async setClientPassword(username: string, password: string, dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'set_client_password', {
      username,
      password
    }, dryRun)
  }

  // Refresh state
  static async refreshState(dryRun: boolean = false): Promise<ApiResponse<DSApplyResponse>> {
    return this.applyOperation(this.currentBroker || 'local', 'refresh_state', {}, dryRun)
  }

  // Poll queue status for completion (alias for pollQueueItem)
  static async pollQueueStatus(queueId: number, maxAttempts: number = 10, intervalMs: number = 1000): Promise<ApiResponse<QueueItem>> {
    return this.pollQueueItem(queueId, maxAttempts, intervalMs)
  }

  // === DATA PROCESSING ===

  // Process state data for overview
  static processStateData(state: DynState): OverviewData {
    const data: DSStateData = state.data_json
    
    return {
      broker: state.broker,
      version: state.version,
      updatedAt: state.updated_at,
      roleCount: data.roles?.filter(role => role.rolename).length || 0,
      clientCount: data.clients?.filter(client => client.username).length || 0,
      groupCount: data.groups?.length || 0,
      defaultAcl: {
        publishSend: data.defaultACLAccess?.publishClientSend || false,
        publishRecv: data.defaultACLAccess?.publishClientReceive || false,
        subscribe: data.defaultACLAccess?.subscribe || false,
        unsubscribe: data.defaultACLAccess?.unsubscribe || false
      }
    }
  }

  // Process roles for UI display
  static processRoles(state: DynState): ProcessedRole[] {
    const data: DSStateData = state.data_json
    const roles = data.roles || []
    const clients = data.clients || []
    
    return roles
      .filter(role => role.rolename) // Filter out null/undefined rolenames
      .map(role => {
        // Count clients that have this role
        const clientCount = clients.filter(client => 
          client.roles?.some(cr => cr.rolename === role.rolename)
        ).length

        return {
          rolename: role.rolename,
          acl_count: role.acls?.length || 0,
          acls: role.acls || [],
        client_count: clientCount,
        status: role.acls && role.acls.length > 0 ? 'active' : 'inactive',
        last_updated: state.updated_at
      }
    })
  }

  // Process clients for UI display
  static processClients(state: DynState): ProcessedClient[] {
    const data: DSStateData = state.data_json
    const clients = data.clients || []
    
    return clients
      .filter(client => client.username) // Filter out null/undefined usernames
      .map(client => ({
        username: client.username,
        disabled: client.disabled || false,
        role_count: client.roles?.length || 0,
        roles: client.roles || [],
        status: client.disabled ? 'disabled' : 'enabled',
      last_updated: state.updated_at
    }))
  }
}

// Helper function for ACL type display names
export const getACLTypeDisplayName = (aclType: string): string => {
  const displayNames: Record<string, string> = {
    'publishClientSend': 'Publish (Send)',
    'publishClientReceive': 'Publish (Receive)', 
    'subscribePattern': 'Subscribe (Pattern)',
    'subscribeLiteral': 'Subscribe (Literal)',
    'unsubscribePattern': 'Unsubscribe (Pattern)',
    'unsubscribeLiteral': 'Unsubscribe (Literal)'
  }
  return displayNames[aclType] || aclType
}
