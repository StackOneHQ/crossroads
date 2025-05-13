import {
  type CoreMessage,
  type Tool,
  experimental_createMCPClient as createMCPClient,
  generateText,
  tool,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { z } from 'zod';

export type BaseMCPServerConfig = {
  name: string;
  description: string;
};

export type StdioMCPServerConfig = BaseMCPServerConfig & {
  command: string;
  args: string[];
};

export type RemoteMCPServerConfig = BaseMCPServerConfig & {
  url: string;
  headers?: Record<string, string>;
};

export type MCPServerConfig = StdioMCPServerConfig | RemoteMCPServerConfig;

// need this because the ai sdk doesnt export the MCPClient type
type MCPClient = {
  close: () => Promise<void>;
  tools: () => Promise<Record<string, Tool>>;
};

export type MCPState = {
  servers: Record<string, MCPServerConfig>;
  activeClients: MCPClient[];
};

type GenerateTextOptions = Parameters<typeof generateText>[0];
type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>;

export type MCPRouter = {
  systemPrompt: () => string;
  addServer: (config: MCPServerConfig) => MCPRouter;
  generateText: (options: GenerateTextOptions) => Promise<GenerateTextResponse>;
  startServer: (serverName: string) => Promise<void>;
  stopActiveClients: () => Promise<void>;
  getActiveTools: () => Promise<Record<string, Tool>>;
};

export class MCPRouterClass implements MCPRouter {
  private state: MCPState;

  constructor(config?: { servers?: Record<string, MCPServerConfig> }) {
    this.state = {
      servers: config?.servers || {},
      activeClients: [],
    };
  }

  private startMCPServerTool: Tool = tool({
    description:
      'Start an MCP server by name to use its tools in the next step. Do not ask the user to start this tool, just use it.',
    parameters: z.object({
      serverName: z.string().describe('The name of the MCP server to start'),
    }),
    execute: async ({ serverName }) => {
      if (!this.state.servers[serverName]) {
        return { success: false, error: `Server "${serverName}" not found` };
      }

      try {
        await this.startServer(serverName);
      } catch (error) {
        return `${error}`;
      }

      return `Server "${serverName}" was successfully started`;
    },
  });

  private updateState(updater: (state: MCPState) => MCPState): void {
    this.state = updater(this.state);
  }

  private async getActiveToolsInternal(): Promise<Record<string, Tool>> {
    const tools = await Promise.all(this.state.activeClients.map((client) => client.tools()));
    return Object.assign({}, ...tools);
  }

  systemPrompt(): string {
    return `You are an AI assistant that can help you with various tasks.You have several external tools servers you can call to help you with your task.
    These are called MCP servers. They are like plugins to AI applications. 

    Here are the servers you have available to you:
    ${Object.values(this.state.servers)
      .map((server) => `${server.name}: ${server.description}`)
      .join('\n')}
      
    To use one of these servers call the \`start_mcp_server\` tool with the name of the server you want to use. Do not ask to call this tool, just use it.`;
  }

  addServer(config: MCPServerConfig): MCPRouter {
    this.updateState((state) => ({
      ...state,
      servers: {
        ...state.servers,
        [config.name]: config,
      },
    }));
    return this;
  }

  async startServer(serverName: string): Promise<void> {
    if (!this.state.servers[serverName]) {
      throw new Error(`Server "${serverName}" not found`);
    }

    const config = this.state.servers[serverName];

    let client: MCPClient;
    if ('command' in config) {
      // Create a new MCP client
      client = await createMCPClient({
        transport: new StdioMCPTransport({
          command: config.command,
          args: config.args,
        }),
      });
    } else {
      // Create a new MCP client
      client = await createMCPClient({
        transport: {
          type: 'sse',
          url: config.url,
          headers: config.headers,
        },
      });
    }

    this.updateState((state) => ({
      ...state,
      activeClients: [...state.activeClients, client],
    }));
  }

  async getActiveTools(): Promise<Record<string, Tool>> {
    return this.getActiveToolsInternal();
  }

  async stopActiveClients(): Promise<void> {
    for (const client of this.state.activeClients) {
      await client.close();
    }

    this.updateState((state) => ({ ...state, activeClients: [] }));
  }

  async updateMessages(
    messages: CoreMessage[],
    options: GenerateTextOptions
  ): Promise<CoreMessage[]> {
    if (options.prompt) {
      const prompt = options.prompt;
      options.prompt = undefined;
      return [
        {
          role: 'user',
          content: prompt,
        },
        ...messages,
      ];
    }

    return [...(options.messages || []), ...messages] as CoreMessage[];
  }

  async generateText(options: GenerateTextOptions): Promise<GenerateTextResponse> {
    const userOnStepFinish = options.onStepFinish;
    let stepCount = 0;

    const baseTools: Record<string, Tool> = {
      start_mcp_server: {
        description: this.startMCPServerTool.description,
        parameters: this.startMCPServerTool.parameters,
      },
      ...(await this.getActiveToolsInternal()),
      ...(options.tools || {}),
    };

    const addToStepCount = () => {
      stepCount += 1;
    };

    const modifiedOptions: GenerateTextOptions = {
      ...options,
      tools: baseTools,
      onStepFinish: (step) => {
        addToStepCount();

        if (userOnStepFinish) {
          userOnStepFinish(step);
        }
      },
    };

    let result: GenerateTextResponse;

    try {
      while (true) {
        result = await generateText(modifiedOptions);

        if (
          stepCount < (options.maxSteps || 1) &&
          result.finishReason === 'tool-calls' &&
          result.toolCalls.filter((call) => call.toolName === 'start_mcp_server').length > 0
        ) {
          const toolCall = result.toolCalls.find((call) => call.toolName === 'start_mcp_server');
          if (!toolCall) {
            throw new Error('No tool call found');
          }

          if (!this.startMCPServerTool || !this.startMCPServerTool.execute) {
            throw new Error('startMCPServerTool not found');
          }
          // call the tool
          const toolResult = await this.startMCPServerTool.execute(
            {
              serverName: toolCall.args.serverName,
            },
            {
              toolCallId: toolCall.toolCallId,
              messages: [],
            }
          );

          const newTools = await this.getActiveToolsInternal();
          modifiedOptions.tools = { ...baseTools, ...newTools };
          modifiedOptions.maxSteps = (options.maxSteps || 1) - stepCount;

          const newMessages: CoreMessage[] = [
            ...result.response.messages,
            {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  result: toolResult,
                },
              ],
            },
          ];

          modifiedOptions.messages = await this.updateMessages(newMessages, modifiedOptions);
        } else break;
      }

      return result;
    } catch (error) {
      console.error('Error generating text', error);
      throw error;
    } finally {
      // Clean up resources when done
      await this.stopActiveClients();
    }
  }
}

export const createMCPRouter = (config?: {
  servers?: Record<string, MCPServerConfig>;
}): MCPRouter => {
  return new MCPRouterClass(config);
};
