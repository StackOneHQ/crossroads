// with the router

import { openai } from '@ai-sdk/openai';
import { createMCPRouter } from '../src';

const app = createMCPRouter();

app
  .addServer({
    name: 'docs',
    description: 'Use this tool to get information about documentation',
    command: 'npx',
    args: ['mcp-remote', 'https://docs.mcp.cloudflare.com/sse'],
  })
  .addServer({
    name: 'browser',
    description: 'Use this tool to interact with browser capabilities',
    command: 'npx',
    args: ['mcp-remote', 'https://browser.mcp.cloudflare.com/sse'],
  })
  .addServer({
    name: 'radar',
    description: 'Use this tool to get Cloudflare Radar statistics and data',
    command: 'npx',
    args: ['mcp-remote', 'https://radar.mcp.cloudflare.com/sse'],
  });

// Start a multi-step conversation
const result = await app.generateText({
  model: openai('gpt-4.1'),
  prompt: `${app.systemPrompt()}\n\nWhat are the most used operating systems in the last 10 years?`,
  maxSteps: 10,
});

console.log('RESULT', result.text);

// Ensure we close the process
process.exit(0);
