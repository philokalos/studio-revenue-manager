# Environment Setup Guide

Complete guide for setting up development, staging, and production environments for Studio Revenue Manager.

## Table of Contents

- [Overview](#overview)
- [Environment Files](#environment-files)
- [Local Development Setup](#local-development-setup)
- [Firebase Emulator Configuration](#firebase-emulator-configuration)
- [Testing Environment Setup](#testing-environment-setup)
- [Production Environment](#production-environment)
- [Environment Variable Reference](#environment-variable-reference)
- [Security Best Practices](#security-best-practices)
- [IDE Configuration](#ide-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Environment Hierarchy

```
Development (Local)
  └── Firebase Emulators
  └── Local environment variables

Staging (Firebase Staging Project)
  └── Real Firebase services
  └── Staging environment variables

Production (Firebase Production Project)
  └── Real Firebase services
  └── Production environment variables
```

### Environment Files

```
.env.example           # Template with all variables (committed to Git)
.env                  # Local development (NEVER commit)
.env.development      # Development environment (NEVER commit)
.env.staging          # Staging environment (NEVER commit)
.env.production       # Production environment (NEVER commit)
.env.test            # Test environment (optional, NEVER commit)
```

---

## Environment Files

### 1. Create Environment Files

```bash
# Copy template for local development
cp .env.example .env

# Create environment-specific files
cp .env.example .env.development
cp .env.example .env.staging
cp .env.example .env.production
```

### 2. Configure Git Ignore

Verify `.gitignore` includes:

```gitignore
# Environment files
.env
.env.local
.env.development
.env.staging
.env.production
.env.test

# Firebase
.firebase/
.firebaserc

# Service account keys
serviceAccountKey*.json
firebase-admin-sdk*.json
```

### 3. Environment File Structure

```bash
# .env (local development)
NODE_ENV=development
FIREBASE_EMULATOR_ENABLED=true
# ... other variables
```

```bash
# .env.staging
NODE_ENV=staging
FIREBASE_EMULATOR_ENABLED=false
# ... staging Firebase config
```

```bash
# .env.production
NODE_ENV=production
FIREBASE_EMULATOR_ENABLED=false
# ... production Firebase config
```

---

## Local Development Setup

### 1. Prerequisites

```bash
# Verify Node.js version
node --version  # Should be v18.0.0 or higher

# Verify npm version
npm --version   # Should be v9.0.0 or higher

# Install Firebase CLI globally
npm install -g firebase-tools

# Verify Firebase CLI
firebase --version
```

### 2. Get Firebase Configuration

#### Option A: From Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon > Project Settings
4. Scroll to "Your apps" section
5. Copy the config object

#### Option B: Using Firebase CLI

```bash
# Login to Firebase
firebase login

# Get SDK config
firebase apps:sdkconfig web
```

### 3. Configure Local Environment

Edit `.env` file:

```bash
# ==============================================================================
# Local Development Configuration
# ==============================================================================

# Environment
NODE_ENV=development

# Firebase Web SDK (Frontend)
VITE_FIREBASE_API_KEY=AIza...YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123

# Firebase Emulators (Local Development)
FIREBASE_EMULATOR_ENABLED=true
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5001
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199

# Application
VITE_APP_NAME="Studio Revenue Manager"
VITE_APP_VERSION=0.1.0
VITE_API_BASE_URL=http://localhost:5001/your-project-id/us-central1

# Feature Flags
VITE_FEATURE_GOOGLE_CALENDAR=true
VITE_FEATURE_ANALYTICS=false
VITE_FEATURE_DEBUG_MODE=true

# Development Tools
VITE_ENABLE_DEVTOOLS=true
VITE_SOURCE_MAPS=true
LOG_LEVEL=debug
```

### 4. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm run type-check
npm run lint
```

### 5. Start Development Server

```bash
# Start Firebase emulators and application
npm run dev

# Or start separately
npm run emulators       # Start Firebase emulators only
npm run dev:frontend    # Start frontend only
npm run dev:backend     # Start backend only
```

---

## Firebase Emulator Configuration

### 1. Install Emulators

```bash
# Install all emulators
firebase init emulators

# Or install specific emulators
firebase setup:emulators:firestore
firebase setup:emulators:auth
firebase setup:emulators:functions
firebase setup:emulators:storage
```

### 2. Emulator Ports

Default ports (configured in `firebase.json`):

```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### 3. Start Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,auth

# Start with data import
firebase emulators:start --import=./firestore-data

# Start with data export on exit
firebase emulators:start --export-on-exit=./firestore-data
```

### 4. Access Emulator UI

Once emulators are running, access the UI at:

```
http://localhost:4000
```

Features:
- View Firestore data
- Manage Auth users
- Test Storage uploads
- View Function logs

### 5. Seed Emulator Data

Create seed data script (`scripts/seed-emulators.ts`):

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  projectId: 'demo-project',
  apiKey: 'demo-api-key',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seedData() {
  // Create test user
  await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');

  // Add test data
  await addDoc(collection(db, 'studios'), {
    name: 'Test Studio',
    createdAt: new Date(),
  });

  console.log('Seed data created successfully');
}

seedData().catch(console.error);
```

Run seed script:

```bash
# Start emulators
firebase emulators:start

# In another terminal, run seed script
npm run seed:emulators
```

---

## Testing Environment Setup

### 1. Test Environment File

Create `.env.test`:

```bash
NODE_ENV=test
FIREBASE_EMULATOR_ENABLED=true
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5001
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199

# Use demo project for tests
VITE_FIREBASE_PROJECT_ID=demo-test-project
VITE_FIREBASE_API_KEY=demo-api-key
```

### 2. Configure Test Runner

Update `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      FIREBASE_EMULATOR_ENABLED: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Test Setup File

Create `tests/setup.ts`:

```typescript
import { beforeAll, afterAll } from 'vitest';

// Set environment to test
process.env.NODE_ENV = 'test';
process.env.FIREBASE_EMULATOR_ENABLED = 'true';

beforeAll(() => {
  // Initialize test environment
  console.log('Setting up test environment');
});

afterAll(() => {
  // Cleanup
  console.log('Tearing down test environment');
});
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests with emulators
firebase emulators:exec "npm test"

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## Production Environment

### 1. Production Environment File

Create `.env.production`:

```bash
# ==============================================================================
# Production Configuration
# ==============================================================================

# Environment
NODE_ENV=production

# Firebase Web SDK (Frontend)
VITE_FIREBASE_API_KEY=AIza...PRODUCTION_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=studio-revenue-manager.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studio-revenue-manager-prod
VITE_FIREBASE_STORAGE_BUCKET=studio-revenue-manager-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:xyz789
VITE_FIREBASE_MEASUREMENT_ID=G-XYZ789

# Emulators (Disabled in production)
FIREBASE_EMULATOR_ENABLED=false

# Application
VITE_APP_NAME="Studio Revenue Manager"
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://us-central1-studio-revenue-manager-prod.cloudfunctions.net

# Feature Flags
VITE_FEATURE_GOOGLE_CALENDAR=true
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_DEBUG_MODE=false

# Production Settings
VITE_ENABLE_DEVTOOLS=false
VITE_SOURCE_MAPS=false
LOG_LEVEL=error
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_REPORTING=true
```

### 2. Service Account Configuration

For backend/functions, create service account file:

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.production.json`
4. **NEVER commit this file to Git**

Configure in functions:

```typescript
// functions/src/config/firebase.ts
import * as admin from 'firebase-admin';

if (process.env.NODE_ENV === 'production') {
  admin.initializeApp({
    credential: admin.credential.cert(
      require('../../serviceAccountKey.production.json')
    ),
  });
} else {
  admin.initializeApp();
}
```

### 3. Build for Production

```bash
# Set production environment
export NODE_ENV=production

# Build all packages
npm run build

# Verify build
npm run type-check
npm run lint
```

### 4. Deploy to Production

```bash
# Use production environment
cp .env.production .env

# Deploy to Firebase
firebase use production
firebase deploy
```

---

## Environment Variable Reference

### Firebase Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API Key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth Domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase Project ID | `my-project` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage Bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase App ID | `1:123:web:abc` |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Google Analytics ID | `G-ABC123` |

### Emulator Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `FIREBASE_EMULATOR_ENABLED` | No | Enable emulators | `false` |
| `FIREBASE_AUTH_EMULATOR_HOST` | No | Auth emulator host | `localhost:9099` |
| `FIREBASE_FIRESTORE_EMULATOR_HOST` | No | Firestore emulator | `localhost:8080` |
| `FIREBASE_FUNCTIONS_EMULATOR_HOST` | No | Functions emulator | `localhost:5001` |
| `FIREBASE_STORAGE_EMULATOR_HOST` | No | Storage emulator | `localhost:9199` |

### Application Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `development`, `staging`, `production` |
| `VITE_APP_NAME` | No | Application name | `Studio Revenue Manager` |
| `VITE_APP_VERSION` | No | Application version | `1.0.0` |
| `VITE_API_BASE_URL` | Yes | Backend API URL | `http://localhost:5001/...` |

### Feature Flags

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_FEATURE_GOOGLE_CALENDAR` | No | Enable Calendar | `true` |
| `VITE_FEATURE_ANALYTICS` | No | Enable Analytics | `false` |
| `VITE_FEATURE_DEBUG_MODE` | No | Enable Debug Mode | `false` |

---

## Security Best Practices

### 1. Environment Variable Management

**DO:**
- Use `.env.example` as template
- Store secrets in GitHub Secrets for CI/CD
- Use different Firebase projects for dev/staging/prod
- Rotate secrets regularly (every 90 days)
- Use strong, randomly generated secrets

**DON'T:**
- Commit `.env` files to Git
- Share environment files via email or chat
- Use production credentials in development
- Hardcode secrets in source code
- Reuse secrets across environments

### 2. Secret Generation

```bash
# Generate secure random string (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate secure password
openssl rand -base64 32

# Generate UUID
node -e "console.log(require('crypto').randomUUID())"
```

### 3. Access Control

- Limit Firebase project access to necessary team members
- Use principle of least privilege for service accounts
- Enable 2FA for all Firebase/Google Cloud accounts
- Review and audit access logs regularly
- Revoke access immediately when team members leave

### 4. Environment Separation

```
Development → Staging → Production
   ↓              ↓          ↓
dev-project  staging-proj  prod-proj
```

Never:
- Mix development and production data
- Test with production credentials
- Deploy from local machine to production

---

## IDE Configuration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    ".env*": "dotenv"
  },
  "files.exclude": {
    "**/.env": false
  }
}
```

Install recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "mikestead.dotenv",
    "toba.vsfire"
  ]
}
```

### Environment Switcher

Add to `package.json`:

```json
{
  "scripts": {
    "env:dev": "cp .env.development .env",
    "env:staging": "cp .env.staging .env",
    "env:prod": "cp .env.production .env"
  }
}
```

Usage:

```bash
# Switch to development
npm run env:dev

# Switch to staging
npm run env:staging

# Switch to production (use with caution)
npm run env:prod
```

---

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading

**Problem:** Variables not available in application

**Solution:**
```bash
# Verify .env file exists
ls -la .env

# Check file format (no spaces around =)
cat .env

# Restart development server
npm run dev
```

#### 2. Firebase Emulators Not Starting

**Problem:** Port conflicts or emulator errors

**Solution:**
```bash
# Check if ports are in use
lsof -i :8080  # Firestore
lsof -i :9099  # Auth
lsof -i :5001  # Functions

# Kill processes using ports
kill -9 [PID]

# Clear emulator data
rm -rf .firebase/

# Reinstall emulators
firebase setup:emulators:all
```

#### 3. Firebase Config Not Found

**Problem:** "Firebase app not initialized"

**Solution:**
```bash
# Verify environment variables
printenv | grep VITE_FIREBASE

# Check Firebase config in browser console
console.log(import.meta.env)

# Ensure variables have VITE_ prefix for frontend
```

#### 4. Permission Denied Errors

**Problem:** Cannot access Firebase services

**Solution:**
```bash
# Re-authenticate
firebase logout
firebase login

# Check project access
firebase projects:list

# Verify service account permissions in GCP Console
```

### Getting Help

1. Check [Firebase Documentation](https://firebase.google.com/docs)
2. Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
4. Open [GitHub Issue](https://github.com/philokalos/studio-revenue-manager/issues)

---

## Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Deployment Guide](./FIREBASE_DEPLOYMENT.md)
- [GitHub Secrets Guide](../.github/SECRETS.md)
