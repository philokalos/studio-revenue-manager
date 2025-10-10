# Firebase Quick Start Guide

Fast-track guide to get Studio Revenue Manager running on Firebase in 15 minutes.

## Prerequisites

- Node.js 18+ installed
- Firebase account (free tier OK for development)
- GitHub account (for CI/CD, optional)

---

## 1. Install Tools (2 minutes)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify
firebase projects:list
```

---

## 2. Create Firebase Project (3 minutes)

```bash
# Create new project
# Or use Firebase Console: https://console.firebase.google.com/

# Enable required services in Firebase Console:
# - Authentication (Email/Password + Google)
# - Firestore Database
# - Cloud Storage
# - Cloud Functions
# - Hosting
```

---

## 3. Configure Environment (3 minutes)

```bash
# Clone repository
git clone https://github.com/your-username/studio-revenue-manager.git
cd studio-revenue-manager

# Install dependencies
npm install

# Get Firebase config
firebase apps:sdkconfig web

# Copy environment template
cp .env.example .env

# Edit .env with your Firebase config
# (use the output from apps:sdkconfig command)
nano .env
```

**Minimum required in `.env`:**

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Enable emulators for local dev
FIREBASE_EMULATOR_ENABLED=true
```

---

## 4. Local Development (2 minutes)

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start app
npm run dev

# Open browser
# Frontend: http://localhost:5173
# Emulator UI: http://localhost:4000
```

---

## 5. Deploy to Firebase (5 minutes)

```bash
# Build project
npm run build

# Initialize Firebase (if not done)
firebase init

# Select services:
# ✓ Firestore
# ✓ Functions
# ✓ Hosting
# ✓ Storage

# Deploy
firebase deploy

# Your app is now live!
# Check URL in terminal output
```

---

## Common Commands

```bash
# Development
npm run dev                    # Start dev server with emulators
firebase emulators:start      # Start emulators only

# Build
npm run build                 # Build for production
npm run type-check           # Type check
npm run lint                 # Lint code

# Deployment
firebase deploy               # Deploy everything
firebase deploy --only hosting    # Deploy hosting only
firebase deploy --only functions  # Deploy functions only

# Monitoring
firebase functions:log        # View function logs
firebase hosting:channel:list # List hosting channels
```

---

## GitHub Actions Setup (Optional)

**For automated deployments on git push:**

```bash
# Generate Firebase CI token
firebase login:ci
# Copy the token

# Add to GitHub Secrets:
# FIREBASE_TOKEN = [your token]
# FIREBASE_PROJECT_ID = your-project-id

# Push to main branch triggers deployment
git push origin main
```

See [SECRETS.md](../.github/SECRETS.md) for complete setup.

---

## Troubleshooting

### Build Fails

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Fails

```bash
# Re-authenticate
firebase logout
firebase login

# Check project
firebase projects:list
firebase use your-project-id

# Try again
firebase deploy
```

### Emulators Won't Start

```bash
# Check ports
lsof -i :8080  # Firestore
lsof -i :9099  # Auth
lsof -i :5001  # Functions

# Kill processes if needed
kill -9 [PID]

# Restart emulators
firebase emulators:start
```

---

## Next Steps

- [ ] **Security:** Review and deploy [Firestore rules](../firestore.rules)
- [ ] **Authentication:** Configure sign-in methods in Firebase Console
- [ ] **Database:** Review [data model](../ERD.md) and create initial collections
- [ ] **Storage:** Configure [storage rules](../storage.rules)
- [ ] **Monitoring:** Set up error tracking and analytics
- [ ] **CI/CD:** Configure [GitHub Actions](../.github/workflows/)

---

## Documentation

**Essential Reading:**

- [Environment Setup](./ENVIRONMENT_SETUP.md) - Complete environment configuration
- [Firebase Deployment](./FIREBASE_DEPLOYMENT.md) - Detailed deployment guide
- [GitHub Secrets](../.github/SECRETS.md) - CI/CD secrets management
- [API Examples](./API_EXAMPLES.md) - API usage examples
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

**Firebase Resources:**

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

## Support

- **Documentation Issues:** Open [GitHub Issue](https://github.com/philokalos/studio-revenue-manager/issues)
- **Firebase Questions:** [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
- **General Help:** See [README.md](../README.md)

---

**Total Setup Time:** ~15 minutes

**Difficulty:** Beginner-friendly with step-by-step instructions
