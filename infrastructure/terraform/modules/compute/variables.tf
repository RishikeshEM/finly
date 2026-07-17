variable "app_name" {
  description = "Application name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

# Networking
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "application_security_group" {
  description = "Application security group ID"
  type        = string
}

variable "alb_security_group" {
  description = "ALB security group ID"
  type        = string
}

# Database
variable "database_host" {
  description = "Database host"
  type        = string
}

variable "database_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "database_user" {
  description = "Database user"
  type        = string
  sensitive   = true
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Docker Images
variable "backend_docker_image" {
  description = "Backend Docker image"
  type        = string
}

variable "frontend_docker_image" {
  description = "Frontend Docker image"
  type        = string
}

variable "redis_endpoint" {
  description = "Redis endpoint"
  type        = string
  default     = "redis:6379"
}

# Deployment Configuration
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "min_count" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_count" {
  description = "Maximum number of tasks"
  type        = number
  default     = 4
}

variable "cpu" {
  description = "CPU units"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MB"
  type        = number
  default     = 512
}

# Secrets
variable "jwt_access_secret" {
  description = "JWT access secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret"
  type        = string
  sensitive   = true
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
  description = "Apple OAuth private key"
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
  description = "Twilio auth token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_from_number" {
  description = "Twilio from number"
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
  description = "SendGrid from email"
  type        = string
  default     = "noreply@finly.app"
}

variable "firebase_key" {
  description = "Firebase service account key"
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
  description = "Stripe webhook secret"
  type        = string
  default     = ""
  sensitive   = true
}

# CloudWatch
variable "log_group_name" {
  description = "CloudWatch log group name"
  type        = string
}
