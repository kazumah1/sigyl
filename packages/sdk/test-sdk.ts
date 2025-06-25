import { 
  connect, 
  connectDirect, 
  MCPConnectSDK, 
  searchPackages, 
  getPackage,
  invoke,
  registerMCP 
} from './src/index';

async function testSDK() {
  console.log('🧪 Testing Sigyl MCP SDK\n');

  const registryUrl = 'http://localhost:3000/api/v1';

  // Test 1: Search for packages
  console.log('1️⃣ Testing package search...');
  try {
    const searchResults = await searchPackages('text', ['nlp'], 5, 0, {
      registryUrl
    });
    console.log(`✅ Found ${searchResults.total} packages`);
    searchResults.packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name} - ${pkg.description || 'No description'}`);
    });
  } catch (error) {
    console.log('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 2: Get specific package details
  console.log('\n2️⃣ Testing get package details...');
  try {
    const packageData = await getPackage('text-summarizer', { registryUrl });
    console.log(`✅ Package: ${packageData.name}`);
    console.log(`   Description: ${packageData.description || 'No description'}`);
    console.log(`   Downloads: ${packageData.downloads_count}`);
    console.log(`   Tools: ${packageData.tools.map(t => t.tool_name).join(', ')}`);
    console.log(`   Deployments: ${packageData.deployments.length} active`);
  } catch (error) {
    console.log('❌ Get package failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 3: Connect to a tool from registry
  console.log('\n3️⃣ Testing connect to tool from registry...');
  try {
    const summarize = await connect('text-summarizer', 'summarize', {
      registryUrl,
      timeout: 10000
    });

    const result = await summarize({
      text: "The French Revolution was a period of radical social and political upheaval in France from 1789 to 1799. It led to the collapse of the Bourbon monarchy and the rise of radical political factions, culminating in the establishment of the French Consulate in 1799.",
      maxLength: 100
    });

    console.log('✅ Tool invocation result:', result);
  } catch (error) {
    console.log('❌ Connect to tool failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 4: Connect directly to a tool
  console.log('\n4️⃣ Testing direct tool connection...');
  try {
    const translate = await connectDirect('https://my-translation-service.onrender.com/translate', {
      timeout: 10000
    });

    const translation = await translate({
      text: "Hello world",
      targetLanguage: "es"
    });

    console.log('✅ Direct tool result:', translation);
  } catch (error) {
    console.log('❌ Direct connection failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 5: Using the SDK class
  console.log('\n5️⃣ Testing SDK class...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      timeout: 15000
    });

    // Search with SDK class
    const results = await sdk.searchPackages('text', ['nlp'], 3);
    console.log(`✅ SDK search found ${results.packages.length} packages`);

    // Try to connect to all tools in first package
    if (results.packages.length > 0) {
      const firstPackage = results.packages[0];
      console.log(`🛠️ Attempting to connect to all tools in ${firstPackage.name}...`);
      
      try {
        const allTools = await sdk.connectAll(firstPackage.name);
        console.log(`✅ Connected to ${Object.keys(allTools).length} tools:`, Object.keys(allTools));
        
        // Test one of the tools
        const toolNames = Object.keys(allTools);
        if (toolNames.length > 0) {
          const firstTool = allTools[toolNames[0]];
          const toolResult = await firstTool({ text: "Test input" });
          console.log(`✅ Tool ${toolNames[0]} result:`, toolResult);
        }
      } catch (error) {
        console.log(`❌ Failed to connect to tools in ${firstPackage.name}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  } catch (error) {
    console.log('❌ SDK class test failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 6: Manual tool invocation
  console.log('\n6️⃣ Testing manual tool invocation...');
  try {
    const result = await invoke('https://my-tool.com/summarize', {
      text: "This is a test text for manual invocation"
    });
    console.log('✅ Manual invocation result:', result);
  } catch (error) {
    console.log('❌ Manual invocation failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 7: Register a new package (requires API key)
  console.log('\n7️⃣ Testing package registration...');
  try {
    const newPackage = await registerMCP({
      name: 'test-sdk-package',
      description: 'A test package created by the SDK',
      tags: ['test', 'sdk'],
      tools: [{
        tool_name: 'test',
        description: 'A test tool',
        input_schema: { text: 'string' },
        output_schema: { result: 'string' }
      }]
    }, undefined, { registryUrl }); // No API key for this test

    console.log('✅ Package registered:', newPackage.name);
  } catch (error) {
    console.log('❌ Package registration failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n🎉 SDK testing completed!');
}

// Run the tests
testSDK().catch(console.error); 