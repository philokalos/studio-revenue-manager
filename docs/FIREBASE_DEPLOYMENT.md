# Firebase Deployment Guide

Complete deployment guide for Studio Revenue Manager to Firebase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Firebase Setup](#initial-firebase-setup)
- [Environment Configuration](#environment-configuration)
- [GitHub Secrets Setup](#github-secrets-setup)
- [Manual Deployment](#manual-deployment)
- [Automated Deployment (CI/CD)](#automated-deployment-cicd)
- [Environment-Specific Deployments](#environment-specific-deployments)
- [Monitoring and Logs](#monitoring-and-logs)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

1. **Node.js and npm**
   ```bash
   node --version  # v18.0.0 or higher
   npm --version   # v9.0.0 or higher
   ```

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

3. **Git**
   ```bash
   git --version
   ```

### Required Accounts

- Firebase account with billing enabled (Blaze plan)
- GitHub account with repository access
- Google Cloud Platform project (automatically created with Firebase)

---

## Initial Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `studio-revenue-manager`
4. Enable Google Analytics (optional but recommended)
5. Create project

### 2. Enable Firebase Services

```bash
# Enable required services in Firebase Console
# - Authentication (Email/Password, Google)
# - Firestore Database (Native mode)
# - Cloud Storage
# - Cloud Functions
# - Hosting
```

### 3. Configure Firebase Project

1. **Authentication**
   - Enable Email/Password sign-in
   - Enable Google sign-in
   - Add authorized domains for production

2. **Firestore Database**
   - Create database in Native mode
   - Start in production mode
   - Choose region: `us-central1` (or your preferred region)

3. **Storage**
   - Create default storage bucket
   - Same region as Firestore

4. **Functions**
   - Enable Cloud Functions API
   - Set billing account (Blaze plan required)

### 4. Install Firebase CLI and Login

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify login
firebase projects:list
```

### 5. Initialize Firebase in Project

```bash
# Navigate to project directory
cd studio-revenue-manager

# Initialize Firebase (if not already done)
firebase init

# Select services:
# - Firestore
# - Functions
# - Hosting
# - Storage

# Select existing project: studio-revenue-manager
# Accept default settings or customize as needed
```

---

## Environment Configuration

### 1. Get Firebase Configuration

```bash
# Get Web SDK configuration
firebase apps:sdkconfig web

# Output will include:
# - apiKey
# - authDomain
# - projectId
# - storageBucket
# - messagingSenderId
# - appId
```

### 2. Create Service Account

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely (NEVER commit to Git)
4. Note the service account email and project ID

### 3. Configure Local Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Firebase configuration
# See ENVIRONMENT_SETUP.md for detailed instructions
```

### 4. Configure Production Environment

Create separate environment files for each environment:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

---

## GitHub Secrets Setup

### Required GitHub Secrets

Add these secrets in GitHub repository settings (Settings > Secrets and variables > Actions):

1. **FIREBASE_TOKEN**
   ```bash
   # Generate CI token
   firebase login:ci
   # Copy the token and add to GitHub Secrets
   ```

2. **FIREBASE_SERVICE_ACCOUNT**
   ```bash
   # Use the service account JSON content
   # Copy entire JSON content from downloaded file
   # Paste as single-line JSON in GitHub Secret
   ```

3. **FIREBASE_PROJECT_ID**
   ```bash
   # Your Firebase project ID
   # Example: studio-revenue-manager-prod
   ```

4. **VITE_FIREBASE_API_KEY** (and other public config)
   ```bash
   # Firebase Web SDK configuration
   # Safe to expose in client-side code
   ```

### Setting Secrets via GitHub CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from https://cli.github.com/

# Authenticate
gh auth login

# Set secrets
gh secret set FIREBASE_TOKEN < token.txt
gh secret set FIREBASE_PROJECT_ID -b "your-project-id"
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
```

See `.github/SECRETS.md` for complete list and instructions.

---

## Manual Deployment

### Full Deployment

```bash
# Build all packages
npm run build

# Deploy everything to Firebase
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### Step-by-Step Deployment

1. **Build Frontend**
   ```bash
   npm run build:frontend
   # Output: packages/frontend/dist
   ```

2. **Build Backend Functions**
   ```bash
   npm run build:backend
   # Output: functions/lib
   ```

3. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Deploy Storage Rules**
   ```bash
   firebase deploy --only storage
   ```

5. **Deploy Functions**
   ```bash
   firebase deploy --only functions
   ```

6. **Deploy Hosting**
   ```bash
   firebase deploy --only hosting
   ```

### Verify Deployment

```bash
# Check deployment status
firebase hosting:channel:list

# View deployed site
firebase open hosting:site

# Check function logs
firebase functions:log
```

---

## Automated Deployment (CI/CD)

### GitHub Actions Workflow

The project includes automated deployment workflows in `.github/workflows/`:

1. **deploy-production.yml** - Deploys to production on main branch
2. **deploy-staging.yml** - Deploys to staging on develop branch
3. **preview-deploy.yml** - Creates preview deployments for PRs

### Triggering Deployments

**Production Deployment:**
```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main
```

**Staging Deployment:**
```bash
# Push to develop branch
git checkout develop
git push origin develop
```

**Preview Deployment:**
```bash
# Create pull request
# Preview URL will be posted in PR comments
```

### Monitoring CI/CD

1. Go to GitHub repository > Actions tab
2. View workflow runs and logs
3. Check deployment status
4. Review any errors or warnings

---

## Environment-Specific Deployments

### Development Environment

```bash
# Set Firebase project alias
firebase use development

# Deploy to development
firebase deploy --only hosting,functions

# Use development environment variables
cp .env.development .env
npm run build
```

### Staging Environment

```bash
# Set Firebase project alias
firebase use staging

# Deploy to staging
firebase deploy

# Use staging environment variables
cp .env.staging .env
npm run build
```

### Production Environment

```bash
# Set Firebase project alias
firebase use production

# Deploy to production (requires confirmation)
firebase deploy --only hosting,functions

# Use production environment variables
cp .env.production .env
npm run build
```

### Multi-Project Configuration

```json
// .firebaserc
{
  "projects": {
    "default": "studio-revenue-manager-dev",
    "development": "studio-revenue-manager-dev",
    "staging": "studio-revenue-manager-staging",
    "production": "studio-revenue-manager-prod"
  }
}
```

---

## Monitoring and Logs

### Firebase Console

1. **Hosting Metrics**
   - Firebase Console > Hosting > Usage
   - View bandwidth, storage, and requests

2. **Function Logs**
   - Firebase Console > Functions > Logs
   - Filter by function name and severity

3. **Firestore Usage**
   - Firebase Console > Firestore > Usage
   - Monitor reads, writes, and deletes

### Command Line Monitoring

```bash
# Real-time function logs
firebase functions:log --only functionName

# View specific function logs
firebase functions:log --only api

# Filter by severity
firebase functions:log --only api --severity error

# View hosting logs
firebase hosting:channel:list
```

### Cloud Monitoring

```bash
# Google Cloud Console
# - Logs Explorer
# - Metrics Explorer
# - Error Reporting
# - Cloud Trace
```

### Performance Monitoring

```bash
# Enable Performance Monitoring in Firebase Console
# - Go to Performance > Get Started
# - Add SDK to your app
# - View performance data in console
```

---

## Rollback Procedures

### Hosting Rollback

```bash
# List hosting releases
firebase hosting:channel:list

# Deploy previous version
firebase hosting:rollback

# Or specify version
firebase hosting:clone [SOURCE_SITE_ID]:[SOURCE_CHANNEL_ID] [DEST_SITE_ID]:[DEST_CHANNEL_ID]
```

### Functions Rollback

```bash
# Functions don't support direct rollback
# Deploy previous version from Git

# 1. Checkout previous commit
git checkout [PREVIOUS_COMMIT_HASH]

# 2. Rebuild and deploy
npm run build:backend
firebase deploy --only functions

# 3. Return to main branch
git checkout main
```

### Firestore Rules Rollback

```bash
# 1. Restore previous rules from Git
git checkout [PREVIOUS_COMMIT_HASH] -- firestore.rules

# 2. Deploy rules
firebase deploy --only firestore:rules

# 3. Commit changes
git add firestore.rules
git commit -m "Rollback Firestore rules"
```

### Emergency Rollback Procedure

```bash
# 1. Disable functions
firebase functions:delete [FUNCTION_NAME]

# 2. Deploy safe version
git checkout [LAST_KNOWN_GOOD_COMMIT]
firebase deploy

# 3. Investigate issue
# 4. Fix and redeploy
```

---

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Error:** `Build failed with exit code 1`

```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm install
npm run build
```

#### 2. Deployment Permission Errors

**Error:** `Permission denied`

```bash
# Re-authenticate
firebase logout
firebase login

# Check project access
firebase projects:list

# Verify IAM roles in Google Cloud Console
```

#### 3. Function Deployment Timeouts

**Error:** `Deployment timeout`

```bash
# Deploy functions individually
firebase deploy --only functions:functionName

# Increase timeout in firebase.json
{
  "functions": {
    "runtime": "nodejs18",
    "timeout": "540s"
  }
}
```

#### 4. Missing Environment Variables

**Error:** `Firebase config not found`

```bash
# Verify .env file exists
ls -la .env

# Check environment variables are loaded
npm run dev

# Verify Firebase configuration
firebase apps:sdkconfig web
```

#### 5. CORS Issues

**Error:** `CORS policy blocked`

```bash
# Add CORS configuration to functions
# See functions/src/index.ts for CORS setup

# Verify allowed origins in Firebase Console
# Hosting > Settings > Add domain
```

#### 6. Firestore Rules Validation Errors

**Error:** `Invalid security rules`

```bash
# Validate rules locally
firebase emulators:start --only firestore

# Test rules
npm run test:firestore:rules

# Deploy with dry-run
firebase deploy --only firestore:rules --dry-run
```

### Getting Help

1. **Firebase Documentation**
   - https://firebase.google.com/docs

2. **Firebase Support**
   - https://firebase.google.com/support

3. **Stack Overflow**
   - Tag: `firebase`, `google-cloud-functions`

4. **GitHub Issues**
   - Check existing issues in repository

### Performance Optimization

```bash
# Analyze bundle size
npm run build:frontend -- --report

# Optimize functions
# - Use Cloud Functions Gen 2
# - Implement cold start optimization
# - Use caching strategies

# Enable CDN for static assets
# Firebase Hosting automatically uses CDN
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Code linted (`npm run lint`)
- [ ] Type checking passed (`npm run type-check`)
- [ ] Environment variables configured
- [ ] Firebase services enabled
- [ ] Security rules reviewed
- [ ] Database migrations completed (if any)

### Deployment

- [ ] Build successful (`npm run build`)
- [ ] Dry-run deployment checked
- [ ] Backup created (if critical changes)
- [ ] Deploy to staging first
- [ ] Staging verification complete
- [ ] Deploy to production
- [ ] Verify deployment

### Post-Deployment

- [ ] Smoke tests completed
- [ ] Monitoring dashboards checked
- [ ] Error logs reviewed
- [ ] Performance metrics normal
- [ ] User acceptance testing (if applicable)
- [ ] Documentation updated
- [ ] Team notified

---

## Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- [GitHub Secrets Guide](../.github/SECRETS.md)
