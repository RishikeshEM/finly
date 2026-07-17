terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration - use S3 for state storage
  # This should be initialized with remote backend during first deployment
  # For local development, comment this out and use local state
  # backend "s3" {
  #   bucket         = "finly-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.app_name
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  app_name    = var.app_name
  environment = var.environment
  aws_region  = var.aws_region

  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
}

# Database Module
module "database" {
  source = "./modules/database"

  app_name    = var.app_name
  environment = var.environment
  aws_region  = var.aws_region

  vpc_id                   = module.networking.vpc_id
  db_subnet_group_name     = module.networking.db_subnet_group_name
  database_security_group  = module.networking.database_security_group_id
  rds_instance_class       = var.rds_instance_class
  rds_allocated_storage    = var.rds_allocated_storage
  rds_engine_version       = var.rds_engine_version
  rds_multi_az             = var.rds_multi_az
  db_user                  = var.db_user
  db_password              = var.database_password
  db_name                  = var.db_name
  enable_backups           = var.environment != "demo"
  backup_retention_days    = var.backup_retention_days
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  app_name    = var.app_name
  environment = var.environment
  aws_region  = var.aws_region

  enable_detailed_monitoring = var.environment != "demo"
  log_retention_days         = var.log_retention_days
}

# Compute Module (conditional based on environment)
module "compute" {
  source = "./modules/compute"

  app_name    = var.app_name
  environment = var.environment
  aws_region  = var.aws_region

  # Networking
  vpc_id                   = module.networking.vpc_id
  private_subnet_ids       = module.networking.private_subnet_ids
  public_subnet_ids        = module.networking.public_subnet_ids
  application_security_group = module.networking.application_security_group_id
  alb_security_group       = module.networking.alb_security_group_id

  # Database
  database_host     = module.database.db_endpoint
  database_port     = module.database.db_port
  database_name     = var.db_name
  database_user     = var.db_user
  database_password = var.database_password

  # Application Configuration
  backend_docker_image  = var.backend_docker_image
  frontend_docker_image = var.frontend_docker_image
  redis_endpoint        = var.redis_endpoint

  # Deployment Configuration
  instance_type     = var.instance_type
  desired_count     = var.desired_count
  min_count         = var.min_count
  max_count         = var.max_count
  cpu               = var.cpu
  memory            = var.memory

  # Secrets and Configuration
  jwt_access_secret     = var.jwt_access_secret
  jwt_refresh_secret    = var.jwt_refresh_secret
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
  apple_team_id         = var.apple_team_id
  apple_key_id          = var.apple_key_id
  apple_private_key     = var.apple_private_key
  twilio_account_sid    = var.twilio_account_sid
  twilio_auth_token     = var.twilio_auth_token
  twilio_from_number    = var.twilio_from_number
  sendgrid_api_key      = var.sendgrid_api_key
  sendgrid_from_email   = var.sendgrid_from_email
  firebase_key          = var.firebase_key
  stripe_api_key        = var.stripe_api_key
  stripe_webhook_secret = var.stripe_webhook_secret

  # CloudWatch Logging
  log_group_name = module.monitoring.log_group_name

  depends_on = [
    module.database,
    module.networking
  ]
}

# Outputs
output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.db_endpoint
}

output "database_port" {
  description = "RDS database port"
  value       = module.database.db_port
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = try(module.compute.alb_dns_name, "")
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = module.monitoring.log_group_name
}
