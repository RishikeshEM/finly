# CloudWatch Log Group for Application Logs
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/${var.app_name}/${var.environment}/application"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.app_name}-${var.environment}-app-logs"
  }
}

# CloudWatch Log Stream for Backend
resource "aws_cloudwatch_log_stream" "backend" {
  name           = "backend"
  log_group_name = aws_cloudwatch_log_group.application.name
}

# CloudWatch Log Stream for Frontend
resource "aws_cloudwatch_log_stream" "frontend" {
  name           = "frontend"
  log_group_name = aws_cloudwatch_log_group.application.name
}

# IAM Role for CloudWatch Logs
resource "aws_iam_role" "cloudwatch_logs" {
  name = "${var.app_name}-${var.environment}-cloudwatch-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "ecs-tasks.amazonaws.com",
            "ec2.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-${var.environment}-cloudwatch-logs-role"
  }
}

resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "${var.app_name}-${var.environment}-cloudwatch-logs-policy"
  role = aws_iam_role.cloudwatch_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = "${aws_cloudwatch_log_group.application.arn}:*"
      }
    ]
  })
}

# CloudWatch Alarm for High CPU Utilization
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count               = var.environment != "demo" ? 1 : 0
  alarm_name          = "${var.app_name}-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when CPU exceeds 80%"
  alarm_actions       = []

  tags = {
    Name = "${var.app_name}-${var.environment}-high-cpu-alarm"
  }
}

# CloudWatch Alarm for High Memory Utilization
resource "aws_cloudwatch_metric_alarm" "high_memory" {
  count               = var.environment != "demo" ? 1 : 0
  alarm_name          = "${var.app_name}-${var.environment}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when memory exceeds 85%"
  alarm_actions       = []

  tags = {
    Name = "${var.app_name}-${var.environment}-high-memory-alarm"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "application" {
  count          = var.environment != "demo" ? 1 : 0
  dashboard_name = "${var.app_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            ["AWS/ECS", "MemoryUtilization", { stat = "Average" }],
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            ["AWS/RDS", "DatabaseConnections", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Application Metrics"
        }
      },
      {
        type = "log"
        properties = {
          query   = "fields @timestamp, @message | stats count() by bin(5m)"
          region  = var.aws_region
          title   = "Log Event Count"
        }
      }
    ]
  })
}
