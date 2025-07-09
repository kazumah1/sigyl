import { supabase } from '../config/database';

async function fixWeatherMCPUrl() {
  try {
    console.log('🔧 Fixing weather MCP URL in database...');
    
    const newUrl = 'https://sigyl-mcp-sigyl-dev-weather-lrzo3avokq-uc.a.run.app';
    const mcpEndpoint = `${newUrl}/mcp`;
    
    // Update the mcp_packages table
    const { data: packages, error: packagesError } = await supabase
      .from('mcp_packages')
      .update({
        source_api_url: newUrl,
        updated_at: new Date().toISOString()
      })
      .or('name.eq.weather,source_api_url.like.%weather%')
      .select();
    
    if (packagesError) {
      console.error('❌ Error updating packages:', packagesError);
      return;
    }
    
    console.log('✅ Updated packages:', packages);
    
    // Update the deployments table  
    const { data: deployments, error: deploymentsError } = await supabase
      .from('deployments')
      .update({
        deployment_url: newUrl,
        health_check_url: mcpEndpoint,
        status: 'active',
        last_health_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .or('deployment_url.like.%weather%,repo_name.like.%weather%')
      .select();
    
    if (deploymentsError) {
      console.error('❌ Error updating deployments:', deploymentsError);
      return;
    }
    
    console.log('✅ Updated deployments:', deployments);
    
    // Test the endpoint
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
    
    console.log('🎉 Weather MCP URL fix completed!');
    console.log(`📍 New URL: ${newUrl}`);
    console.log(`🔗 MCP Endpoint: ${mcpEndpoint}`);
    
  } catch (error) {
    console.error('❌ Error fixing weather MCP URL:', error);
  }
}

fixWeatherMCPUrl(); 