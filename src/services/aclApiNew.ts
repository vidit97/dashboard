import axios, { AxiosResponse } from 'axios'
import { 
  ACL_API_CONFIG,
  DynStatus,
  DSPreviewResponse,
  OverviewData,
  ProcessedRole,
  ProcessedClient,
  ApiResponse,
  BackupItem,
  QueueItem,
  AuditLogItem,
  DSOperation,
  DSApplyResponse
} from '../config/aclApi'

// Create axios instance for ACL API
const aclApi = axios.create({
  baseURL: ACL_API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptor for error handling
aclApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('ACL API Error:', error)
    
    let errorMessage = 'Request failed'
    if (error.response?.data) {
      const errorData = error.response.data
      if (typeof errorData === 'string') {
        errorMessage = errorData
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else if (errorData.hint) {
        errorMessage = errorData.hint
      } else if (errorData.details) {
        errorMessage = errorData.details
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return Promise.reject(new Error(errorMessage))
  }
)

export class ACLApiService {
  // Get broker status (for overview cards)
  static async getStatus(broker: string = 'local'): Promise<ApiResponse<DynStatus>> {
    try {
      console.log('Getting status for broker:', broker)
      const response = await aclApi.get<DynStatus[]>(
        `${ACL_API_CONFIG.ENDPOINTS.DYN_STATUS}?broker=eq.${broker}`
      )
      console.log('Status response:', response.data)
      const status = response.data[0]
      return { data: status, ok: true }
    } catch (error) {
      console.error('Status API call failed:', error)
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get status' },
        ok: false
      }
    }
  }

  // Get preview data (for roles and clients)
  static async getPreview(broker: string = 'local'): Promise<ApiResponse<DSPreviewResponse>> {
    try {
      console.log('Getting preview for broker:', broker)
      const response = await aclApi.post<DSPreviewResponse>(
        ACL_API_CONFIG.ENDPOINTS.DS_PREVIEW,
        { p_broker: broker }
      )
      console.log('Preview response:', response.data)
      return { data: response.data, ok: true }
    } catch (error) {
      console.error('Preview API call failed:', error)
      return {
        error: { message: error instanceof Error ? error.message : 'Failed to get preview data' },
        ok: false
      }
    }
  }

  // Backup operation
  static async backupNow(broker: string = 'local', notes: string = 'Manual backup'): Promise<ApiResponse<number>> {
    try {
      console.log('Creating backup for broker:', broker)
      const response = await aclApi.post<number>(
        ACL_API_CONFIG.ENDPOINTS.DS_BACKUP_NOW,
        { p_broker: broker, p_notes: notes }
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
  static async getBackups(broker: string = 'local'): Promise<ApiResponse<BackupItem[]>> {
    try {
      const response = await aclApi.get<BackupItem[]>(
        `${ACL_API_CONFIG.ENDPOINTS.DYN_BACKUPS}?broker=eq.${broker}&order=created_at.desc`
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

  // Apply operation
  static async applyOperation(
    broker: string,
    op: DSOperation,
    payload: any,
    dryRun: boolean = false
  ): Promise<ApiResponse<DSApplyResponse>> {
    try {
      const response = await aclApi.post<DSApplyResponse>(
        ACL_API_CONFIG.ENDPOINTS.DS_APPLY,
        {
          p_broker: broker,
          p_op: op,
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

  // Poll queue item until complete
  static async pollQueueItem(queueId: number, maxAttempts: number = 30): Promise<ApiResponse<QueueItem>> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await aclApi.get<QueueItem[]>(
          `${ACL_API_CONFIG.ENDPOINTS.DYN_OP_QUEUE}?id=eq.${queueId}`
        )
        
        if (response.data.length === 0) {
          return {
            error: { message: `Queue item ${queueId} not found` },
            ok: false
          }
        }

        const item = response.data[0]
        if (item.status !== 'pending') {
          return { data: item, ok: true }
        }

        // Wait 500ms before next poll
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        return {
          error: { message: error instanceof Error ? error.message : 'Failed to poll queue' },
          ok: false
        }
      }
    }

    return {
      error: { message: `Queue item ${queueId} timed out after ${maxAttempts} attempts` },
      ok: false
    }
  }

  // Process data for UI consumption
  static processOverviewData(status: DynStatus): OverviewData {
    return {
      broker: status.broker,
      version: status.version,
      updated_at: status.updated_at,
      totalRoles: status.role_count,
      totalClients: status.client_count,
      totalGroups: status.group_count,
      defaultACLAccess: {
        publish_send: status.default_acl_publish_send,
        publish_recv: status.default_acl_publish_recv,
        subscribe: status.default_acl_subscribe,
        unsubscribe: status.default_acl_unsubscribe
      }
    }
  }

  static processRoles(preview: DSPreviewResponse): ProcessedRole[] {
    return Object.entries(preview.roles).map(([rolename, acls]) => ({
      rolename,
      acl_count: acls.length,
      acls,
      last_updated: preview.updated_at
    })).sort((a, b) => a.rolename.localeCompare(b.rolename))
  }

  static processClients(preview: DSPreviewResponse): ProcessedClient[] {
    return Object.entries(preview.clients).map(([username, roles]) => ({
      username,
      role_count: roles.length,
      roles,
      status: 'enabled' as const, // TODO: Get actual status from API
      last_updated: preview.updated_at
    })).sort((a, b) => a.username.localeCompare(b.username))
  }
}

// Helper functions
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
