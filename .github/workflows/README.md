# GitHub Actions CI/CD Pipeline Documentation

## Overview

This repository uses GitHub Actions for automated testing and deployment to Firebase. The workflows are designed for a monorepo structure with separate workflows for Firebase Functions (backend) and Firebase Hosting (frontend).

## Workflow Files

### Firebase CI/CD Workflows (Phase 4)

#### 1. frontend-test.yml - Frontend Testing Pipeline

**File**: `.github/workflows/frontend-test.yml`

**Purpose**: Automated testing, linting, and type-checking for the React frontend

**Triggers**:
- Push to `main` branch
- Pull requests targeting `main` branch
- Only when changes are made to `packages/frontend/**`

**Jobs**:
- **test**: Runs on Ubuntu Latest with Node.js 20.x
  - Checkout code
  - Setup Node.js with npm caching
  - Cache dependencies with `actions/cache@v3`
  - Install dependencies (`npm ci`)
  - Run linter (`npm run lint`)
  - Run type check (`npm run type-check`)
  - Run tests with coverage (`npm test -- --coverage --watchAll=false`)
  - Build frontend (`npm run build`)
  - Upload coverage reports (30 days retention)
  - Upload build artifacts (7 days retention)

**Working Directory**: `packages/frontend`

**Environment Variables**:
- `CI=true` for test optimization

---

#### 2. functions-test.yml - Firebase Functions Testing Pipeline

**File**: `.github/workflows/functions-test.yml`

**Purpose**: Automated testing, linting, and building for Firebase Functions

**Triggers**:
- Push to `main` branch
- Pull requests targeting `main` branch
- Only when changes are made to `functions/**`

**Jobs**:
- **test**: Runs on Ubuntu Latest with Node.js 20.x
  - Checkout code
  - Setup Node.js with npm caching
  - Cache dependencies with `actions/cache@v3`
  - Install dependencies (`npm ci`)
  - Run linter (`npm run lint`)
  - Build functions (`npm run build`)
  - Run tests with coverage (`npm test -- --coverage`)
  - Upload coverage reports (30 days retention)
  - Upload build artifacts (7 days retention)

**Working Directory**: `functions`

**Environment Variables**:
- `CI=true` for test optimization
- `FIRESTORE_EMULATOR_HOST=localhost:8080`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`

---

#### 3. deploy-frontend.yml - Firebase Hosting Deployment

**File**: `.github/workflows/deploy-frontend.yml`

**Purpose**: Deploy frontend to Firebase Hosting

**Triggers**:
- Push to `main` branch only
- Only when changes are made to `packages/frontend/**`

**Jobs**:
- **deploy**: Deploy to Firebase Hosting
  - Checkout code
  - Setup Node.js 20.x with npm caching
  - Cache dependencies
  - Install dependencies (`npm ci`)
  - Build frontend for production (`npm run build`)
  - Install Firebase CLI globally
  - Deploy to Firebase Hosting using `FIREBASE_TOKEN`
  - Generate deployment summary

**Working Directory**: `packages/frontend`

**Environment Variables**:
- `CI=true`
- `NODE_ENV=production`

**Required GitHub Secrets**:
- `FIREBASE_TOKEN`: Firebase CLI token (obtain with `firebase login:ci`)

---

#### 4. deploy-functions.yml - Firebase Functions Deployment

**File**: `.github/workflows/deploy-functions.yml`

**Purpose**: Deploy backend functions to Firebase Functions

**Triggers**:
- Push to `main` branch only
- Only when changes are made to `functions/**`

**Jobs**:
- **deploy**: Deploy to Firebase Functions
  - Checkout code
  - Setup Node.js 20.x with npm caching
  - Cache dependencies
  - Install dependencies (`npm ci`)
  - Run linter (`npm run lint`)
  - Build functions (`npm run build`)
  - Run tests (`npm test`)
  - Setup Firebase service account credentials
  - Install Firebase CLI globally
  - Deploy to Firebase Functions using `FIREBASE_TOKEN`
  - Cleanup service account file
  - Generate deployment summary

**Working Directory**: `functions`

**Environment Variables**:
- `CI=true`
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON

**Required GitHub Secrets**:
- `FIREBASE_TOKEN`: Firebase CLI token (obtain with `firebase login:ci`)
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON (base64 encoded)

---

### Legacy Workflows (Pre-Firebase Migration)

#### 1. test.yml - Backend Testing Pipeline

**File**: `.github/workflows/test.yml`

**Purpose**: Automated testing for the backend package

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

**Jobs**:
- **test**: Runs on Ubuntu Latest with Node.js 18.x
  - Checkout code
  - Setup Node.js with npm caching
  - Install dependencies (`npm ci`)
  - Run lint (`npm run lint`)
  - Run type check (`npm run type-check`)
  - Run tests (`npm run test`)

**Working Directory**: `packages/backend`

**Configuration Details**:
```yaml
defaults:
  run:
    working-directory: packages/backend
```

---

### 2. deploy-backend.yml - Backend Deployment Pipeline

**File**: `.github/workflows/deploy-backend.yml`

**Purpose**: Build and deploy backend to production

**Triggers**:
- Push to `main` branch only

**Jobs**:

#### Job 1: build
- **Purpose**: Build Docker image for backend
- **Steps**:
  - Checkout code
  - Setup Docker Buildx
  - Build Docker image with caching
  - Tag: `studio-revenue-manager-backend:${github.sha}`
  - Cache: GitHub Actions cache for faster builds

#### Job 2: deploy
- **Purpose**: Deploy backend to production
- **Depends on**: build job
- **Condition**: Only runs on `main` branch
- **Current State**: Placeholder with deployment instructions
- **Steps**:
  - Placeholder step with deployment options documented in comments

**Working Directory**: `packages/backend`

**Deployment Options** (all commented out, ready to configure):
1. **Railway**: Using Railway CLI
2. **Render**: Using Render API
3. **Docker Registry**: Push to Docker Hub/GitHub Container Registry
4. **SSH Deployment**: Deploy via SSH to custom server

---

### 3. frontend-test.yml - Frontend Testing Pipeline

**File**: `.github/workflows/frontend-test.yml`

**Purpose**: Automated testing for frontend package (skeleton for future use)

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

**Jobs**:
- **test**: Runs on Ubuntu Latest with Node.js 18.x
  - Checkout code
  - Setup Node.js with npm caching
  - Install dependencies (`npm ci`)
  - Build frontend (`npm run build`)

**Working Directory**: `packages/frontend`

**Future Configuration** (commented out):
- Lint step
- Type check step
- Test step
- Build artifact upload

---

## Package Scripts

### Backend (`packages/backend/package.json`)

The following scripts are configured and used by the CI/CD pipeline:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "build": "tsc"
  }
}
```

**Dependencies**:
- ESLint with TypeScript support
- TypeScript compiler
- Vitest for testing

---

## CI/CD Workflow Execution Flow

### Firebase CI/CD Flow (Phase 4)

#### On Push to `main` (Production Deployment)

```
┌─────────────────────────────────────────────┐
│  Code pushed to main branch                 │
└────────────┬────────────────────────────────┘
             │
             ├──> frontend-test.yml (if frontend changes)
             │    ├─ Lint & Type Check
             │    ├─ Run Tests with Coverage
             │    ├─ Build Frontend
             │    └─ Upload Artifacts
             │
             ├──> functions-test.yml (if functions changes)
             │    ├─ Lint
             │    ├─ Build Functions
             │    ├─ Run Tests with Coverage
             │    └─ Upload Artifacts
             │
             ├──> deploy-frontend.yml (if frontend changes)
             │    ├─ Build Production Frontend
             │    ├─ Install Firebase CLI
             │    └─ Deploy to Firebase Hosting
             │
             └──> deploy-functions.yml (if functions changes)
                  ├─ Run Quality Checks
                  ├─ Build & Test Functions
                  ├─ Setup Service Account
                  ├─ Install Firebase CLI
                  └─ Deploy to Firebase Functions
```

#### On Pull Request

```
┌─────────────────────────────────────────────┐
│  PR created/updated                         │
└────────────┬────────────────────────────────┘
             │
             ├──> frontend-test.yml (if frontend changes)
             │    ├─ Run all frontend tests
             │    ├─ Verify build succeeds
             │    └─ Upload coverage report
             │
             └──> functions-test.yml (if functions changes)
                  ├─ Run all function tests
                  ├─ Verify build succeeds
                  └─ Upload coverage report
```

**Path-Based Triggering**: Workflows only run when relevant files change:
- `frontend-test.yml` / `deploy-frontend.yml`: `packages/frontend/**`
- `functions-test.yml` / `deploy-functions.yml`: `functions/**`

---

### Legacy CI/CD Flow (Pre-Firebase)

#### On Push to `develop` or `main`

```
┌─────────────────────────────────────┐
│  Code pushed to main/develop        │
└────────────┬────────────────────────┘
             │
             ├──> test.yml (Backend Tests)
             │    ├─ Lint
             │    ├─ Type Check
             │    └─ Unit Tests
             │
             └──> frontend-test.yml (Frontend Build)
                  └─ Build Check
```

#### On Push to `main` (Production)

```
┌─────────────────────────────────────┐
│  Code pushed to main                │
└────────────┬────────────────────────┘
             │
             ├──> test.yml (Backend Tests)
             │    └─ All quality checks
             │
             ├──> deploy-backend.yml
             │    ├─ Build Docker Image
             │    └─ Deploy (placeholder)
             │
             └──> frontend-test.yml
                  └─ Build verification
```

#### On Pull Request

```
┌─────────────────────────────────────┐
│  PR created/updated                 │
└────────────┬────────────────────────┘
             │
             ├──> test.yml
             │    └─ Run all backend tests
             │
             └──> frontend-test.yml
                  └─ Verify frontend builds
```

---

## Local Testing with Act

You can test GitHub Actions workflows locally using [act](https://github.com/nektos/act):

### Installation

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Running Workflows Locally

```bash
# List all workflows
act -l

# Run test workflow
act push -W .github/workflows/test.yml

# Run specific job
act -j test

# Dry run to see what would execute
act -n
```

---

## Configuration Requirements

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

#### Firebase Deployment Secrets (Required)

**`FIREBASE_TOKEN`**
- **Purpose**: Authenticates Firebase CLI for deployments
- **How to obtain**:
  ```bash
  firebase login:ci
  ```
- **Used in**: `deploy-frontend.yml`, `deploy-functions.yml`

**`FIREBASE_SERVICE_ACCOUNT`**
- **Purpose**: Service account credentials for Firebase Functions deployment
- **How to obtain**:
  1. Go to [Firebase Console](https://console.firebase.google.com/)
  2. Select your project
  3. Go to Project Settings → Service Accounts
  4. Click "Generate New Private Key"
  5. Save the JSON file
  6. Add the entire JSON content as the secret value
- **Used in**: `deploy-functions.yml`

---

### Legacy Deployment Secrets (Pre-Firebase)

#### For Railway Deployment
- `RAILWAY_TOKEN`: Railway API token

#### For Render Deployment
- `RENDER_API_KEY`: Render API key
- `RENDER_SERVICE_ID`: Render service ID

#### For Docker Registry
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password/token

#### For SSH Deployment
- `SSH_HOST`: Server hostname/IP
- `SSH_USERNAME`: SSH username
- `SSH_PRIVATE_KEY`: SSH private key

---

## Setting Up Firebase Deployment

### Prerequisites

1. **Firebase Project**: Ensure your Firebase project is created and configured
2. **Firebase CLI**: Install locally for testing:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

### Step-by-Step Setup

#### 1. Generate Firebase Token

```bash
# Login and generate CI token
firebase login:ci

# Copy the token that appears - you'll need it for GitHub Secrets
```

#### 2. Generate Service Account Key

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Copy the entire JSON content

#### 3. Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**:

1. Click **New repository secret**
2. Add `FIREBASE_TOKEN`:
   - Name: `FIREBASE_TOKEN`
   - Value: [paste the token from step 1]
3. Add `FIREBASE_SERVICE_ACCOUNT`:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: [paste the entire JSON from step 2]

#### 4. Verify Configuration

Push a commit to `main` branch and check the Actions tab to verify workflows run successfully.

---

## Enabling Legacy Deployment (Pre-Firebase)

To enable legacy deployment methods, uncomment the relevant sections in `deploy-backend.yml`:

1. Choose your deployment method
2. Configure required GitHub secrets
3. Uncomment the corresponding deployment step
4. Update placeholder values (registry names, service IDs, etc.)

---

## Monitoring and Debugging

### View Workflow Runs
1. Go to repository → Actions tab
2. Select workflow run to view logs
3. Click on job/step to see detailed output

### Common Issues

**Issue**: `npm ci` fails
- **Solution**: Ensure `package-lock.json` is committed

**Issue**: Tests fail in CI but pass locally
- **Solution**: Check environment variables, Node.js version compatibility

**Issue**: Docker build fails
- **Solution**: Verify Dockerfile exists in `packages/backend/`

---

## Best Practices

1. **Always test locally** before pushing to main
2. **Use feature branches** and create PRs for code review
3. **Monitor CI failures** and fix them promptly
4. **Keep dependencies updated** to avoid security vulnerabilities
5. **Use semantic versioning** for releases
6. **Document deployment configuration** in this README

---

## Future Enhancements

- [ ] Add code coverage reporting
- [ ] Implement automated releases with semantic-release
- [ ] Add performance testing in CI
- [ ] Configure dependabot for dependency updates
- [ ] Add deployment notifications (Slack, Discord)
- [ ] Implement blue-green deployment strategy
- [ ] Add rollback mechanism
- [ ] Configure staging environment deployment
