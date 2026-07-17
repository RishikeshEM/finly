output "demo_instance_id" {
  description = "Demo EC2 instance ID"
  value       = try(aws_instance.demo[0].id, "")
}

output "demo_instance_public_ip" {
  description = "Demo EC2 instance public IP"
  value       = try(aws_eip.demo[0].public_ip, "")
}

output "demo_instance_public_dns" {
  description = "Demo EC2 instance public DNS"
  value       = try(aws_instance.demo[0].public_dns, "")
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = try(aws_lb.main[0].dns_name, "")
}

output "alb_arn" {
  description = "ALB ARN"
  value       = try(aws_lb.main[0].arn, "")
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = try(aws_ecs_cluster.main[0].name, "")
}

output "backend_service_name" {
  description = "Backend ECS service name"
  value       = try(aws_ecs_service.backend[0].name, "")
}

output "backend_target_group_arn" {
  description = "Backend target group ARN"
  value       = try(aws_lb_target_group.backend[0].arn, "")
}

output "frontend_target_group_arn" {
  description = "Frontend target group ARN"
  value       = try(aws_lb_target_group.frontend[0].arn, "")
}

output "ecs_task_definition_arn" {
  description = "Backend task definition ARN"
  value       = try(aws_ecs_task_definition.backend[0].arn, "")
}

output "ecs_logs_group" {
  description = "ECS CloudWatch logs group"
  value       = try(aws_cloudwatch_log_group.ecs[0].name, "")
}
