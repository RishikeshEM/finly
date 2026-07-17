/**
 * Environment configuration loader
 *
 * All sensitive values (JWT secret, DB password, OAuth credentials, API keys)
 * are loaded from environment variables, never hardcoded.
 * See .env.example for the expected shape.
 */

import dotenv from 'dotenv';

dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  logLevel: string;

  // Database (PostgreSQL)
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
  };

  // Redis (cache, queue backend)
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // JWT authentication
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: string; // e.g. '15m'
    refreshTokenExpiresIn: string; // e.g. '7d'
  };

  // OAuth (Google, Apple)
  oauth: {
    googleClientId: string;
    googleClientSecret: string;
    appleTeamId: string;
    appleKeyId: string;
    applePrivateKey: string;
  };

  // OTP / SMS
  sms: {
    provider: string; // 'twilio' or 'sns'
    accountSid?: string; // Twilio
    authToken?: string; // Twilio
    fromNumber?: string;
    // AWS SNS region handled via AWS_REGION env var
  };

  // Email (SendGrid)
  email: {
    sendgridApiKey: string;
    fromEmail: string;
    fromName: string;
  };

  // Firebase Cloud Messaging (push notifications)
  firebase: {
    serviceAccountKey: string; // JSON path or base64 encoded
  };

  // Stripe (billing)
  stripe: {
    apiKey: string;
    webhookSecret: string;
  };

  // CORS
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = getEnv(key, defaultValue?.toString());
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable: ${key}`);
  }
  return num;
}

function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = getEnv(key, defaultValue ? 'true' : 'false');
  return value.toLowerCase() === 'true';
}

export const config: Config = {
  port: getEnvNumber('PORT', 3000),
  nodeEnv: (getEnv('NODE_ENV', 'development') as any) || 'development',
  logLevel: getEnv('LOG_LEVEL', 'info'),

  database: {
    host: getEnv('DATABASE_HOST'),
    port: getEnvNumber('DATABASE_PORT', 5432),
    username: getEnv('DATABASE_USER'),
    password: getEnv('DATABASE_PASSWORD'),
    database: getEnv('DATABASE_NAME'),
    ssl: getEnvBoolean('DATABASE_SSL', false),
  },

  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', undefined),
    db: getEnvNumber('REDIS_DB', 0),
  },

  jwt: {
    accessTokenSecret: getEnv('JWT_ACCESS_SECRET'),
    refreshTokenSecret: getEnv('JWT_REFRESH_SECRET'),
    accessTokenExpiresIn: getEnv('JWT_ACCESS_EXPIRES', '15m'),
    refreshTokenExpiresIn: getEnv('JWT_REFRESH_EXPIRES', '7d'),
  },

  oauth: {
    googleClientId: getEnv('GOOGLE_CLIENT_ID'),
    googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET'),
    appleTeamId: getEnv('APPLE_TEAM_ID'),
    appleKeyId: getEnv('APPLE_KEY_ID'),
    applePrivateKey: getEnv('APPLE_PRIVATE_KEY'),
  },

  sms: {
    provider: getEnv('SMS_PROVIDER', 'twilio'),
    accountSid: getEnv('TWILIO_ACCOUNT_SID', undefined),
    authToken: getEnv('TWILIO_AUTH_TOKEN', undefined),
    fromNumber: getEnv('TWILIO_FROM_NUMBER', undefined),
  },

  email: {
    sendgridApiKey: getEnv('SENDGRID_API_KEY'),
    fromEmail: getEnv('SENDGRID_FROM_EMAIL'),
    fromName: getEnv('SENDGRID_FROM_NAME', 'Finly'),
  },

  firebase: {
    serviceAccountKey: getEnv('FIREBASE_SERVICE_ACCOUNT_KEY'),
  },

  stripe: {
    apiKey: getEnv('STRIPE_API_KEY'),
    webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET'),
  },

  cors: {
    origin: getEnv('CORS_ORIGIN', 'http://localhost:3001').split(','),
    credentials: getEnvBoolean('CORS_CREDENTIALS', true),
  },
};

export default config;
