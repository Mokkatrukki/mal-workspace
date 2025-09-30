import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  client?: Client;
}

export class MCPManager {
  private servers: Map<string, MCPServer> = new Map();

  async connectServer(config: MCPServer): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    const client = new Client(
      {
        name: `mal-chat-${config.name}`,
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    config.client = client;
    this.servers.set(config.name, config);

    console.log(`✓ Connected to ${config.name} MCP server`);
  }

  async connectAll(servers: MCPServer[]): Promise<void> {
    for (const server of servers) {
      try {
        await this.connectServer(server);
      } catch (error) {
        console.error(`✗ Failed to connect to ${server.name}:`, error);
      }
    }
  }

  async callTool(serverName: string, toolName: string, args?: Record<string, unknown>): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server?.client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    const result = await server.client.callTool({
      name: toolName,
      arguments: args || {},
    });

    return result;
  }

  async listTools(serverName: string): Promise<any[]> {
    const server = this.servers.get(serverName);
    if (!server?.client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    const result = await server.client.listTools();
    return result.tools;
  }

  async listAllTools(): Promise<Map<string, any[]>> {
    const allTools = new Map<string, any[]>();

    for (const [name, server] of this.servers) {
      if (server.client) {
        try {
          const tools = await this.listTools(name);
          allTools.set(name, tools);
        } catch (error) {
          console.error(`Error listing tools for ${name}:`, error);
        }
      }
    }

    return allTools;
  }

  getServer(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  async close(): Promise<void> {
    for (const server of this.servers.values()) {
      if (server.client) {
        await server.client.close();
      }
    }
    this.servers.clear();
  }
}