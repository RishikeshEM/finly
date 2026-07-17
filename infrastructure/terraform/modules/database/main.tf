# RDS PostgreSQL Database
resource "aws_db_instance" "postgres" {
  identifier            = "${var.app_name}-${var.environment}-db"
  engine                = "postgres"
  engine_version        = var.rds_engine_version
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  multi_az              = var.rds_multi_az

  db_name  = var.db_name
  username = var.db_user
  password = var.db_password

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.database_security_group]
  publicly_accessible    = false

  # Backup and maintenance
  backup_retention_period = var.backup_retention_days
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  copy_tags_to_snapshot  = true

  # Performance and monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  performance_insights_enabled     = var.environment != "demo"
  enable_iam_database_authentication = true
  deletion_protection              = var.environment == "production"

  skip_final_snapshot       = var.environment == "demo"
  final_snapshot_identifier = var.environment != "demo" ? "${var.app_name}-${var.environment}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = {
    Name = "${var.app_name}-${var.environment}-postgres"
  }
}

# RDS Enhanced Monitoring Role (for Performance Insights)
resource "aws_iam_role" "rds_monitoring" {
  count = var.environment != "demo" ? 1 : 0
  name  = "${var.app_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.environment != "demo" ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Group for RDS
resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/instance/${var.app_name}-${var.environment}/postgresql"
  retention_in_days = var.environment == "demo" ? 1 : var.environment == "staging" ? 7 : 30

  tags = {
    Name = "${var.app_name}-${var.environment}-rds-logs"
  }
}

# Parameter Group for PostgreSQL
resource "aws_db_parameter_group" "postgres" {
  family = "postgres${split(".", var.rds_engine_version)[0]}"
  name   = "${var.app_name}-${var.environment}-postgres-params"

  # Optimize for application workload
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "0"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-postgres-params"
  }
}

# Option Group (for extensions if needed)
resource "aws_db_option_group" "postgres" {
  name                     = "${var.app_name}-${var.environment}-postgres-options"
  option_group_description = "Option group for ${var.app_name} PostgreSQL"
  engine_name              = "postgres"
  major_engine_version     = split(".", var.rds_engine_version)[0]

  tags = {
    Name = "${var.app_name}-${var.environment}-postgres-options"
  }
}
