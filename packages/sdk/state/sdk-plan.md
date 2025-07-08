import { SigylSDK } from "@sigyl/sdk"
import { searchMCP } from "@sigyl/sdk"
import { getMCP } from "@sigyl/sdk"
import { getAllServers, getMCPUrl, semanticMCP, semanticTools } from "@sigyl/sdk"

const sdk = new SigylSDK({
  registryUrl: 'http://localhost:3000/api/v1'
});

| `SigylSDK`      | 	**COMPLETE & TESTED**             | 

const results = await searchMCP('text', ['nlp'], 10);

const details = await getMCP('my-mcp-server');

const details = await sdk.getMCP('my-mcp-server');

const allServers = await sdk.getAllServers();

const url = await sdk.getMCPUrl('my-mcp-server');

const servers = await sdk.semanticMCP('OCR and PDF tools', 3);

const tools = await sdk.semanticTools('extract text from images', 5);