#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { PatternDiscoveryTools } from './tools/patternTools.js';
import { UserProfileTools } from './tools/profileTools.js';
import { getSQLiteDB } from './database/sqlite.js';

class AnimeRecommendationMCPServer {
  private server: McpServer;
  private patternTools: PatternDiscoveryTools;
  private profileTools: UserProfileTools;

  constructor() {
    this.server = new McpServer({
      name: 'anime-recommendation-mcp',
      version: '1.0.0',
      description: 'Anime recommendation server with interactive pattern discovery and user taste profiling',
    });

    this.patternTools = new PatternDiscoveryTools();
    this.profileTools = new UserProfileTools();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // Register all pattern discovery tools
    const patternTools = this.patternTools.getTools();
    for (const tool of patternTools) {
      this.server.tool(
        tool.name,
        tool.description || '',
        tool.inputSchema?.properties || {},
        async (args: any) => {
          try {
            const result = await this.patternTools.handleToolCall(tool.name, args);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: error.message || 'Unknown error',
                  tool: tool.name
                }, null, 2)
              }],
              isError: true,
            };
          }
        }
      );
    }

    // Register all profile tools
    const profileTools = this.profileTools.getTools();
    for (const tool of profileTools) {
      this.server.tool(
        tool.name,
        tool.description || '',
        tool.inputSchema?.properties || {},
        async (args: any) => {
          try {
            const result = await this.profileTools.handleToolCall(tool.name, args);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: error.message || 'Unknown error',
                  tool: tool.name
                }, null, 2)
              }],
              isError: true,
            };
          }
        }
      );
    }
  }

  private setupErrorHandling() {
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup() {
    try {
      const sqliteDb = getSQLiteDB();
      await sqliteDb.close();

      console.log('SQLite database connection closed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async run() {
    console.log('Starting Anime Recommendation MCP Server...');

    // Initialize SQLite database
    try {
      const sqliteDb = getSQLiteDB();
      await sqliteDb.initialize();
      console.log('✅ SQLite database initialized');
      console.log('✅ Ready to use anime-search-mcp for anime data access');

    } catch (error) {
      console.error('❌ SQLite database initialization failed:', error);
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ Anime Recommendation MCP Server running on stdio');
  }
}

const server = new AnimeRecommendationMCPServer();
server.run().catch(console.error);