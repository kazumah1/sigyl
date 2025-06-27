---
title: "Building Your First MCP Integration: A Complete Guide"
excerpt: "Learn how to create your first Model Context Protocol integration from scratch, including setup, configuration, and deployment best practices."
author: "Sarah Chen"
date: "2024-01-18"
readTime: "12 min read"
category: "tutorials"
tags: ["tutorials", "beginner"]
---

# Building Your First MCP Integration: A Complete Guide

The Model Context Protocol (MCP) is revolutionizing how AI applications interact with external data and tools. In this comprehensive guide, we'll walk through creating your first MCP integration from scratch.

## What is MCP?

The Model Context Protocol is an open standard that enables AI applications to securely access external data sources and tools. Think of it as a standardized way for AI models to "talk" to your databases, APIs, and services.

## Prerequisites

Before we begin, make sure you have:

- **Node.js 18+** installed
- **Git** for version control
- **A GitHub account** for hosting your MCP server
- **Basic knowledge of TypeScript** (helpful but not required)

## Step 1: Project Setup

Let's start by creating a new MCP server project:

```bash
# Create a new directory
mkdir my-first-mcp
cd my-first-mcp

# Initialize a new Node.js project
npm init -y

# Install MCP dependencies
npm install @modelcontextprotocol/sdk typescript @types/node
npm install --save-dev ts-node nodemon
```

## Step 2: Create Your MCP Server

Create a `src/server.ts` file:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Define your tool schema
const getWeatherSchema = {
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name or coordinates",
      },
    },
    required: ["location"],
  },
};

// Create the server
const server = new Server(
  {
    name: "my-first-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [getWeatherSchema],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_weather") {
    const { location } = args as { location: string };
    
    // Simulate weather API call
    const weather = await fetchWeather(location);
    
    return {
      content: [
        {
          type: "text",
          text: `Current weather in ${location}: ${weather.description}, ${weather.temperature}°C`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("MCP server running on stdio");
```

## Step 3: Add Configuration

Create a `mcp.yaml` file in your project root:

```yaml
name: my-first-mcp-server
description: A simple MCP server that provides weather information
version: 1.0.0
tools:
  - name: get_weather
    description: Get current weather for a location
    inputSchema:
      type: object
      properties:
        location:
          type: string
          description: City name or coordinates
      required:
        - location
secrets:
  - name: WEATHER_API_KEY
    description: API key for weather service
    required: true
    type: string
```

## Step 4: Deploy with SIGYL

Now let's deploy your MCP server using SIGYL:

```bash
# Install SIGYL CLI
npm install -g @sigyl/cli

# Authenticate with GitHub
sigyl auth github

# Deploy your MCP server
sigyl deploy .
```

## Step 5: Test Your Integration

Once deployed, you can test your MCP server:

```typescript
// Test script
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({
  server: "https://your-deployment-url.sigyl.app",
});

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call your weather tool
const result = await client.callTool({
  name: "get_weather",
  arguments: { location: "San Francisco" },
});

console.log("Weather result:", result);
```

## Best Practices

### 1. Error Handling

Always implement proper error handling in your MCP server:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // Your tool logic here
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});
```

### 2. Input Validation

Validate all inputs before processing:

```typescript
import { z } from "zod";

const weatherInputSchema = z.object({
  location: z.string().min(1, "Location is required"),
});

// In your tool handler
const validatedArgs = weatherInputSchema.parse(args);
```

### 3. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

## Advanced Features

### Environment Variables

Use environment variables for configuration:

```typescript
const apiKey = process.env.WEATHER_API_KEY;
if (!apiKey) {
  throw new Error("WEATHER_API_KEY environment variable is required");
}
```

### Logging

Add comprehensive logging:

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});
```

## Next Steps

Now that you have a basic MCP server running, consider adding:

1. **More Tools**: Add additional functionality like database queries, API integrations
2. **Authentication**: Implement proper authentication for your tools
3. **Caching**: Add caching for frequently requested data
4. **Monitoring**: Set up monitoring and alerting for your MCP server

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [SIGYL Documentation](https://docs.sigyl.dev)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)

---

*Ready to build something amazing? Start with this guide and share your MCP server with the community!* 