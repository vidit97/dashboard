// Test script to verify dynamic schema discovery
import { schemaService } from '../src/services/schemaService'
import { dynamicApiService } from '../src/services/dynamicApiService'

async function testDynamicDiscovery() {
  console.log('Testing dynamic schema discovery...')
  
  try {
    // Test 1: Schema fetching
    console.log('\n1. Testing schema fetching...')
    const schema = await schemaService.fetchSchema()
    if (schema) {
      console.log('✅ Schema fetched successfully')
      console.log(`   OpenAPI version: ${schema.openapi}`)
      console.log(`   Paths found: ${Object.keys(schema.paths || {}).length}`)
    } else {
      console.log('❌ Failed to fetch schema')
    }

    // Test 2: Table discovery
    console.log('\n2. Testing table discovery...')
    const tables = await schemaService.discoverTables()
    console.log(`✅ Discovered ${tables.length} tables:`)
    tables.slice(0, 10).forEach(table => console.log(`   - ${table}`))
    if (tables.length > 10) {
      console.log(`   ... and ${tables.length - 10} more`)
    }

    // Test 3: Dynamic config creation
    console.log('\n3. Testing dynamic configuration...')
    const allConfigs = await dynamicApiService.getAllTableConfigs()
    const configCount = Object.keys(allConfigs).length
    console.log(`✅ Generated ${configCount} table configurations`)
    
    // Show a few examples
    Object.entries(allConfigs).slice(0, 5).forEach(([name, config]) => {
      console.log(`   - ${name}: ${config.allColumns.length} columns ${config.isDynamic ? '(dynamic)' : '(static)'}`)
    })

    // Test 4: Categories
    console.log('\n4. Testing categorization...')
    const categories = await dynamicApiService.getCategorizedTables()
    console.log('✅ Table categories:')
    Object.entries(categories).forEach(([category, tableList]) => {
      console.log(`   - ${category}: ${tableList.length} tables`)
    })

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDynamicDiscovery().then(() => {
  console.log('\nDynamic discovery test completed!')
}).catch(console.error)