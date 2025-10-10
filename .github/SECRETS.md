# GitHub Secrets Configuration Guide

Complete guide for managing GitHub Secrets for Firebase deployment and CI/CD workflows.

## Table of Contents

- [Overview](#overview)
- [Required Secrets](#required-secrets)
- [How to Generate Secrets](#how-to-generate-secrets)
- [Setting Secrets in GitHub](#setting-secrets-in-github)
- [Environment-Specific Secrets](#environment-specific-secrets)
- [Security Best Practices](#security-best-practices)
- [Secret Rotation Policy](#secret-rotation-policy)
- [Access Control](#access-control)
- [Troubleshooting](#troubleshooting)

---

## Overview

GitHub Secrets are encrypted environment variables used in GitHub Actions workflows. They allow secure deployment to Firebase without exposing sensitive credentials.

### Secret Types

1. **Firebase Authentication** - Tokens and service accounts
2. **Firebase Configuration** - Project settings and API keys
3. **Application Configuration** - Feature flags and settings
4. **Third-Party Services** - API keys for external services

### Security Level

- Secrets are encrypted at rest
- Only visible during workflow execution
- Cannot be viewed after creation
- Audit logs track access and modifications

---

## Required Secrets

### Critical Secrets (Required for Deployment)

#### 1. FIREBASE_TOKEN

**Purpose:** Firebase CLI authentication for deployments

**How to Generate:**
```bash
# Login to Firebase and generate CI token
firebase login:ci

# Copy the token that appears
# Example output: 1//0abc123...xyz789
```

**Usage in Workflows:**
```yaml
- uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    firebaseToken: ${{ secrets.FIREBASE_TOKEN }}
```

**Security Level:** CRITICAL - Allows full Firebase access

---

#### 2. FIREBASE_SERVICE_ACCOUNT

**Purpose:** Service account for Firebase Admin SDK

**How to Generate:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon > Project Settings
4. Navigate to "Service Accounts" tab
5. Click "Generate new private key"
6. Download JSON file
7. Copy entire JSON content (single line)

**Format:**
```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Security Level:** CRITICAL - Full backend access

---

#### 3. FIREBASE_PROJECT_ID

**Purpose:** Identifies which Firebase project to deploy to

**How to Get:**
```bash
# From Firebase CLI
firebase projects:list

# Or from Firebase Console
# Project Settings > General > Project ID
```

**Example:** `studio-revenue-manager-prod`

**Security Level:** LOW - Public identifier

---

### Firebase Web SDK Configuration (Frontend)

These are safe to expose in client-side code but should be managed as secrets for different environments.

#### 4. VITE_FIREBASE_API_KEY

**How to Get:**
```bash
firebase apps:sdkconfig web
```

**Example:** `AIzaSyAbc123...xyz789`

**Security Level:** LOW - Designed for client-side use

---

#### 5. VITE_FIREBASE_AUTH_DOMAIN

**Example:** `studio-revenue-manager.firebaseapp.com`

**Security Level:** LOW - Public domain

---

#### 6. VITE_FIREBASE_STORAGE_BUCKET

**Example:** `studio-revenue-manager.appspot.com`

**Security Level:** LOW - Public identifier

---

#### 7. VITE_FIREBASE_MESSAGING_SENDER_ID

**Example:** `123456789012`

**Security Level:** LOW - Public identifier

---

#### 8. VITE_FIREBASE_APP_ID

**Example:** `1:123456789012:web:abc123def456`

**Security Level:** LOW - Public identifier

---

#### 9. VITE_FIREBASE_MEASUREMENT_ID

**Purpose:** Google Analytics measurement ID (optional)

**Example:** `G-ABC123XYZ`

**Security Level:** LOW - Public identifier

---

### Optional Secrets

#### 10. GOOGLE_CALENDAR_CLIENT_ID

**Purpose:** Google Calendar API OAuth client ID

**How to Generate:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID
5. Select "Web application"
6. Add authorized redirect URIs
7. Copy Client ID

**Example:** `123456789-abc123.apps.googleusercontent.com`

**Security Level:** MEDIUM - OAuth client ID

---

#### 11. GOOGLE_CALENDAR_CLIENT_SECRET

**How to Generate:** Same as Client ID (provided together)

**Example:** `GOCSPX-abc123...xyz789`

**Security Level:** HIGH - OAuth secret

---

#### 12. SENTRY_DSN

**Purpose:** Error tracking with Sentry (optional)

**How to Get:**
1. Create project in Sentry
2. Go to Settings > Projects > [Your Project]
3. Copy DSN

**Example:** `https://abc123@o123.ingest.sentry.io/456`

**Security Level:** MEDIUM - Error reporting endpoint

---

## How to Generate Secrets

### Complete Setup Script

```bash
#!/bin/bash
# generate-secrets.sh

echo "🔐 Generating GitHub Secrets for Firebase Deployment"
echo ""

# 1. Firebase Token
echo "1️⃣  Generating Firebase Token..."
echo "Run: firebase login:ci"
echo "Copy the token and save as FIREBASE_TOKEN"
echo ""

# 2. Service Account
echo "2️⃣  Service Account:"
echo "1. Go to Firebase Console > Project Settings > Service Accounts"
echo "2. Click 'Generate new private key'"
echo "3. Download JSON file"
echo "4. Save entire JSON content as FIREBASE_SERVICE_ACCOUNT"
echo ""

# 3. Project ID
echo "3️⃣  Firebase Project ID..."
FIREBASE_PROJECT_ID=$(firebase projects:list | grep CURRENT | awk '{print $1}')
echo "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"
echo ""

# 4. Web SDK Config
echo "4️⃣  Firebase Web SDK Configuration..."
echo "Run: firebase apps:sdkconfig web"
echo "Copy each value to respective GitHub Secret"
echo ""

echo "✅ Manual steps completed. Now set secrets in GitHub."
```

---

## Setting Secrets in GitHub

### Method 1: GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Navigate to **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Enter secret name (e.g., `FIREBASE_TOKEN`)
6. Paste secret value
7. Click **Add secret**

### Method 2: GitHub CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from https://cli.github.com/

# Authenticate
gh auth login

# Set individual secrets
gh secret set FIREBASE_TOKEN -b "1//0abc123...xyz789"
gh secret set FIREBASE_PROJECT_ID -b "studio-revenue-manager-prod"

# Set secret from file
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json

# Set multiple secrets from .env file
while IFS='=' read -r key value; do
  if [[ ! $key =~ ^# && -n $key ]]; then
    gh secret set "$key" -b "$value"
  fi
done < .env.production
```

### Method 3: Bulk Upload Script

Create `upload-secrets.sh`:

```bash
#!/bin/bash

# Read secrets from file and upload to GitHub
SECRETS_FILE=".env.github"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Error: $SECRETS_FILE not found"
  exit 1
fi

while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ ! $key =~ ^# && -n $key ]]; then
    echo "Setting secret: $key"
    gh secret set "$key" -b "$value"
  fi
done < "$SECRETS_FILE"

echo "✅ All secrets uploaded successfully"
```

Usage:

```bash
chmod +x upload-secrets.sh
./upload-secrets.sh
```

---

## Environment-Specific Secrets

### Development Secrets

Create secrets with `DEV_` prefix:

```
DEV_FIREBASE_PROJECT_ID=studio-revenue-manager-dev
DEV_FIREBASE_TOKEN=...
DEV_FIREBASE_SERVICE_ACCOUNT=...
```

### Staging Secrets

Create secrets with `STAGING_` prefix:

```
STAGING_FIREBASE_PROJECT_ID=studio-revenue-manager-staging
STAGING_FIREBASE_TOKEN=...
STAGING_FIREBASE_SERVICE_ACCOUNT=...
```

### Production Secrets

Use unprefixed names or `PROD_` prefix:

```
FIREBASE_PROJECT_ID=studio-revenue-manager-prod
FIREBASE_TOKEN=...
FIREBASE_SERVICE_ACCOUNT=...
```

### GitHub Environments

**Better approach:** Use GitHub Environments

1. Go to Repository Settings > Environments
2. Create environments: `development`, `staging`, `production`
3. Add environment-specific secrets
4. Configure protection rules (approvals, branch restrictions)

**Workflow usage:**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Uses production environment secrets
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

---

## Security Best Practices

### 1. Principle of Least Privilege

- Only grant necessary permissions
- Use read-only tokens when possible
- Separate dev/staging/prod credentials
- Limit secret access to specific workflows

### 2. Secret Management

**DO:**
- ✅ Use GitHub Secrets for all sensitive data
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use different secrets per environment
- ✅ Enable secret scanning
- ✅ Review audit logs regularly
- ✅ Delete unused secrets
- ✅ Document secret purpose and owner

**DON'T:**
- ❌ Commit secrets to Git
- ❌ Share secrets via email/chat
- ❌ Use same secrets across environments
- ❌ Print secrets in logs
- ❌ Store secrets in code comments
- ❌ Use weak or predictable secrets

### 3. Secret Validation

Before setting secrets, validate format:

```bash
# Validate JSON format
echo "$FIREBASE_SERVICE_ACCOUNT" | jq .

# Validate token format
if [[ "$FIREBASE_TOKEN" =~ ^1//[0-9a-zA-Z_-]+ ]]; then
  echo "✅ Valid Firebase token format"
else
  echo "❌ Invalid token format"
fi

# Validate project ID format
if [[ "$FIREBASE_PROJECT_ID" =~ ^[a-z0-9-]+$ ]]; then
  echo "✅ Valid project ID"
else
  echo "❌ Invalid project ID"
fi
```

### 4. Secret Scanning

Enable GitHub secret scanning:

1. Go to Repository Settings > Code security and analysis
2. Enable "Secret scanning"
3. Enable "Push protection"

This prevents accidental commits of secrets.

### 5. Audit Logging

Monitor secret access:

```bash
# View workflow runs
gh run list

# View specific run logs
gh run view [RUN_ID]

# Check for unauthorized access patterns
```

---

## Secret Rotation Policy

### Rotation Schedule

| Secret Type | Rotation Frequency | Priority |
|-------------|-------------------|----------|
| FIREBASE_TOKEN | Every 90 days | HIGH |
| FIREBASE_SERVICE_ACCOUNT | Every 180 days | CRITICAL |
| GOOGLE_CALENDAR_CLIENT_SECRET | Every 90 days | MEDIUM |
| API Keys | Every 90 days | MEDIUM |

### Rotation Process

1. **Generate New Secret**
   ```bash
   # Generate new Firebase token
   firebase login:ci
   ```

2. **Update GitHub Secret**
   ```bash
   gh secret set FIREBASE_TOKEN -b "new_token_value"
   ```

3. **Test Deployment**
   ```bash
   # Trigger test deployment
   git push origin develop
   ```

4. **Verify Success**
   - Check GitHub Actions logs
   - Verify Firebase deployment
   - Test application functionality

5. **Revoke Old Secret**
   - Delete old service account key in Firebase
   - Revoke old OAuth tokens in Google Cloud

6. **Document Rotation**
   - Update rotation log
   - Notify team members
   - Update documentation

### Rotation Checklist

- [ ] Generate new secret value
- [ ] Update GitHub Secret
- [ ] Test in development/staging
- [ ] Deploy to production
- [ ] Verify functionality
- [ ] Revoke old secret
- [ ] Update documentation
- [ ] Notify team

---

## Access Control

### Repository Access Levels

| Role | Read Secrets | Write Secrets | Use in Actions |
|------|-------------|---------------|----------------|
| Admin | No | Yes | Yes |
| Write | No | No | Yes |
| Read | No | No | No |

### Best Practices

1. **Limit Admin Access**
   - Only 2-3 team members should have admin access
   - Use principle of least privilege

2. **Use GitHub Environments**
   - Require approvals for production
   - Restrict deployment branches
   - Add protection rules

3. **Review Access Regularly**
   ```bash
   # List collaborators
   gh api repos/OWNER/REPO/collaborators

   # Review permissions
   gh api repos/OWNER/REPO/collaborators/USERNAME/permission
   ```

4. **Audit Trail**
   - Enable audit logging
   - Review access logs monthly
   - Investigate suspicious activity

---

## Troubleshooting

### Common Issues

#### 1. Secret Not Found

**Error:** `Secret FIREBASE_TOKEN not found`

**Solutions:**
```bash
# List all secrets
gh secret list

# Verify secret name (case-sensitive)
# Correct: FIREBASE_TOKEN
# Incorrect: firebase_token

# Re-add secret
gh secret set FIREBASE_TOKEN -b "token_value"
```

#### 2. Invalid Secret Value

**Error:** `Invalid service account JSON`

**Solutions:**
```bash
# Validate JSON format
cat service-account.json | jq .

# Ensure no line breaks in GitHub Secret
# Use single-line JSON
cat service-account.json | jq -c . | gh secret set FIREBASE_SERVICE_ACCOUNT

# Check for special characters
# Escape if necessary
```

#### 3. Workflow Permission Denied

**Error:** `Permission denied`

**Solutions:**
```bash
# Check workflow permissions
# Settings > Actions > General > Workflow permissions

# Ensure "Read and write permissions" is enabled

# Verify repository access
gh api repos/OWNER/REPO/actions/permissions
```

#### 4. Secret Masking Issues

**Problem:** Secret appears in logs

**Solutions:**
```yaml
# Never echo secrets directly
- run: echo "${{ secrets.FIREBASE_TOKEN }}"  # ❌ DON'T

# Use secret masking
- run: |
    # Secret will be masked as ***
    firebase deploy --token "${{ secrets.FIREBASE_TOKEN }}"
```

### Getting Help

1. **GitHub Documentation**
   - https://docs.github.com/en/actions/security-guides/encrypted-secrets

2. **Firebase Documentation**
   - https://firebase.google.com/docs/cli#cli-ci-systems

3. **Support Channels**
   - GitHub Issues
   - Stack Overflow (`github-actions`, `firebase`)
   - Firebase Support

---

## Secret Checklist

### Initial Setup

- [ ] Generate all required secrets
- [ ] Validate secret formats
- [ ] Set secrets in GitHub
- [ ] Test deployment workflow
- [ ] Document secret purposes
- [ ] Set up rotation schedule
- [ ] Configure access controls
- [ ] Enable secret scanning

### Maintenance

- [ ] Review secrets quarterly
- [ ] Rotate secrets per schedule
- [ ] Audit access logs
- [ ] Remove unused secrets
- [ ] Update documentation
- [ ] Test backup secrets
- [ ] Verify security alerts

---

## Additional Resources

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Firebase CI/CD](https://firebase.google.com/docs/cli#cli-ci-systems)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Environment Setup Guide](../docs/ENVIRONMENT_SETUP.md)
- [Deployment Guide](../docs/FIREBASE_DEPLOYMENT.md)
