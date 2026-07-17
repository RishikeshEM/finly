# Core Variables
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "finly"
}

variable "environment" {
  description = "Environment name (demo, staging, production)"
  type        = string
  validation {
    condition     = contains(["demo", "staging", "production"], var.environment)
    error_message = "Environment must be demo, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Networking Variables
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# Database Variables
variable "rds_instance_class" {
  description = "RDS instance class (t3.micro for demo, t3.small+ for staging/production)"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.1"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ RDS deployment"
  type        = bool
  default     = false
}

variable "db_user" {
  description = "Database master username"
  type        = string
  default     = "finly_user"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password (minimum 8 characters)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "finly_db"
}

variable "backup_retention_days" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 7
}

# Compute Variables
variable "instance_type" {
  description = "EC2 instance type for demo tier"
  type        = string
  default     = "t3.micro"
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "min_count" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 1
}

variable "max_count" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 4
}

variable "cpu" {
  description = "CPU units for ECS task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MB for ECS task"
  type        = number
  default     = 512
}

# Docker Image Variables
variable "backend_docker_image" {
  description = "Backend Docker image URI"
  type        = string
  default     = "finly-backend:latest"
}

variable "frontend_docker_image" {
  description = "Frontend Docker image URI"
  type        = string
  default     = "finly-frontend:latest"
}

variable "redis_endpoint" {
  description = "Redis endpoint (ElastiCache or external)"
  type        = string
  default     = "redis:6379"
}

# Secrets and Configuration Variables
variable "jwt_access_secret" {
  description = "JWT access token signing secret"
  type        = string
  sensitive   = true
  default     = "change_me_min_32_chars"
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token signing secret"
  type        = string
  sensitive   = true
  default     = "change_me_min_32_chars"
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_team_id" {
  description = "Apple OAuth team ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_key_id" {
  description = "Apple OAuth key ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_private_key" {
  description = "Apple OAuth private key (PEM format)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_account_sid" {
  description = "Twilio account SID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio authentication token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_from_number" {
  description = "Twilio phone number for SMS"
  type        = string
  default     = ""
}

variable "sendgrid_api_key" {
  description = "SendGrid API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sendgrid_from_email" {
  description = "SendGrid from email address"
  type        = string
  default     = "noreply@finly.app"
}

variable "firebase_key" {
  description = "Firebase service account key (JSON)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_api_key" {
  description = "Stripe API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Monitoring Variables
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}
