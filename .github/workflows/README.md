# GitHub Actions CI/CD Pipeline Documentation

## Overview

This repository uses GitHub Actions for automated testing and deployment. The workflows are designed for a monorepo structure with separate workflows for backend and frontend packages.

## Workflow Files

### 1. test.yml - Backend Testing Pipeline

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

### On Push to `develop` or `main`

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

### On Push to `main` (Production)

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

### On Pull Request

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

### Required GitHub Secrets (when deploying)

Depending on your deployment method, configure the following secrets in GitHub repository settings:

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

## Enabling Deployment

To enable actual deployment, uncomment the relevant sections in `deploy-backend.yml`:

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
