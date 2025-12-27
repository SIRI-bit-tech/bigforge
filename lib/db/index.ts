import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Database connection with optimized settings for high concurrency
const connectionString = process.env.DATABASE_URL!

// Create postgres client with connection pooling optimized for 5000+ users
const client = postgres(connectionString, {
  // Connection pool settings
  max: 20, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  
  // Performance optimizations
  prepare: false, // Disable prepared statements for better connection reuse
  transform: postgres.camel, // Transform column names to camelCase
  
  // Connection settings
  connection: {
    application_name: 'bidforge-app',
    statement_timeout: 30000, // 30 second query timeout
    idle_in_transaction_session_timeout: 60000, // 1 minute idle transaction timeout
  },
  
  // SSL settings for production
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  
  // Error handling
  onnotice: process.env.NODE_ENV === 'development' ? () => {} : () => {},
  debug: process.env.NODE_ENV === 'development',
})

// Create drizzle instance with schema
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
})

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await client`SELECT 1`
    return true
  } catch (error) {
    // Database health check failed
    return false
  }
}

// Get connection pool stats
export async function getConnectionStats() {
  try {
    const stats = await client`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `
    return stats[0]
  } catch (error) {
    // Failed to get connection stats
    return null
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  try {
    await client.end()
    // Database connection closed gracefully
  } catch (error) {
    // Error closing database connection
  }
}

// Export all schema
export * from "./schema"
