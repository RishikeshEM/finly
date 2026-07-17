#!/bin/bash
set -e

# Finly Demo Tier User Data Script
# Installs Docker, Docker Compose, and prepares for application deployment

# Update system packages
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \
  curl \
  wget \
  git \
  vim \
  unzip \
  awscli \
  jq \
  htop

# Install Docker
apt-get install -y docker.io

# Start Docker service
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/finly
cd /opt/finly

# Create .env file for docker-compose
cat > .env << EOF
# Finly Demo Environment
NODE_ENV=${environment}
PORT=3000

# Database
DB_HOST=db
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=${db_name}
DB_SSL=false

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Secrets (change these in production)
JWT_ACCESS_SECRET=${jwt_secret}
JWT_REFRESH_SECRET=${jwt_secret}

# OAuth (configure as needed)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# External Services (configure as needed)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@finly.app
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_VERSION=v1
EOF

# Log environment information
cat > /var/log/finly-setup.log << EOF
Finly Demo Tier Setup Completed
Environment: ${environment}
Region: us-east-1
Database Host: ${db_host}
Database Name: ${db_name}
EOF

echo "Finly demo tier setup completed successfully"
