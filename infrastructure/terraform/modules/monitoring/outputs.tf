output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.application.name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.application.arn
}

output "cloudwatch_logs_role_arn" {
  description = "IAM role ARN for CloudWatch Logs"
  value       = aws_iam_role.cloudwatch_logs.arn
}

output "cloudwatch_logs_role_name" {
  description = "IAM role name for CloudWatch Logs"
  value       = aws_iam_role.cloudwatch_logs.name
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = var.environment != "demo" ? "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.application[0].dashboard_name}" : ""
}
