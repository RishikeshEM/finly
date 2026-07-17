/**
 * Finly Database Module
 * Exports the database configuration for use in the backend application.
 * The backend should use this config to instantiate its database client.
 */

export { databaseConfig, loadDatabaseConfig, DatabaseConfig } from './config';

// Re-export for convenience
export * from './config';
