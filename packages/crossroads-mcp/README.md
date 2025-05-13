# Crossroads MCP

> A lightweight, flexible router for MCP (Model Context Protocol) servers, inspired by Hono router and a chat with @threepointone.

If you have a lot of MCP servers, this is for you. `crossroads-mcp` provides an elegant way to manage multiple MCP servers while using the AI SDK. Ensuring that only the server being used is running at any given time.

## Features

- 🚀 **Simple Router API** - Manage multiple MCP servers with an intuitive API
- 🔄 **Dynamic Server Management** - Start and stop servers on demand during AI conversations
- 🧰 **Tool Integration** - Seamlessly integrate tools from multiple MCP servers
- 🔌 **Multiple Transport Options** - Support for both stdio and remote MCP servers

## Installation

```bash
# Using pnpm
pnpm add crossroads-mcp

# Using npm
npm install crossroads-mcp

# Using yarn
yarn add crossroads-mcp
```

## Quick Start

```typescript
import { createMCPRouter } from "crossroads-mcp";
import { OpenAI } from "ai";

// Create a new MCP router
const router = createMCPRouter();

// Add MCP servers to the router
router.addServer({
  name: "search-server",
  description: "A server that provides search functionality",
  command: "node",
  args: ["./search-server.js"],
});

router.addServer({
  name: "weather-server",
  description: "A server that provides weather information",
  command: "node",
  args: ["./weather-server.js"],
});

const result = await router.generateText({
  model: openai("gpt-4o"),
  prompt:
    router.systemPrompt() +
    "Search for recent news about AI and tell me about the weather in New York",
  maxSteps: 10,
});

console.log(result.text);
```

## API Reference

### Creating a Router

```typescript
import { createMCPRouter } from "crossroads-mcp";

// Create a new MCP router
const router = createMCPRouter();

// Or initialize with predefined servers
const router = createMCPRouter({
  servers: {
    "my-server": {
      name: "my-server",
      description: "My MCP server",
      command: "node",
      args: ["./my-server.js"],
    },
  },
});
```

### Adding Servers

```typescript
// Add a stdio MCP server
router.addServer({
  name: "stdio-server",
  description: "A server that runs locally",
  command: "node",
  args: ["./mcp-server.js"],
});

// Add a remote MCP server
router.addServer({
  name: "remote-server",
  description: "A server that runs remotely",
  url: "https://example.com/mcp",
  headers: {
    Authorization: "Bearer token",
  },
});
```

### Generating Text

```typescript
const result = await router.generateText({
  model: "gpt-4o",
  prompt: "Help me with my task",
  systemPrompt: router.systemPrompt(),
  maxSteps: 5,
  onStepFinish: (step) => {
    console.log("Step finished", step);
  },
});
```

### Server Management

```typescript
// Manually start a server
await router.startServer("my-server");

// Get all active tools from running servers
const tools = await router.getActiveTools();

// Stop all active servers
await router.stopActiveClients();
```
