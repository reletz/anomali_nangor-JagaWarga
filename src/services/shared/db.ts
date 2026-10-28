import postgres from 'postgres';
import { readFileSync } from 'node:fs';

// Database connection configuration
const sql = postgres({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '26257'),
  database: process.env.DB_NAME || 'jagawargadb',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ca: readFileSync(process.env.DB_CA_FILE || '/certs/ca.crt', 'utf8') }
    : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Test connection helper
export async function testConnection() {
  try {
    const result = await sql`SELECT version()`;
    console.log('✅ Database connected:', result[0].version);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export { sql };