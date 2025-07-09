import { supabase } from '../config/database';

async function registerWeatherMCP() {
  try {
    console.log('📝 Registering weather MCP in database...');
    
    const deploymentUrl = 'https://sigyl-mcp-sigyl-dev-weather-lrzo3avokq-uc.a.run.app';
    const mcpEndpoint = `${deploymentUrl}/mcp`;
    
    // 1. Check if package already exists
    const { data: existingPackage } = await supabase
      .from('mcp_packages')
      .select('*')
      .or('name.eq.weather,name.eq.sigyl-dev/weather')
      .single();
    
    if (existingPackage) {
      console.log('📦 Found existing package, updating...', existingPackage.id);
      
      // Update existing package
      const { data: updatedPackage, error: updateError } = await supabase
        .from('mcp_packages')
        .update({
          source_api_url: deploymentUrl,
          service_name: 'sigyl-mcp-sigyl-dev-weather',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPackage.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating package:', updateError);
        return;
      }
      
      console.log('✅ Updated package:', updatedPackage);
    } else {
      console.log('📦 Creating new weather package...');
      
      // Create new package
      const { data: newPackage, error: createError } = await supabase
        .from('mcp_packages')
        .insert({
          name: 'sigyl-dev/weather',
          version: '1.0.0',
          description: 'Weather MCP server providing current weather, forecasts, and alerts for US locations',
          source_api_url: deploymentUrl,
          service_name: 'sigyl-mcp-sigyl-dev-weather',
          tags: ['weather', 'forecast', 'alerts', 'climate'],
          downloads_count: 0,
          required_secrets: [
            {
              name: 'WEATHER_API_KEY',
              description: 'API key for weather service'
            }
          ]
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating package:', createError);
        return;
      }
      
      console.log('✅ Created package:', newPackage);
      
      // 2. Create deployment record
      console.log('🚀 Creating deployment record...');
      
      const { data: deployment, error: deploymentError } = await supabase
        .from('mcp_deployments')
        .insert({
          package_id: newPackage.id,
          deployment_url: deploymentUrl,
          status: 'active',
          health_check_url: mcpEndpoint,
          repo_url: 'https://github.com/sigyl-dev/weather',
          repo_name: 'sigyl-dev/weather',
          branch: 'main',
          env: { NODE_ENV: 'production', MCP_TRANSPORT: 'http' },
          last_health_check: new Date().toISOString()
        })
        .select()
        .single();
      
      if (deploymentError) {
        console.error('❌ Error creating deployment:', deploymentError);
        return;
      }
      
      console.log('✅ Created deployment:', deployment);
      
      // 3. Add tool records
      console.log('🛠️ Adding tool records...');
      
      const tools = [
        {
          package_id: newPackage.id,
          tool_name: 'get_current_weather',
          description: 'Get current weather for a US location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'US location' }
            },
            required: ['location']
          }
        },
        {
          package_id: newPackage.id,
          tool_name: 'get_forecast',
          description: 'Get weather forecast for a US location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'US location' }
            },
            required: ['location']
          }
        },
        {
          package_id: newPackage.id,
          tool_name: 'get_alerts',
          description: 'Get weather alerts for a US location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'US location' }
            },
            required: ['location']
          }
        },
        {
          package_id: newPackage.id,
          tool_name: 'find_weather_stations',
          description: 'Find nearby weather stations',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'US location' }
            },
            required: ['location']
          }
        },
        {
          package_id: newPackage.id,
          tool_name: 'get_local_time',
          description: 'Get local time for a location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'Location coordinates' }
            },
            required: ['location']
          }
        }
      ];
      
      const { data: createdTools, error: toolsError } = await supabase
        .from('mcp_tools')
        .insert(tools)
        .select();
      
      if (toolsError) {
        console.error('❌ Error creating tools:', toolsError);
        return;
      }
      
      console.log('✅ Created tools:', createdTools?.length, 'tools');
    }
    
    // 4. Test the endpoint
    console.log('🔍 Testing MCP endpoint...');
    try {
      const response = await fetch(mcpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { roots: { listChanged: false } },
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ MCP endpoint test successful:', result);
      } else {
        console.log('⚠️ MCP endpoint test failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('⚠️ MCP endpoint test error:', error);
    }
    
    console.log('🎉 Weather MCP registration completed!');
    console.log(`📍 Deployment URL: ${deploymentUrl}`);
    console.log(`🔗 MCP Endpoint: ${mcpEndpoint}`);
    console.log('📱 The weather MCP should now be available for Claude Desktop');
    
  } catch (error) {
    console.error('❌ Error registering weather MCP:', error);
  }
}

registerWeatherMCP(); 