# Staging Tier Configuration
# ECS Fargate with auto-scaling, multi-AZ RDS with backups
# Full three-tier application stack with monitoring

environment = "staging"
aws_region  = "us-east-1"

# Networking - Multi-AZ for high availability
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# Database - Small multi-AZ RDS instance
rds_instance_class    = "db.t3.small"
rds_allocated_storage = 50
rds_engine_version    = "16.1"
rds_multi_az          = true
backup_retention_days = 7

# Compute - ECS Fargate with auto-scaling
# Minimum 2 for failover, maximum 4 for controlled growth
desired_count = 2
min_count     = 1
max_count     = 4

# Container Configuration - Higher resources than demo
cpu    = 512
memory = 1024

# Docker Images - From container registry
backend_docker_image  = "finly-backend:latest"
frontend_docker_image = "finly-frontend:latest"

# Monitoring - Retain logs for 7 days
log_retention_days = 7

# Secrets - Must be provided via terraform variable or AWS Secrets Manager
# DO NOT hardcode real secrets here - use tfvars.secret or environment variables
jwt_access_secret  = "staging_jwt_access_secret_changeme"
jwt_refresh_secret = "staging_jwt_refresh_secret_changeme"

# OAuth - Staging credentials
# Obtain from Google Cloud Console, Apple Developer Portal
google_client_id     = ""
google_client_secret = ""
apple_team_id        = ""
apple_key_id         = ""
apple_private_key    = ""

# External Services - Staging accounts
# Use staging accounts from Twilio, SendGrid, Stripe, Firebase
twilio_account_sid = ""
twilio_auth_token  = ""
twilio_from_number = ""
sendgrid_api_key   = ""
firebase_key       = ""
stripe_api_key     = ""
stripe_webhook_secret = ""
