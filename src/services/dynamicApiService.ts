import { ApiTableConfig, API_CONFIGS } from '../types/api'
import { schemaService, TableSchema, DynamicApiConfig } from './schemaService'

interface DynamicApiService {
  getTableConfig(tableName: string): Promise<ApiTableConfig | null>
  getAllTableConfigs(): Promise<Record<string, ApiTableConfig>>
  refreshSchemas(): Promise<void>
  discoverNewTables(): Promise<string[]>
}

class DynamicApiConfigService implements DynamicApiService {
  private dynamicConfigs: Map<string, ApiTableConfig> = new Map()
  private lastDiscovery: number = 0
  private discoveryTimeout: number = 10 * 60 * 1000 // 10 minutes

  /**
   * Get configuration for a specific table (static or dynamic)
   */
  async getTableConfig(tableName: string): Promise<ApiTableConfig | null> {
    try {
      // First check static configs
      if (API_CONFIGS[tableName]) {
        return API_CONFIGS[tableName]
      }

      // Then check dynamic configs
      if (this.dynamicConfigs.has(tableName)) {
        return this.dynamicConfigs.get(tableName)!
      }

      // Try to discover this table dynamically
      const tableSchema = await schemaService.getTableSchema(tableName)
      if (tableSchema) {
        const dynamicConfig = this.createDynamicConfig(tableSchema)
        this.dynamicConfigs.set(tableName, dynamicConfig)
        return dynamicConfig
      }

      console.warn(`Table configuration not found for: ${tableName}`)
      return null
    } catch (error) {
      console.error(`Error getting table config for ${tableName}:`, error)
      
      // Fallback: create a basic config if we can't get schema info
      return this.createFallbackConfig(tableName)
    }
  }

  /**
   * Get all available table configurations (static + dynamic)
   */
  async getAllTableConfigs(): Promise<Record<string, ApiTableConfig>> {
    await this.ensureDiscoveryUpToDate()
    
    const allConfigs: Record<string, ApiTableConfig> = {}
    
    // Add static configs
    Object.entries(API_CONFIGS).forEach(([key, config]) => {
      allConfigs[key] = config
    })
    
    // Add dynamic configs (but don't override static ones)
    this.dynamicConfigs.forEach((config, key) => {
      if (!allConfigs[key]) {
        allConfigs[key] = config
      }
    })
    
    return allConfigs
  }

  /**
   * Refresh schema information
   */
  async refreshSchemas(): Promise<void> {
    await schemaService.refreshSchemaCache()
    await this.discoverDynamicTables()
  }

  /**
   * Discover new tables not in static configuration
   */
  async discoverNewTables(): Promise<string[]> {
    const allTables = await schemaService.discoverTables()
    const staticTableNames = Object.keys(API_CONFIGS)
    
    return allTables.filter(tableName => !staticTableNames.includes(tableName))
  }

  /**
   * Ensure discovery is up to date
   */
  private async ensureDiscoveryUpToDate(): Promise<void> {
    const now = Date.now()
    
    if (this.dynamicConfigs.size === 0 || (now - this.lastDiscovery) > this.discoveryTimeout) {
      await this.discoverDynamicTables()
    }
  }

  /**
   * Discover and cache dynamic table configurations
   */
  private async discoverDynamicTables(): Promise<void> {
    try {
      const newTables = await this.discoverNewTables()
      const tableSchemas = await schemaService.getTableSchemas()
      
      // Clear existing dynamic configs
      this.dynamicConfigs.clear()
      
      // Create configs for new tables
      tableSchemas
        .filter(schema => newTables.includes(schema.name))
        .forEach(schema => {
          const config = this.createDynamicConfig(schema)
          this.dynamicConfigs.set(schema.name, config)
        })
      
      this.lastDiscovery = Date.now()
      console.log(`Discovered ${this.dynamicConfigs.size} dynamic tables`)
    } catch (error) {
      console.error('Failed to discover dynamic tables:', error)
    }
  }

  /**
   * Create a dynamic API config from table schema
   */
  private createDynamicConfig(tableSchema: TableSchema): ApiTableConfig {
    const dynamicConfig = schemaService.tableSchemaToDynamicConfig(tableSchema)
    
    return {
      name: dynamicConfig.name,
      endpoint: dynamicConfig.endpoint,
      displayName: dynamicConfig.displayName,
      defaultColumns: dynamicConfig.defaultColumns,
      allColumns: dynamicConfig.allColumns,
      isDynamic: true,
      schema: tableSchema
    }
  }

  /**
   * Create a fallback config when schema discovery fails
   */
  private createFallbackConfig(tableName: string): ApiTableConfig {
    console.warn(`Creating fallback config for table: ${tableName}`)
    
    return {
      name: tableName,
      endpoint: `/${tableName}`,
      displayName: tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      defaultColumns: ['id'], // Minimal fallback
      allColumns: ['id'], // Will be populated when data is loaded
      isDynamic: true,
      schema: undefined
    }
  }

  /**
   * Get categorized tables (for the UI)
   */
  async getCategorizedTables(): Promise<Record<string, string[]>> {
    const allConfigs = await this.getAllTableConfigs()
    const categories: Record<string, string[]> = {
      'Core Data': [],
      'Time Series': [],
      'Views': [],
      'Dynamic': []
    }
    
    Object.entries(allConfigs).forEach(([key, config]) => {
      if (config.isDynamic) {
        if (config.schema?.isView) {
          categories['Views'].push(key)
        } else {
          categories['Dynamic'].push(key)
        }
      } else {
        // Use existing categorization for static tables
        if (['sessions', 'events', 'clients', 'subscriptions', 'wills', 'broker_metrics'].includes(key)) {
          categories['Core Data'].push(key)
        } else if (['pub_minute', 'sub_minute', 'drop_minute'].includes(key)) {
          categories['Time Series'].push(key)
        } else {
          categories['Dynamic'].push(key)
        }
      }
    })
    
    // Remove empty categories
    Object.keys(categories).forEach(category => {
      if (categories[category].length === 0) {
        delete categories[category]
      }
    })
    
    return categories
  }

  /**
   * Get enhanced column information for a table
   */
  async getColumnInfo(tableName: string): Promise<Array<{name: string, type: string, nullable: boolean}>> {
    const config = await this.getTableConfig(tableName)
    
    if (config?.schema?.columns) {
      return config.schema.columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable
      }))
    }
    
    // Fallback to basic column list
    return (config?.allColumns || []).map(name => ({
      name,
      type: 'unknown',
      nullable: true
    }))
  }

  /**
   * Clear dynamic configuration cache
   */
  clearCache(): void {
    this.dynamicConfigs.clear()
    this.lastDiscovery = 0
    schemaService.clearCache()
  }
}

// Export singleton instance
export const dynamicApiService = new DynamicApiConfigService()
export { DynamicApiConfigService }