/**
 * Generate test data for analytics
 */

import { AnalyticsLogger } from './logger.js';

async function generateTestData() {
  const logger = new AnalyticsLogger('test-mcp');
  const sessionId = AnalyticsLogger.generateSessionId();

  console.log('Generating test analytics data...\n');

  // Simulate some tool calls
  const tools = [
    { name: 'searchAnime', params: { query: 'action', limit: 10 }, success: true, time: 150 },
    { name: 'getAnimeDetails', params: { id: 20 }, success: true, time: 100 },
    { name: 'getTopAnime', params: { limit: 25 }, success: true, time: 200 },
    { name: 'searchAnime', params: { query: 'romance', genres: '22' }, success: false, time: 50 },
    { name: 'getAnimeGenres', params: {}, success: true, time: 30 },
  ];

  for (const tool of tools) {
    const callId = logger.startCall({
      sessionId,
      toolName: tool.name,
      parameters: tool.params
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    logger.endCall(callId, {
      success: tool.success,
      executionTimeMs: tool.time,
      resultMetadata: { count: tool.success ? 10 : 0 },
      tokensInput: 50,
      tokensOutput: tool.success ? 200 : 0
    });

    console.log(`✓ Logged: ${tool.name} (${tool.success ? 'success' : 'failed'})`);
  }

  // Wait a bit for async writes
  await new Promise(resolve => setTimeout(resolve, 500));

  logger.close();
  console.log('\n✅ Test data generated successfully!');
  console.log('\nRun: npm run analytics:summary');
}

generateTestData().catch(console.error);
