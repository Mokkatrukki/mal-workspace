import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './connection';

function parseSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('--')) {
      continue;
    }
    
    // Check for dollar-quoted strings (like in functions)
    const dollarQuoteMatch = trimmedLine.match(/\$([^$]*)\$/);
    if (dollarQuoteMatch) {
      if (!inDollarQuote) {
        // Starting a dollar quote
        inDollarQuote = true;
        dollarTag = dollarQuoteMatch[0];
      } else if (dollarQuoteMatch[0] === dollarTag) {
        // Ending the dollar quote
        inDollarQuote = false;
        dollarTag = '';
      }
    }
    
    current += line + '\n';
    
    // If we're not in a dollar quote and the line ends with semicolon
    if (!inDollarQuote && trimmedLine.endsWith(';')) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
    }
  }
  
  // Add any remaining statement
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

async function runMigration() {
  console.log('Starting database migration...');
  
  try {
    // Test connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Read and execute schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    // Parse SQL statements properly
    const statements = parseSQL(schemaSql);

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await db.query(statement);
        } catch (error: any) {
          // Skip errors for objects that already exist
          if (error.code === '42P07' || // relation already exists
              error.code === '42710' || // object already exists
              error.code === '42P06' || // schema already exists
              error.code === '42723') {  // function already exists
            console.log(`Skipping existing object: ${error.message}`);
            continue;
          }
          console.error(`Error executing statement ${i + 1}:`, statement.substring(0, 100));
          throw error;
        }
      }
    }

    console.log('Database migration completed successfully!');
    
    // Verify tables were created
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Created tables:', tablesResult.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration }; 