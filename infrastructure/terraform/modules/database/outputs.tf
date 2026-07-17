output "db_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "db_host" {
  description = "RDS database host"
  value       = aws_db_instance.postgres.address
}

output "db_port" {
  description = "RDS database port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}

output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "db_resource_id" {
  description = "RDS database resource ID"
  value       = aws_db_instance.postgres.resource_id
}

output "db_instance_class" {
  description = "RDS instance class"
  value       = aws_db_instance.postgres.instance_class
}

output "db_allocated_storage" {
  description = "Allocated storage in GB"
  value       = aws_db_instance.postgres.allocated_storage
}

output "db_engine_version" {
  description = "Database engine version"
  value       = aws_db_instance.postgres.engine_version
}

output "db_multi_az" {
  description = "Multi-AZ deployment status"
  value       = aws_db_instance.postgres.multi_az
}

output "db_backup_retention" {
  description = "Backup retention period"
  value       = aws_db_instance.postgres.backup_retention_period
}
