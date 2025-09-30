import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { MCPManager, MCPServer } from './mcp-client.js';

const MCP_SERVERS: MCPServer[] = [
  {
    name: 'anime-search',
    command: 'node',
    args: ['../mcp-servers/anime-search-mcp/build/server.js'],
  },
  {
    name: 'mal-user',
    command: 'node',
    args: ['../mcp-servers/mal-user-mcp/build/server.js'],
  },
  {
    name: 'recommendation',
    command: 'node',
    args: ['../mcp-servers/anime-recommendation-mcp/build/server.js'],
    env: {
      USER_DB_PATH: '/home/mokka/projektit/mal-workspace/mcp-servers/anime-recommendation-mcp/data/users.db'
    }
  },
];

class ChatClient {
  private mcpManager: MCPManager;
  private running = true;

  constructor() {
    this.mcpManager = new MCPManager();
  }

  async init(): Promise<void> {
    console.log(chalk.blue.bold('\n🎌 MAL Chat Client\n'));

    const spinner = ora('Connecting to MCP servers...').start();

    try {
      await this.mcpManager.connectAll(MCP_SERVERS);
      spinner.succeed('Connected to all MCP servers');
    } catch (error) {
      spinner.fail('Failed to connect to some servers');
      console.error(error);
    }

    await this.showAvailableTools();
  }

  async showAvailableTools(): Promise<void> {
    console.log(chalk.yellow('\n📋 Available Tools:\n'));

    const allTools = await this.mcpManager.listAllTools();

    for (const [serverName, tools] of allTools) {
      console.log(chalk.cyan(`\n${serverName}:`));
      tools.forEach((tool: any) => {
        console.log(`  • ${tool.name}: ${tool.description || 'No description'}`);
      });
    }
    console.log();
  }

  async chat(): Promise<void> {
    while (this.running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🔍 Search anime', value: 'search' },
            { name: '⭐ Get recommendations', value: 'recommend' },
            { name: '📊 Get seasonal anime', value: 'seasonal' },
            { name: '🎭 Get genres', value: 'genres' },
            { name: '👤 User operations (MAL)', value: 'user' },
            { name: '🔧 List all tools', value: 'tools' },
            { name: '❌ Exit', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'search':
          await this.searchAnime();
          break;
        case 'recommend':
          await this.getRecommendations();
          break;
        case 'seasonal':
          await this.getSeasonalAnime();
          break;
        case 'genres':
          await this.getGenres();
          break;
        case 'user':
          await this.userOperations();
          break;
        case 'tools':
          await this.showAvailableTools();
          break;
        case 'exit':
          this.running = false;
          break;
      }
    }

    await this.cleanup();
  }

  async searchAnime(): Promise<void> {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search for anime:',
      },
    ]);

    const spinner = ora('Searching...').start();

    try {
      const result = await this.mcpManager.callTool('anime-search', 'searchAnime', { query });
      spinner.stop();
      console.log(chalk.green('\n✓ Results:\n'));
      console.log(result.content[0].text);
    } catch (error) {
      spinner.fail('Search failed');
      console.error(error);
    }
  }

  async getRecommendations(): Promise<void> {
    const { genres, minScore } = await inquirer.prompt([
      {
        type: 'input',
        name: 'genres',
        message: 'Enter genres (comma-separated, optional):',
      },
      {
        type: 'number',
        name: 'minScore',
        message: 'Minimum score (0-10):',
        default: 7,
      },
    ]);

    const spinner = ora('Getting recommendations...').start();

    try {
      const args: any = { limit: 10 };
      if (genres) args.genres = genres;
      if (minScore) args.minScore = minScore;

      const result = await this.mcpManager.callTool('recommendation', 'getRecommendations', args);
      spinner.stop();
      console.log(chalk.green('\n✓ Recommendations:\n'));
      console.log(result.content[0].text);
    } catch (error) {
      spinner.fail('Failed to get recommendations');
      console.error(error);
    }
  }

  async getSeasonalAnime(): Promise<void> {
    const spinner = ora('Getting seasonal anime...').start();

    try {
      const result = await this.mcpManager.callTool('anime-search', 'getSeasonalAnimeRecommendations', {});
      spinner.stop();
      console.log(chalk.green('\n✓ Seasonal Anime:\n'));
      console.log(result.content[0].text);
    } catch (error) {
      spinner.fail('Failed to get seasonal anime');
      console.error(error);
    }
  }

  async getGenres(): Promise<void> {
    const spinner = ora('Getting genres...').start();

    try {
      const result = await this.mcpManager.callTool('anime-search', 'getAnimeGenres', {});
      spinner.stop();
      console.log(chalk.green('\n✓ Genres:\n'));
      console.log(result.content[0].text);
    } catch (error) {
      spinner.fail('Failed to get genres');
      console.error(error);
    }
  }

  async userOperations(): Promise<void> {
    console.log(chalk.yellow('\n👤 MAL User Operations'));
    console.log('(Note: Requires MAL OAuth authentication)');

    const { operation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'operation',
        message: 'Choose operation:',
        choices: [
          { name: 'Get my anime list', value: 'list' },
          { name: 'Update anime status', value: 'update' },
          { name: 'Back', value: 'back' },
        ],
      },
    ]);

    if (operation === 'back') return;

    // Implement user operations based on mal-user-mcp capabilities
    console.log(chalk.yellow('User operations require OAuth setup. Check mal-user-mcp docs.'));
  }

  async cleanup(): Promise<void> {
    console.log(chalk.blue('\n👋 Closing connections...\n'));
    await this.mcpManager.close();
  }
}

// Main
const client = new ChatClient();
client.init().then(() => client.chat()).catch(console.error);