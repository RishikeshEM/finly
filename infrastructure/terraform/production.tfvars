# Production Tier Configuration
# ECS Fargate with aggressive auto-scaling, Multi-AZ RDS with encryption
# Enterprise-grade infrastructure with 99.9% uptime SLA

environment = "production"
aws_region  = "us-east-1"

# Networking - Multi-AZ for geographic redundancy
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# Database - Production-grade RDS instance
# Multi-AZ for automatic failover, 30-day backup retention
rds_instance_class    = "db.t3.medium"
rds_allocated_storage = 100
rds_engine_version    = "16.1"
rds_multi_az          = true
backup_retention_days = 30

# Compute - ECS Fargate with aggressive auto-scaling
# Minimum 3 tasks for redundancy, maximum 10 for peak traffic
desired_count = 3
min_count     = 2
max_count     = 10

# Container Configuration - Higher resources for performance
cpu    = 1024
memory = 2048

# Docker Images - From container registry
backend_docker_image  = "finly-backend:latest"
frontend_docker_image = "finly-frontend:latest"

# Monitoring - Long-term audit trail
log_retention_days = 90

# Secrets - MUST be provided via AWS Secrets Manager or encrypted variable
# NEVER commit real secrets to this file
# Use: aws secretsmanager create-secret or terraform variable files with restricted access
database_password  = ""
jwt_access_secret  = ""
jwt_refresh_secret = ""

# OAuth - Production credentials from Google Cloud Console, Apple Developer Portal
google_client_id     = ""
google_client_secret = ""
apple_team_id        = ""
apple_key_id         = ""
apple_private_key    = ""

# External Services - Production accounts
# Use production accounts with billing limits, IP whitelisting
twilio_account_sid    = ""
twilio_auth_token     = ""
twilio_from_number    = ""
sendgrid_api_key      = ""
firebase_key          = ""
stripe_api_key        = ""
stripe_webhook_secret = ""
