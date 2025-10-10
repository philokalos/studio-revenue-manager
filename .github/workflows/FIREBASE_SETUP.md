# Firebase CI/CD Setup Guide

Quick reference guide for setting up Firebase CI/CD workflows.

## Required Workflows

All four Firebase workflows are configured and ready:

1. ✅ **frontend-test.yml** - Frontend testing pipeline
2. ✅ **functions-test.yml** - Firebase Functions testing pipeline
3. ✅ **deploy-frontend.yml** - Deploy to Firebase Hosting
4. ✅ **deploy-functions.yml** - Deploy to Firebase Functions

## Quick Setup (5 Minutes)

### Step 1: Generate Firebase CI Token

```bash
firebase login:ci
```

Copy the token that appears. You'll need it in Step 3.

### Step 2: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file
7. Open the file and copy **all** the JSON content

### Step 3: Add GitHub Secrets

Go to: **Your Repository** → **Settings** → **Secrets and variables** → **Actions**

Add two secrets:

#### Secret 1: FIREBASE_TOKEN
```
Name: FIREBASE_TOKEN
Value: [paste token from Step 1]
```

#### Secret 2: FIREBASE_SERVICE_ACCOUNT
```
Name: FIREBASE_SERVICE_ACCOUNT
Value: [paste entire JSON from Step 2]
```

### Step 4: Test Deployment

Push any commit to the `main` branch:

```bash
git add .
git commit -m "test: trigger Firebase deployment"
git push origin main
```

Check the **Actions** tab in your GitHub repository to see the workflows run.

## Workflow Triggers

### Testing Workflows (Run on PR + Push)

- **frontend-test.yml**: Runs when `packages/frontend/**` changes
- **functions-test.yml**: Runs when `functions/**` changes

### Deployment Workflows (Run on Push to main only)

- **deploy-frontend.yml**: Deploys when `packages/frontend/**` changes
- **deploy-functions.yml**: Deploys when `functions/**` changes

## Troubleshooting

### Issue: "FIREBASE_TOKEN not found"

**Solution**: Make sure you added the secret in GitHub Settings → Secrets

### Issue: "Permission denied" during deployment

**Solution**: 
1. Verify your Firebase project ID in `.firebaserc`
2. Ensure the service account has the necessary permissions
3. Check that the service account key is correctly formatted JSON

### Issue: "firebase command not found"

**Solution**: The workflow installs Firebase CLI automatically. If it fails:
- Check the workflow logs for npm installation errors
- Verify Node.js version is 20.x

### Issue: Workflow not triggering

**Solution**: 
1. Verify your commit includes changes to the correct paths
2. Check that workflows are enabled in repository settings
3. Ensure branch protection rules aren't blocking the workflow

## Manual Deployment

To deploy manually from your local machine:

```bash
# Deploy frontend
firebase deploy --only hosting

# Deploy functions
firebase deploy --only functions

# Deploy everything
firebase deploy
```

## Status Badges

Add these to your README.md to show build status:

```markdown
![Frontend Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Frontend%20Tests/badge.svg)
![Functions Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Functions%20Tests/badge.svg)
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repository name.

## Security Notes

- Never commit the service account JSON to your repository
- Rotate your Firebase token regularly
- Use branch protection rules to require CI checks before merging
- Review deployment logs for any sensitive information exposure

## Next Steps

After successful setup:

1. ✅ Configure branch protection rules
2. ✅ Add required status checks for PRs
3. ✅ Set up Slack/Discord notifications (optional)
4. ✅ Configure deployment preview channels (optional)

## Support

For more information:
- [Firebase CI/CD Documentation](https://firebase.google.com/docs/hosting/github-integration)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow README](./README.md) - Detailed workflow documentation
