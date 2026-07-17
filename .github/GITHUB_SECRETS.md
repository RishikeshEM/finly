# GitHub Actions Secrets Configuration

This document lists all GitHub Actions secrets required for the CI/CD pipeline to function properly.

## Required Secrets

### CI/CD Pipeline Secrets

**`DB_PASSWORD_CI_PLANNING`**
- **Used by:** CI build stage (terraform plan steps)
- **Value:** A temporary database password for planning infrastructure changes
- **Minimum length:** 8 characters
- **Note:** This is used only for `terraform plan` validation; not used for actual deployments
- **How to set:** GitHub repo Settings → Secrets and variables → Actions → New repository secret

**`DB_PASSWORD_DEPLOYMENT`**
- **Used by:** Deployment stage (terraform plan/apply)
- **Value:** The actual database password used in staging/production RDS
- **Minimum length:** 8 characters (AWS RDS requirement)
- **Rotation:** Should be rotated periodically; coordinate with team before updating
- **How to set:** GitHub repo Settings → Secrets and variables → Actions → New repository secret
- **Security:** Use AWS Secrets Manager or HashiCorp Vault in production; rotate on infrastructure changes

### Infrastructure/State Secrets

**`AWS_ROLE_ARN`**
- **Used by:** Deploy job for AWS credential assumption
- **Value:** ARN of the IAM role that GitHub Actions should assume (for OIDC authentication)
- **Format:** `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`
- **How to set:** GitHub repo Settings → Secrets and variables → Actions → New repository secret
- **Setup:** Requires OIDC provider configuration in AWS account

**`TF_STATE_BUCKET`**
- **Used by:** Deploy job for Terraform state backend initialization
- **Value:** Name of the S3 bucket storing Terraform state
- **Format:** `finly-terraform-state` (or similar)
- **Prerequisites:** S3 bucket must exist with versioning enabled; DynamoDB table `terraform-locks` must exist for state locking
- **How to set:** GitHub repo Settings → Secrets and variables → Actions → New repository secret

## Setup Instructions

1. **AWS OIDC Provider** (one-time setup):
   ```bash
   aws iam create-openid-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com
   ```

2. **IAM Role for GitHub** (one-time setup):
   ```bash
   # Create role with trust policy allowing GitHub Actions
   # https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
   ```

3. **Terraform State S3 Bucket** (one-time setup):
   ```bash
   aws s3api create-bucket --bucket finly-terraform-state --region us-east-1
   aws s3api put-bucket-versioning --bucket finly-terraform-state --versioning-configuration Status=Enabled
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

4. **Configure GitHub Secrets** (repository-level):
   - Navigate to GitHub repo Settings → Secrets and variables → Actions
   - Click "New repository secret" and add each secret listed above
   - Values should be obtained securely (never commit to git)

## Testing Secrets Configuration

Before merging to main, verify:

1. All required secrets are configured:
   ```bash
   # This can't be checked directly (GitHub hides secret values),
   # but pushing a feature branch will show clear errors if secrets are missing
   ```

2. CI pipeline builds successfully on a feature branch
3. Terraform plan succeeds on all three tiers (demo, staging, production)
4. Deploy job can authenticate to AWS via OIDC

## Secret Rotation

- **Database passwords:** Rotate on infrastructure changes or every 90 days
  - Update the secret in GitHub Actions
  - Trigger deployment to update RDS password
  - Document rotation date in team wiki
  
- **AWS credentials:** Handled via OIDC (no long-lived credentials stored)
  - OIDC tokens are short-lived (valid for ~1 hour per action run)
  - No credential rotation needed

---

**Last updated:** 2026-07-17  
**Related:** `.github/workflows/ci.yml`, `devops-spec.md`
