// without the router

import { openai } from '@ai-sdk/openai';
import { experimental_createMCPClient as createMCPClient, generateText, tool } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

//clear the oauth folder
// rmSync(join(homedir(), '.mcp-auth'), { recursive: true, force: true });

const docsClient = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'npx',
    args: ['mcp-remote', 'https://docs.mcp.cloudflare.com/sse'],
  }),
});

const browserClient = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'npx',
    args: ['mcp-remote', 'https://browser.mcp.cloudflare.com/sse'],
  }),
});

const radarClient = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'npx',
    args: ['mcp-remote', 'https://radar.mcp.cloudflare.com/sse'],
  }),
});

const docsTools = await docsClient.tools();
const browserTools = await browserClient.tools();
const radarTools = await radarClient.tools();

const tools = {
  ...docsTools,
  ...browserTools,
  ...radarTools,
};

console.log(`There are ${Object.keys(tools).length} tools`);

const { text } = await generateText({
  model: openai('gpt-4.1'),
  prompt: 'What are the most used operating systems from 2020 till present?',
  tools,
  maxSteps: 10,
  onStepFinish: (step) => {
    // log each tool calls and the tool results
    console.log(JSON.stringify(step.toolCalls, null, 6));
    console.log(JSON.stringify(step.toolResults, null, 6));
  },
});

await radarClient.close();
await browserClient.close();
await docsClient.close();

console.log(text);

// stop the processes
process.exit(0);
