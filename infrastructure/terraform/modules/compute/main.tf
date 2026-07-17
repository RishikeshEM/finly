# ============================================================================
# DEMO TIER: Single EC2 with Docker Compose (ssh-tunneled docker context)
# ============================================================================

# AMI - Ubuntu 22.04 LTS with Docker pre-installed
data "aws_ami" "ubuntu_docker" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM Role for EC2 instances
resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-${var.environment}-ec2-role"
  }
}

# IAM instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.app_name}-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# IAM Policy for CloudWatch Logs
resource "aws_iam_role_policy" "ec2_logs" {
  name = "${var.app_name}-${var.environment}-ec2-logs-policy"
  role = aws_iam_role.ec2_role.id

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
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# IAM Policy for SSM access (for systems manager)
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Security Group for EC2 (demo tier only)
resource "aws_security_group" "ec2_demo" {
  count       = var.environment == "demo" ? 1 : 0
  name        = "${var.app_name}-${var.environment}-ec2-sg"
  description = "Security group for demo EC2 instance"
  vpc_id      = var.vpc_id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Should be restricted to known IPs in production
  }

  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API port
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend port
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-ec2-sg"
  }
}

# Elastic IP for demo EC2
resource "aws_eip" "demo" {
  count    = var.environment == "demo" ? 1 : 0
  instance = aws_instance.demo[0].id
  domain   = "vpc"

  tags = {
    Name = "${var.app_name}-${var.environment}-eip"
  }

  depends_on = [aws_instance.demo]
}

# EC2 instance for demo tier
resource "aws_instance" "demo" {
  count                = var.environment == "demo" ? 1 : 0
  ami                  = data.aws_ami.ubuntu_docker.id
  instance_type        = var.instance_type
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  subnet_id              = var.public_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.ec2_demo[0].id]
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.app_name}-${var.environment}-root-volume"
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    app_name     = var.app_name
    environment  = var.environment
    db_host      = var.database_host
    db_port      = var.database_port
    db_name      = var.database_name
    db_user      = var.database_user
    db_password  = var.database_password
    jwt_secret   = var.jwt_access_secret
  }))

  monitoring = true

  tags = {
    Name = "${var.app_name}-${var.environment}-demo-instance"
  }

  depends_on = [aws_security_group.ec2_demo]
}

# ============================================================================
# STAGING/PRODUCTION TIER: ECS Fargate with Auto-scaling
# ============================================================================

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  count = var.environment != "demo" ? 1 : 0
  name  = "${var.app_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-cluster"
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs" {
  count             = var.environment != "demo" ? 1 : 0
  name              = "/ecs/${var.app_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-logs"
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  count = var.environment != "demo" ? 1 : 0
  name  = "${var.app_name}-${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-task-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  count      = var.environment != "demo" ? 1 : 0
  role       = aws_iam_role.ecs_task_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  count = var.environment != "demo" ? 1 : 0
  name  = "${var.app_name}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-task-role"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  count              = var.environment != "demo" ? 1 : 0
  name               = "${var.app_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group]
  subnets            = var.public_subnet_ids

  tags = {
    Name = "${var.app_name}-${var.environment}-alb"
  }
}

# Target Group for Backend
resource "aws_lb_target_group" "backend" {
  count            = var.environment != "demo" ? 1 : 0
  name             = "${var.app_name}-${var.environment}-backend-tg"
  port             = 3000
  protocol         = "HTTP"
  vpc_id           = var.vpc_id
  target_type      = "ip"
  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-backend-tg"
  }
}

# Target Group for Frontend
resource "aws_lb_target_group" "frontend" {
  count            = var.environment != "demo" ? 1 : 0
  name             = "${var.app_name}-${var.environment}-frontend-tg"
  port             = 3000
  protocol         = "HTTP"
  vpc_id           = var.vpc_id
  target_type      = "ip"
  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
    path                = "/"
    matcher             = "200"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-frontend-tg"
  }
}

# ALB Listener (redirect HTTP to HTTPS in production)
resource "aws_lb_listener" "main" {
  count            = var.environment != "demo" ? 1 : 0
  load_balancer_arn = aws_lb.main[0].arn
  port             = "80"
  protocol         = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend[0].arn
  }
}

# Placeholder for future HTTPS listener (requires SSL certificate)
# resource "aws_lb_listener" "https" {
#   count             = var.environment == "production" ? 1 : 0
#   load_balancer_arn = aws_lb.main[0].arn
#   port              = "443"
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
#   certificate_arn   = aws_acm_certificate.main[0].arn
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.backend[0].arn
#   }
# }

# ECS Task Definition - Backend
resource "aws_ecs_task_definition" "backend" {
  count                    = var.environment != "demo" ? 1 : 0
  family                   = "${var.app_name}-${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role[0].arn
  task_role_arn            = aws_iam_role.ecs_task_role[0].arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_docker_image
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "DATABASE_HOST", value = var.database_host },
        { name = "DATABASE_PORT", value = tostring(var.database_port) },
        { name = "DATABASE_NAME", value = var.database_name },
        { name = "DATABASE_USER", value = var.database_user },
        { name = "REDIS_HOST", value = "redis" }
      ]
      secrets = [
        { name = "DATABASE_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password[0].arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs[0].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.app_name}-${var.environment}-backend-task"
  }
}

# AWS Secrets Manager for database password
resource "aws_secretsmanager_secret" "db_password" {
  count = var.environment != "demo" ? 1 : 0
  name  = "${var.app_name}-${var.environment}-db-password"

  tags = {
    Name = "${var.app_name}-${var.environment}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  count         = var.environment != "demo" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.db_password[0].id
  secret_string = var.database_password
}

# ECS Service - Backend
resource "aws_ecs_service" "backend" {
  count           = var.environment != "demo" ? 1 : 0
  name            = "${var.app_name}-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main[0].id
  task_definition = aws_ecs_task_definition.backend[0].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.application_security_group]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend[0].arn
    container_name   = "backend"
    container_port   = 3000
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-backend-service"
  }

  depends_on = [aws_lb_listener.main]
}

# Auto-scaling Target for Backend
resource "aws_appautoscaling_target" "backend" {
  count              = var.environment != "demo" ? 1 : 0
  max_capacity       = var.max_count
  min_capacity       = var.min_count
  resource_id        = "service/${aws_ecs_cluster.main[0].name}/${aws_ecs_service.backend[0].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto-scaling Policy for Backend (CPU)
resource "aws_appautoscaling_policy" "backend_cpu" {
  count              = var.environment != "demo" ? 1 : 0
  name               = "${var.app_name}-${var.environment}-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 75.0
  }
}

# Auto-scaling Policy for Backend (Memory)
resource "aws_appautoscaling_policy" "backend_memory" {
  count              = var.environment != "demo" ? 1 : 0
  name               = "${var.app_name}-${var.environment}-backend-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}
