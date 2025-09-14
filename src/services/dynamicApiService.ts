import { ApiTableConfig, API_CONFIGS } from '../types/api'
import { schemaService, TableSchema, DynamicApiConfig } from './schemaService'
import { GreApiService } from './greApi'

interface DynamicApiService {
  getTableConfig(tableName: string): Promise<ApiTableConfig | null>
  getAllTableConfigs(): Promise<Record<string, ApiTableConfig>>
  refreshSchemas(): Promise<void>
  discoverNewTables(): Promise<string[]>
  validateTableAccess(tableName: string): Promise<boolean>
}

class DynamicApiConfigService implements DynamicApiService {
  private dynamicConfigs: Map<string, ApiTableConfig> = new Map()
  private lastDiscovery: number = 0
  private discoveryTimeout: number = 10 * 60 * 1000 // 10 minutes
  private validatedTables: Set<string> = new Set()
  private invalidTables: Set<string> = new Set()

  /**
   * Validate if a table is accessible via API
   */
  async validateTableAccess(tableName: string): Promise<boolean> {
    // Check cache first
    if (this.validatedTables.has(tableName)) return true
    if (this.invalidTables.has(tableName)) return false

    try {
      // Try to fetch a minimal amount of data from the table
      const response = await GreApiService.getTableDataPaginated(`/${tableName}`, {
        offset: 0,
        limit: 1
      })
      
      // If we get here without error, the table is accessible
      this.validatedTables.add(tableName)
      this.invalidTables.delete(tableName)
      return true
    } catch (error) {
      console.warn(`Table ${tableName} is not accessible:`, error)
      this.invalidTables.add(tableName)
      this.validatedTables.delete(tableName)
      return false
    }
  }

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

      // Try to discover this table dynamically, but validate access first
      const isAccessible = await this.validateTableAccess(tableName)
      if (!isAccessible) {
        console.warn(`Table ${tableName} is not accessible, skipping configuration`)
        return null
      }

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
      return null // Don't create fallback configs for inaccessible tables
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
      
      // Filter schemas to only include accessible tables
      const accessibleSchemas = []
      for (const schema of tableSchemas.filter(s => newTables.includes(s.name))) {
        const isAccessible = await this.validateTableAccess(schema.name)
        if (isAccessible) {
          accessibleSchemas.push(schema)
        } else {
          console.warn(`Skipping inaccessible table: ${schema.name}`)
        }
      }
      
      // Create configs for accessible tables
      accessibleSchemas.forEach(schema => {
        const config = this.createDynamicConfig(schema)
        this.dynamicConfigs.set(schema.name, config)
      })
      
      this.lastDiscovery = Date.now()
      console.log(`Discovered ${this.dynamicConfigs.size} accessible dynamic tables (${tableSchemas.length - accessibleSchemas.length} tables skipped due to access issues)`)
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
    this.validatedTables.clear()
    this.invalidTables.clear()
    schemaService.clearCache()
  }

  /**
   * Clear validation cache only (useful for retrying failed tables)
   */
  clearValidationCache(): void {
    this.validatedTables.clear()
    this.invalidTables.clear()
  }

  /**
   * Get validation status for debugging
   */
  getValidationStatus(): { validated: string[], invalid: string[] } {
    return {
      validated: Array.from(this.validatedTables),
      invalid: Array.from(this.invalidTables)
    }
  }
}

// Export singleton instance
export const dynamicApiService = new DynamicApiConfigService()
export { DynamicApiConfigService }