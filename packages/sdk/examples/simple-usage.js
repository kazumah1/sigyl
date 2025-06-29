"use strict";
// Example: How a developer would use the Sigyl MCP SDK in their project
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
function myApp() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Discover available tools
        console.log('🔍 Discovering available text processing tools...');
        const textTools = yield (0, index_1.searchPackages)('text', ['nlp'], 10);
        console.log(`Found ${textTools.total} text processing tools:`);
        textTools.packages.forEach((pkg) => {
            console.log(`- ${pkg.name}: ${pkg.description}`);
        });
        // 2. Get details about a specific tool
        if (textTools.packages.length > 0) {
            const firstTool = textTools.packages[0];
            console.log(`\n📦 Getting details for ${firstTool.name}...`);
            const details = yield (0, index_1.getPackage)(firstTool.name);
            console.log(`Available tools: ${details.tools.map((t) => t.tool_name).join(', ')}`);
            console.log(`Active deployments: ${details.deployments.filter((d) => d.status === 'active').length}`);
        }
        // 3. Connect to and use a specific tool
        console.log('\n🛠️ Connecting to text summarizer...');
        try {
            const summarize = yield (0, index_1.connect)('text-summarizer', 'summarize');
            const longText = `
      Artificial Intelligence (AI) is a branch of computer science that aims to create 
      intelligent machines that work and react like humans. Some of the activities 
      computers with artificial intelligence are designed for include speech recognition, 
      learning, planning, and problem solving. AI has been used in various fields 
      including healthcare, finance, transportation, and entertainment.
    `;
            const summary = yield summarize({
                text: longText,
                maxLength: 50
            });
            console.log('📝 Summary:', summary);
        }
        catch (error) {
            console.log('❌ Failed to use summarizer:', error instanceof Error ? error.message : 'Unknown error');
        }
    });
}
// Run the example
myApp().catch(console.error);
