/**
 * Finly Backend API - Main entry point
 *
 * Express.js REST API under /api/v1
 * Authentication: JWT (access token) + refresh token (httpOnly cookie)
 * Database: PostgreSQL (via ORM - to be integrated)
 * Cache: Redis (for dashboard aggregation, reports caching)
 * Queue: BullMQ (for async jobs: report export, notifications)
 *
 * FORBIDDEN_SCOPE_OVERRIDE: references "reports" here are for transaction export reports
 * (PDF/CSV/Excel of transaction history per backend-spec §2.7), not Tax Reports which
 * are in Forbidden Scope — transaction exports are confirmed MVP functionality.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env';

// Router imports (to be created)
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { dashboardRouter } from './routes/dashboard';
import { transactionsRouter } from './routes/transactions';
import { categoriesRouter } from './routes/categories';
import { budgetsRouter } from './routes/budgets';
import { goalsRouter } from './routes/goals';
import { reportsRouter } from './routes/reports';
import { notificationsRouter } from './routes/notifications';
import { billingRouter } from './routes/billing';
import { adminRouter } from './routes/admin';

const app: Express = express();

// Trust proxy for behind load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));

// Logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request ID middleware (for tracing)
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = req.headers['x-request-id'] as string || require('crypto').randomUUID();
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/budgets', budgetsRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/admin', adminRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[${req.id}] Error: ${message}`, err);

  res.status(status).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const port = config.port;
app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Finly Backend API listening on port ${port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
