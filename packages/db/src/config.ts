/**
 * Database connection configuration.
 * Reads PostgreSQL connection settings from environment variables.
 * Never hardcodes connection strings — always uses env vars.
 *
 * Expected environment variables:
 * - DATABASE_URL: full PostgreSQL connection string (preferred)
 * OR composed from individual variables:
 *   - DB_HOST (default: localhost)
 *   - DB_PORT (default: 5432)
 *   - DB_USER (required)
 *   - DB_PASSWORD (required)
 *   - DB_NAME (default: finly)
 *   - DB_SSL (default: false, set to 'true' for production)
 *
 * SSL certificate paths (if using custom certificates):
 * - DB_SSL_CERT_PATH (path to CA certificate)
 * - DB_SSL_CERT_KEY (path to client key)
 * - DB_SSL_REJECT_UNAUTHORIZED (default: true)
 *
 * Connection pool tuning:
 * - DB_POOL_MAX (default: 10)
 * - DB_IDLE_TIMEOUT_MS (default: 30000)
 * - DB_CONNECTION_TIMEOUT_MS (default: 5000)
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized?: boolean; ca?: string; key?: string };
  max: number; // connection pool size
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Load database configuration from environment variables.
 * Prefers DATABASE_URL if set; otherwise composes from individual env vars.
 */
export function loadDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Parse DATABASE_URL from environment variable
    return parseConnectionString(databaseUrl);
  }

  // Compose from individual environment variables
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'finly';
  const sslEnv = process.env.DB_SSL?.toLowerCase() === 'true';

  if (!user || !password) {
    throw new Error(
      'Database credentials missing: set DATABASE_URL or provide DB_USER and DB_PASSWORD env vars'
    );
  }

  const ssl = parseSSLConfig(sslEnv);

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
  };
}

/**
 * Parse a PostgreSQL connection string from DATABASE_URL environment variable
 */
function parseConnectionString(url: string): DatabaseConfig {
  try {
    const connUrl = new URL(url);

    const host = connUrl.hostname;
    const port = connUrl.port ? parseInt(connUrl.port, 10) : 5432;
    const user = connUrl.username;
    const password = connUrl.password;
    const database = connUrl.pathname.slice(1); // remove leading '/'

    if (!user || !password || !database) {
      throw new Error('Invalid DATABASE_URL: missing credentials or database name');
    }

    const sslParam = connUrl.searchParams.get('sslmode');
    const ssl = sslParam !== 'disable' && sslParam !== 'allow';

    return {
      host,
      port,
      user,
      password,
      database,
      ssl: parseSSLConfig(ssl),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    };
  } catch (err) {
    throw new Error(`Failed to parse DATABASE_URL: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse SSL configuration from environment variables or boolean flag
 */
function parseSSLConfig(sslEnabled: boolean): boolean | { rejectUnauthorized?: boolean; ca?: string; key?: string } {
  if (!sslEnabled) {
    return false;
  }

  const sslConfig: { rejectUnauthorized?: boolean; ca?: string; key?: string } = {};

  const rejectUnauth = process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase() !== 'false';
  if (rejectUnauth !== true) {
    sslConfig.rejectUnauthorized = false;
  }

  if (process.env.DB_SSL_CERT_PATH) {
    sslConfig.ca = process.env.DB_SSL_CERT_PATH;
  }

  if (process.env.DB_SSL_CERT_KEY) {
    sslConfig.key = process.env.DB_SSL_CERT_KEY;
  }

  return Object.keys(sslConfig).length > 0 ? sslConfig : true;
}

/**
 * Export the loaded configuration for use in the application
 */
export const databaseConfig = loadDatabaseConfig();
