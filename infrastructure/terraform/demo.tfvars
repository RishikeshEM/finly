# Demo Tier Configuration
# Single EC2 instance with Docker Compose, single-AZ RDS
# Cost-optimized for pitch/demo scenarios ($0 idle cost via terraform destroy)

environment = "demo"
aws_region  = "us-east-1"

# Networking - Single AZ for cost savings
availability_zones   = ["us-east-1a"]
public_subnet_cidrs  = ["10.0.1.0/24"]
private_subnet_cidrs = ["10.0.10.0/24"]

# Database - Minimal RDS instance
rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20
rds_engine_version    = "16.1"
rds_multi_az          = false
backup_retention_days = 1

# Compute - Single EC2 instance with Docker Compose
instance_type = "t3.micro"
desired_count = 1
min_count     = 1
max_count     = 1

# Container Configuration
cpu    = 256
memory = 512

# Docker Images - Built locally or from registry
backend_docker_image  = "finly-backend:latest"
frontend_docker_image = "finly-frontend:latest"

# Monitoring - Minimal for cost
log_retention_days = 1

# Secrets - Provided via environment variables (TF_VAR_database_password, etc.)
# NEVER hardcode passwords here
database_password  = "" # Set via: export TF_VAR_database_password="value"
jwt_access_secret  = "demo_jwt_access_secret_change_me_min_32_chars"
jwt_refresh_secret = "demo_jwt_refresh_secret_change_me_min_32_chars"

# OAuth - Demo app credentials (replace with real values)
google_client_id     = ""
google_client_secret = ""
apple_team_id        = ""
apple_key_id         = ""
apple_private_key    = ""

# External Services - Demo placeholders
twilio_account_sid = ""
twilio_auth_token  = ""
twilio_from_number = ""
sendgrid_api_key   = ""
firebase_key       = ""
stripe_api_key     = ""
stripe_webhook_secret = ""
