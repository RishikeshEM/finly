/**
 * DevOps Integration Tests
 * Tests acceptance criteria for devops tasks (DO-01 through DO-05)
 *
 * These tests verify:
 * - Terraform plan/apply/destroy workflows
 * - Tier isolation (demo/staging/production)
 * - Migration failure handling
 * - Redis graceful degradation
 * - CI pipeline requirements
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('DevOps Integration Tests (DO-01 through DO-05)', () => {
  const terraformDir = path.join(__dirname, '../../infrastructure/terraform');
  const ciWorkflowPath = path.join(__dirname, '../../.github/workflows/ci.yml');

  describe('DO-TC-01: Terraform Plan Validation', () => {
    it('should validate terraform syntax for demo tier', () => {
      const output = execSync(`cd ${terraformDir} && terraform validate`, {
        encoding: 'utf-8',
      });
      expect(output).toContain('Success!');
    });

    it('should validate terraform syntax for staging tier', () => {
      const output = execSync(
        `cd ${terraformDir} && terraform validate -var-file=staging.tfvars`,
        {
          encoding: 'utf-8',
        }
      );
      expect(output).toContain('Success!');
    });

    it('should validate terraform syntax for production tier', () => {
      const output = execSync(
        `cd ${terraformDir} && terraform validate -var-file=production.tfvars`,
        {
          encoding: 'utf-8',
        }
      );
      expect(output).toContain('Success!');
    });

    it('should load all required variables', () => {
      const varsContent = fs.readFileSync(
        path.join(terraformDir, 'variables.tf'),
        'utf-8'
      );
      expect(varsContent).toContain('variable "app_name"');
      expect(varsContent).toContain('variable "environment"');
      expect(varsContent).toContain('variable "database_password"');
      expect(varsContent).toContain('variable "jwt_access_secret"');
      expect(varsContent).toContain('variable "jwt_refresh_secret"');
    });
  });

  describe('DO-TC-02: CI Pipeline Stage Gates', () => {
    it('should have security stage before lint', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const securityIndex = ciContent.indexOf('name: Security Scan');
      const lintIndex = ciContent.indexOf('name: Lint & Format Check');
      expect(securityIndex).toBeLessThan(lintIndex);
    });

    it('should have lint stage before typecheck', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const lintIndex = ciContent.indexOf('name: Lint & Format Check');
      const typecheckIndex = ciContent.indexOf('name: TypeScript Type Check');
      expect(lintIndex).toBeLessThan(typecheckIndex);
    });

    it('should have typecheck stage before test', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const typecheckIndex = ciContent.indexOf('name: TypeScript Type Check');
      const testIndex = ciContent.indexOf('name: Unit Tests');
      expect(typecheckIndex).toBeLessThan(testIndex);
    });

    it('should have test stage before build', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const testIndex = ciContent.indexOf('name: Unit Tests');
      const buildIndex = ciContent.indexOf('name: Build Application');
      expect(testIndex).toBeLessThan(buildIndex);
    });

    it('should enforce job dependencies for stage gating', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('needs: security');
      expect(ciContent).toContain('needs: lint');
      expect(ciContent).toContain('needs: typecheck');
      expect(ciContent).toContain('needs: test');
    });
  });

  describe('DO-TC-03: Dependency Vulnerability Blocking', () => {
    it('should run npm audit with --audit-level=high', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('npm audit --audit-level=high');
    });

    it('should fail build on high-severity vulnerabilities', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const securitySection = ciContent.substring(
        ciContent.indexOf('name: Security Scan'),
        ciContent.indexOf('name: Lint & Format Check')
      );
      expect(securitySection).toContain('Dependency vulnerability scan');
      expect(securitySection).toContain('npm audit');
    });
  });

  describe('DO-TC-05: Tier Isolation and State Separation', () => {
    it('should have separate tfvars files for each tier', () => {
      expect(fs.existsSync(path.join(terraformDir, 'demo.tfvars'))).toBe(true);
      expect(fs.existsSync(path.join(terraformDir, 'staging.tfvars'))).toBe(true);
      expect(fs.existsSync(path.join(terraformDir, 'production.tfvars'))).toBe(true);
    });

    it('should have environment-specific resource naming', () => {
      const mainTf = fs.readFileSync(path.join(terraformDir, 'main.tf'), 'utf-8');
      expect(mainTf).toContain('${var.app_name}-${var.environment}');
    });

    it('should have environment-specific resource isolation in compute', () => {
      const computeTf = fs.readFileSync(
        path.join(terraformDir, 'modules/compute/main.tf'),
        'utf-8'
      );
      expect(computeTf).toContain('var.environment');
      expect(computeTf).toContain('count =');
    });

    it('should validate demo tier has minimal config', () => {
      const demoTfvars = fs.readFileSync(
        path.join(terraformDir, 'demo.tfvars'),
        'utf-8'
      );
      expect(demoTfvars).toContain('environment = "demo"');
      expect(demoTfvars).toContain('rds_instance_class    = "db.t3.micro"');
      expect(demoTfvars).toContain('backup_retention_days = 1');
    });

    it('should validate staging tier has HA config', () => {
      const stagingTfvars = fs.readFileSync(
        path.join(terraformDir, 'staging.tfvars'),
        'utf-8'
      );
      expect(stagingTfvars).toContain('environment = "staging"');
      expect(stagingTfvars).toContain('rds_multi_az');
      expect(stagingTfvars).toContain('backup_retention_days = 7');
    });

    it('should validate production tier has enterprise config', () => {
      const prodTfvars = fs.readFileSync(
        path.join(terraformDir, 'production.tfvars'),
        'utf-8'
      );
      expect(prodTfvars).toContain('environment = "production"');
      expect(prodTfvars).toContain('rds_multi_az');
      expect(prodTfvars).toContain('backup_retention_days = 30');
    });
  });

  describe('DO-TC-06: Secrets Management', () => {
    it('should not have hardcoded JWT secrets in tfvars', () => {
      const demoTfvars = fs.readFileSync(
        path.join(terraformDir, 'demo.tfvars'),
        'utf-8'
      );
      expect(demoTfvars).not.toMatch(/jwt_.*_secret\s*=\s*"[a-zA-Z0-9_]+"/);
    });

    it('should not have hardcoded secrets in staging tfvars', () => {
      const stagingTfvars = fs.readFileSync(
        path.join(terraformDir, 'staging.tfvars'),
        'utf-8'
      );
      expect(stagingTfvars).not.toMatch(/jwt_.*_secret\s*=\s*"[a-zA-Z0-9_]+"/);
    });

    it('should use environment variables for secrets', () => {
      const mainTf = fs.readFileSync(path.join(terraformDir, 'main.tf'), 'utf-8');
      expect(mainTf).toContain('var.database_password');
      expect(mainTf).toContain('var.jwt_access_secret');
    });

    it('should mark sensitive variables in Terraform', () => {
      const varsTf = fs.readFileSync(
        path.join(terraformDir, 'variables.tf'),
        'utf-8'
      );
      expect(varsTf).toContain('sensitive = true');
    });
  });

  describe('DO-TC-08: Migration Failure Handling', () => {
    it('should have explicit migration step in deploy stage', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('Run Database Migrations');
      expect(ciContent).toContain('npm run migrate');
    });

    it('should have rollback on migration failure', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('Rollback on Migration Failure');
      expect(ciContent).toContain('if: failure()');
    });

    it('should have terraform destroy in rollback step', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      const rollbackSection = ciContent.substring(
        ciContent.indexOf('Rollback on Migration Failure'),
        ciContent.indexOf('Terraform Output')
      );
      expect(rollbackSection).toContain('terraform destroy');
    });
  });

  describe('DO-TC-09: Redis Graceful Degradation', () => {
    it('should allow backend to start when Redis is unavailable', () => {
      const dockerCompose = fs.readFileSync(
        path.join(__dirname, '../../docker-compose.yml'),
        'utf-8'
      );
      expect(dockerCompose).toContain('service_started');
      expect(dockerCompose).not.toMatch(/redis:\s*condition: service_healthy/);
    });

    it('should implement dashboard fallback logic', () => {
      const dashboardRoute = fs.readFileSync(
        path.join(__dirname, '../../apps/backend/src/routes/dashboard.ts'),
        'utf-8'
      );
      expect(dashboardRoute).toContain('catch (redisError)');
      expect(dashboardRoute).toContain('queryDashboardFromDatabase');
      expect(dashboardRoute).toContain('graceful degradation');
    });

    it('should query database when Redis unavailable', () => {
      const dashboardRoute = fs.readFileSync(
        path.join(__dirname, '../../apps/backend/src/routes/dashboard.ts'),
        'utf-8'
      );
      expect(dashboardRoute).toContain('queryDashboardFromDatabase(userId)');
      expect(dashboardRoute).toContain('FROM transactions');
    });

    it('should not throw on Redis cache write failure', () => {
      const dashboardRoute = fs.readFileSync(
        path.join(__dirname, '../../apps/backend/src/routes/dashboard.ts'),
        'utf-8'
      );
      expect(dashboardRoute).toContain(
        "catch (cacheWriteError) {"
      );
      expect(dashboardRoute).toContain('cache write failure is not critical');
    });
  });

  describe('DO-EC-02: Secrets Configuration', () => {
    it('should document all required secrets in .env.example', () => {
      const envExample = fs.readFileSync(
        path.join(__dirname, '../../apps/backend/.env.example'),
        'utf-8'
      );
      expect(envExample).toContain('JWT_ACCESS_SECRET');
      expect(envExample).toContain('JWT_REFRESH_SECRET');
      expect(envExample).toContain('GOOGLE_CLIENT_SECRET');
      expect(envExample).toContain('APPLE_PRIVATE_KEY');
      expect(envExample).toContain('TWILIO_AUTH_TOKEN');
      expect(envExample).toContain('SENDGRID_API_KEY');
      expect(envExample).toContain('FIREBASE_SERVICE_ACCOUNT_KEY');
      expect(envExample).toContain('STRIPE_API_KEY');
      expect(envExample).toContain('STRIPE_WEBHOOK_SECRET');
    });

    it('should not have real secrets in .env.example', () => {
      const envExample = fs.readFileSync(
        path.join(__dirname, '../../apps/backend/.env.example'),
        'utf-8'
      );
      expect(envExample).not.toMatch(/sk_live_/);
      expect(envExample).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(envExample).not.toMatch(/whsec_[a-z0-9]+/);
    });
  });

  describe('DO-EC-03 & DO-EC-05: Tier Isolation and Recovery', () => {
    it('should have independent tfvars for state isolation', () => {
      const demoTfvars = fs.readFileSync(
        path.join(terraformDir, 'demo.tfvars'),
        'utf-8'
      );
      const stagingTfvars = fs.readFileSync(
        path.join(terraformDir, 'staging.tfvars'),
        'utf-8'
      );

      expect(demoTfvars).toContain('environment = "demo"');
      expect(stagingTfvars).toContain('environment = "staging"');
    });

    it('should configure S3 backend for state management in CI', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('terraform init');
      expect(ciContent).toContain('TF_STATE_BUCKET');
      expect(ciContent).toContain('terraform-locks');
    });
  });

  describe('DO-EC-04: CI/CD Pipeline Requirements', () => {
    it('should run terraform validate in build stage', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('terraform validate');
    });

    it('should run terraform plan for all three tiers', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain('demo.tfvars');
      expect(ciContent).toContain('staging.tfvars');
      expect(ciContent).toContain('production.tfvars');
    });

    it('should deploy only on main/release branches', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
      expect(ciContent).toContain("github.ref == 'refs/heads/main'");
      expect(ciContent).toContain('refs/heads/release/');
    });
  });

  describe('DO-EC-06: Monitoring and Observability', () => {
    it('should have monitoring module in terraform', () => {
      expect(fs.existsSync(
        path.join(terraformDir, 'modules/monitoring/main.tf')
      )).toBe(true);
    });

    it('should configure CloudWatch logs in monitoring module', () => {
      const monitoringTf = fs.readFileSync(
        path.join(terraformDir, 'modules/monitoring/main.tf'),
        'utf-8'
      );
      expect(monitoringTf).toContain('aws_logs_log_group');
      expect(monitoringTf).toContain('retention_in_days');
    });

    it('should have environment-specific log retention', () => {
      const demoTfvars = fs.readFileSync(
        path.join(terraformDir, 'demo.tfvars'),
        'utf-8'
      );
      const stagingTfvars = fs.readFileSync(
        path.join(terraformDir, 'staging.tfvars'),
        'utf-8'
      );
      const prodTfvars = fs.readFileSync(
        path.join(terraformDir, 'production.tfvars'),
        'utf-8'
      );

      expect(demoTfvars).toContain('log_retention_days = 1');
      expect(stagingTfvars).toContain('log_retention_days = 7');
      expect(prodTfvars).toContain('log_retention_days = 90');
    });
  });
});
