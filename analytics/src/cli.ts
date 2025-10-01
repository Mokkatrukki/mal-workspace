#!/usr/bin/env node
/**
 * CLI for MCP Analytics Reports
 */

import { AnalyticsDatabase } from './database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default database path
const dbPath = process.env.ANALYTICS_DB_PATH || join(__dirname, '..', 'analytics.db');

// Get date range (default: last 7 days)
function getDateRange(days: number = 7): { fromDate: string; toDate: string } {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    fromDate: from.toISOString(),
    toDate: now.toISOString()
  };
}

// Format table
function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxContentWidth = Math.max(...rows.map(r => String(r[i] || '').length));
    return Math.max(h.length, maxContentWidth);
  });

  const separator = '─'.repeat(colWidths.reduce((a, b) => a + b + 3, 0) + 1);
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ');
  const dataRows = rows.map(row =>
    row.map((cell, i) => String(cell || '').padEnd(colWidths[i])).join(' │ ')
  );

  return [
    separator,
    headerRow,
    separator,
    ...dataRows,
    separator
  ].join('\n');
}

// Summary Report
async function summaryReport(days: number = 7) {
  const db = new AnalyticsDatabase(dbPath);
  const { fromDate, toDate } = getDateRange(days);

  console.log(`\n📊 MCP Analytics Summary (Last ${days} Days)\n`);
  console.log(`Period: ${new Date(fromDate).toLocaleString()} - ${new Date(toDate).toLocaleString()}\n`);

  const stats = await db.getSummaryStats(fromDate, toDate);

  console.log(`Total Calls:     ${stats.totalCalls.toLocaleString()}`);
  console.log(`Successful:      ${stats.successfulCalls.toLocaleString()} (${stats.successRate.toFixed(1)}%)`);
  console.log(`Failed:          ${stats.failedCalls.toLocaleString()} (${(100 - stats.successRate).toFixed(1)}%)`);
  console.log(`Avg Response:    ${stats.avgResponseTime}ms`);
  console.log(`Total Tokens:    ${stats.totalTokens.toLocaleString()}\n`);

  const toolStats = await db.getToolUsageStats(fromDate, toDate);

  if (toolStats.length > 0) {
    console.log(`Top ${Math.min(10, toolStats.length)} Tools:\n`);

    const rows = toolStats.slice(0, 10).map(t => [
      `${t.mcpServer}/${t.toolName}`,
      t.calls.toString(),
      `${t.successRate.toFixed(1)}%`,
      `${t.avgTimeMs}ms`,
      t.totalTokens ? t.totalTokens.toLocaleString() : '0'
    ]);

    console.log(formatTable(
      ['Tool', 'Calls', 'Success', 'Avg Time', 'Tokens'],
      rows
    ));
  } else {
    console.log('No tool calls recorded yet.');
  }

  await db.close();
}

// Error Report
async function errorReport(days: number = 7) {
  const db = new AnalyticsDatabase(dbPath);
  const { fromDate, toDate } = getDateRange(days);

  console.log(`\n❌ Error Analysis (Last ${days} Days)\n`);

  const errors = await db.getErrorStats(fromDate, toDate);

  if (errors.length > 0) {
    const rows = errors.slice(0, 10).map(e => [
      e.toolName,
      e.errorType,
      e.count.toString(),
      (e.exampleMessage || '').substring(0, 50) + (e.exampleMessage && e.exampleMessage.length > 50 ? '...' : '')
    ]);

    console.log(formatTable(
      ['Tool', 'Error Type', 'Count', 'Example Message'],
      rows
    ));
  } else {
    console.log('✅ No errors recorded!');
  }

  await db.close();
}

// Performance Report
async function performanceReport(days: number = 7) {
  const db = new AnalyticsDatabase(dbPath);
  const { fromDate, toDate } = getDateRange(days);

  console.log(`\n⚡ Performance Report (Last ${days} Days)\n`);

  const metrics = await db.getPerformanceMetrics(fromDate, toDate);

  if (metrics.length > 0) {
    console.log('Slowest Tools:\n');

    const rows = metrics.slice(0, 10).map(m => [
      m.toolName,
      `${m.avgTimeMs}ms`,
      `${m.maxTimeMs}ms`,
      m.calls.toString(),
      m.avgTokens ? m.avgTokens.toLocaleString() : 'N/A'
    ]);

    console.log(formatTable(
      ['Tool', 'Avg Time', 'Max Time', 'Calls', 'Avg Tokens'],
      rows
    ));
  } else {
    console.log('No performance data available.');
  }

  await db.close();
}

// Journey Patterns Report
async function journeysReport(days: number = 7) {
  const db = new AnalyticsDatabase(dbPath);
  const { fromDate, toDate } = getDateRange(days);

  console.log(`\n🗺️  User Journey Patterns (Last ${days} Days)\n`);

  const patterns = await db.getJourneyPatterns(fromDate, toDate, 10);

  if (patterns.length > 0) {
    console.log('Common Tool Sequences:\n');

    patterns.forEach((p, i) => {
      console.log(`${i + 1}. ${p.pattern}`);
      console.log(`   Frequency: ${p.frequency} (${p.percentage}% of sessions)\n`);
    });
  } else {
    console.log('No journey patterns available.');
  }

  await db.close();
}

// Main CLI
async function main() {
  const command = process.argv[2] || 'summary';
  const days = parseInt(process.argv[3]) || 7;

  try {
    switch (command) {
      case 'summary':
        await summaryReport(days);
        break;
      case 'errors':
        await errorReport(days);
        break;
      case 'performance':
        await performanceReport(days);
        break;
      case 'journeys':
        await journeysReport(days);
        break;
      case 'report':
        await summaryReport(days);
        await errorReport(days);
        await performanceReport(days);
        await journeysReport(days);
        break;
      default:
        console.log(`
MCP Analytics CLI

Usage:
  npm run analytics:summary [days]      - Quick summary (default: 7 days)
  npm run analytics:errors [days]       - Error analysis
  npm run analytics:performance [days]  - Performance metrics
  npm run analytics:journeys [days]     - User journey patterns
  npm run analytics:report [days]       - Full report (all of the above)

Examples:
  npm run analytics:summary           # Last 7 days
  npm run analytics:errors 30         # Last 30 days
  npm run analytics:report 1          # Last 24 hours
        `);
    }
  } catch (error) {
    console.error('Error running analytics:', error);
    process.exit(1);
  }
}

main();
