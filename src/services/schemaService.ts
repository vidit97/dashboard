import axios from 'axios'

// PostgREST OpenAPI schema interfaces
interface OpenAPISchema {
  openapi: string
  info: any
  paths: Record<string, any>
  definitions?: Record<string, SchemaDefinition>
  components?: {
    schemas?: Record<string, SchemaDefinition>
  }
}

interface SchemaDefinition {
  type: string
  properties?: Record<string, PropertyDefinition>
  required?: string[]
}

interface PropertyDefinition {
  type: string
  format?: string
  description?: string
  maxLength?: number
}

export interface TableSchema {
  name: string
  endpoint: string
  displayName: string
  columns: ColumnSchema[]
  isView: boolean
  isRpc: boolean
}

export interface ColumnSchema {
  name: string
  type: string
  nullable: boolean
  description?: string
}

export interface DynamicApiConfig {
  name: string
  endpoint: string
  displayName: string
  defaultColumns: string[]
  allColumns: string[]
  schema?: TableSchema
}

class SchemaIntrospectionService {
  private baseUrl: string
  private schemaCache: Map<string, TableSchema> = new Map()
  private lastCacheUpdate: number = 0
  private cacheTimeout: number = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_GRE_API_BASE_URL || 'http://localhost:3001'
  }

  /**
   * Fetch PostgREST OpenAPI schema
   */
  async fetchSchema(): Promise<OpenAPISchema | null> {
    try {
      console.log('Fetching PostgREST schema from:', this.baseUrl)
      const response = await axios.get(`${this.baseUrl}/`, {
        headers: {
          'Accept': 'application/openapi+json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      console.log('Successfully fetched PostgREST schema')
      return response.data
    } catch (error) {
      console.warn('Failed to fetch PostgREST schema:', error)
      
      // Try alternative endpoints
      try {
        console.log('Trying alternative schema endpoint...')
        const response = await axios.get(`${this.baseUrl}`, {
          headers: {
            'Accept': 'application/openapi+json'
          },
          timeout: 5000
        })
        console.log('Successfully fetched schema from alternative endpoint')
        return response.data
      } catch (altError) {
        console.error('All schema fetch attempts failed:', altError)
        return null
      }
    }
  }

  /**
   * Parse OpenAPI schema to extract table information
   */
  parseSchemaDefinitions(schema: OpenAPISchema): TableSchema[] {
    const tables: TableSchema[] = []
    
    // Try both definitions (older PostgREST) and components.schemas (newer PostgREST)
    const definitions = schema.definitions || schema.components?.schemas || {}
    
    Object.entries(definitions).forEach(([name, definition]) => {
      if (definition.type === 'object' && definition.properties) {
        const columns = this.parseColumns(definition.properties)
        const isView = name.startsWith('v_') || name.includes('view')
        const isRpc = name.startsWith('rpc_')
        
        // Skip RPC definitions as they're not tables
        if (isRpc) return
        
        const tableSchema: TableSchema = {
          name,
          endpoint: `/${name}`,
          displayName: this.generateDisplayName(name),
          columns,
          isView,
          isRpc: false
        }
        
        tables.push(tableSchema)
      }
    })

    return tables
  }

  /**
   * Parse column definitions from OpenAPI properties
   */
  private parseColumns(properties: Record<string, PropertyDefinition>): ColumnSchema[] {
    return Object.entries(properties).map(([name, prop]) => ({
      name,
      type: this.mapPostgreSQLType(prop.type, prop.format),
      nullable: true, // PostgREST doesn't always provide nullability in OpenAPI
      description: prop.description
    }))
  }

  /**
   * Map PostgREST/PostgreSQL types to display types
   */
  private mapPostgreSQLType(type: string, format?: string): string {
    if (format) {
      switch (format) {
        case 'date-time': return 'timestamp'
        case 'date': return 'date'
        case 'time': return 'time'
        case 'uuid': return 'uuid'
      }
    }
    
    switch (type) {
      case 'integer': return 'integer'
      case 'number': return 'numeric'
      case 'string': return 'text'
      case 'boolean': return 'boolean'
      case 'array': return 'array'
      default: return type || 'unknown'
    }
  }

  /**
   * Generate human-readable display name from table name
   */
  private generateDisplayName(tableName: string): string {
    return tableName
      .replace(/^v_/, '') // Remove view prefix
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Get cached schema or fetch if cache is stale
   */
  async getTableSchemas(): Promise<TableSchema[]> {
    const now = Date.now()
    
    if (this.schemaCache.size === 0 || (now - this.lastCacheUpdate) > this.cacheTimeout) {
      await this.refreshSchemaCache()
    }
    
    return Array.from(this.schemaCache.values())
  }

  /**
   * Refresh the schema cache
   */
  async refreshSchemaCache(): Promise<void> {
    try {
      const schema = await this.fetchSchema()
      if (schema) {
        const tables = this.parseSchemaDefinitions(schema)
        
        // Clear and rebuild cache
        this.schemaCache.clear()
        tables.forEach(table => {
          this.schemaCache.set(table.name, table)
        })
        
        this.lastCacheUpdate = Date.now()
        console.log(`Schema cache refreshed with ${tables.length} tables`)
      }
    } catch (error) {
      console.error('Failed to refresh schema cache:', error)
    }
  }

  /**
   * Get schema for a specific table
   */
  async getTableSchema(tableName: string): Promise<TableSchema | null> {
    const schemas = await this.getTableSchemas()
    return schemas.find(s => s.name === tableName) || null
  }

  /**
   * Convert table schema to dynamic API config
   */
  tableSchemaToDynamicConfig(tableSchema: TableSchema, existingConfig?: any): DynamicApiConfig {
    const columnNames = tableSchema.columns.map(c => c.name)
    
    // Use existing config for defaults if available, otherwise make smart defaults
    const defaultColumns = existingConfig?.defaultColumns || this.generateDefaultColumns(columnNames)
    
    return {
      name: tableSchema.name,
      endpoint: tableSchema.endpoint,
      displayName: tableSchema.displayName,
      defaultColumns,
      allColumns: columnNames,
      schema: tableSchema
    }
  }

  /**
   * Generate smart default columns based on common patterns
   */
  private generateDefaultColumns(allColumns: string[]): string[] {
    const priorityColumns = ['id', 'client', 'username', 'topic', 'ts', 'created_at', 'updated_at']
    const defaults: string[] = []
    
    // Add priority columns if they exist
    priorityColumns.forEach(col => {
      if (allColumns.includes(col)) {
        defaults.push(col)
      }
    })
    
    // Add timestamp columns
    allColumns.forEach(col => {
      if ((col.includes('_ts') || col.includes('_at')) && !defaults.includes(col)) {
        defaults.push(col)
      }
    })
    
    // If we have fewer than 5 defaults, add more common columns
    if (defaults.length < 5) {
      const commonColumns = ['name', 'type', 'status', 'action', 'value', 'message']
      commonColumns.forEach(col => {
        if (allColumns.includes(col) && !defaults.includes(col) && defaults.length < 6) {
          defaults.push(col)
        }
      })
    }
    
    // If still fewer than 5, add first few columns
    if (defaults.length < 5) {
      allColumns.slice(0, Math.min(6, allColumns.length)).forEach(col => {
        if (!defaults.includes(col)) {
          defaults.push(col)
        }
      })
    }
    
    return defaults
  }

  /**
   * Discover available tables from PostgREST paths
   */
  async discoverTables(): Promise<string[]> {
    try {
      const schema = await this.fetchSchema()
      if (!schema?.paths) return []
      
      const tableNames: string[] = []
      
      Object.keys(schema.paths).forEach(path => {
        // Extract table names from paths like "/{table_name}"
        const match = path.match(/^\/([a-zA-Z_][a-zA-Z0-9_]*)$/)
        if (match) {
          const tableName = match[1]
          // Exclude RPC functions and other special endpoints
          if (!tableName.startsWith('rpc/') && tableName !== 'root') {
            tableNames.push(tableName)
          }
        }
      })
      
      return tableNames.sort()
    } catch (error) {
      console.error('Failed to discover tables:', error)
      return []
    }
  }

  /**
   * Clear the schema cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.schemaCache.clear()
    this.lastCacheUpdate = 0
  }
}

// Export singleton instance
export const schemaService = new SchemaIntrospectionService()
export { SchemaIntrospectionService }