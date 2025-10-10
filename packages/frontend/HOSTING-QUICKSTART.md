# Firebase Hosting Quick Reference

Quick commands for deploying Studio Revenue Manager frontend.

## Prerequisites

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Login to Firebase (once)
firebase login

# Set active project (once)
firebase use studio-revenue-manager
```

## Development Workflow

### Local Development

```bash
# Start dev server
npm run dev

# Dev server runs at http://localhost:5173
```

### Local Testing (Production Build)

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Preview runs at http://localhost:4173
```

### Firebase Emulator

```bash
# From project root
firebase serve --only hosting

# Emulator runs at http://localhost:5000
```

## Deployment Commands

### Quick Deploy (Production)

```bash
# From project root
firebase deploy --only hosting:production
```

### Environment-Specific Deployments

```bash
# Production
firebase deploy --only hosting:production

# Staging
firebase deploy --only hosting:staging

# Development
firebase deploy --only hosting:development
```

### Deploy All Environments

```bash
firebase deploy --only hosting
```

## Preview Channels (for PRs and testing)

### Create Preview

```bash
# Create preview channel
firebase hosting:channel:deploy preview-feature-name

# With expiration (default 7 days)
firebase hosting:channel:deploy preview-feature-name --expires 14d
```

### Manage Previews

```bash
# List all preview channels
firebase hosting:channel:list

# Delete preview channel
firebase hosting:channel:delete preview-feature-name

# Open preview in browser
firebase hosting:channel:open preview-feature-name
```

## Build Verification

### Check Build Output

```bash
# Build and check size
npm run build

# View dist directory
ls -lh dist/

# Expected size: ~500KB initial, ~2MB total
```

### Test Production Build

```bash
# Preview locally
npm run preview

# Check in browser
open http://localhost:4173
```

## Common Issues

### Build Fails

```bash
# Clear and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

### Environment Variables Not Working

```bash
# Ensure .env.production exists
cat .env.production

# Restart after changes
npm run build
```

### Authentication Error

```bash
# Re-authenticate
firebase login --reauth

# Verify project
firebase use --add
```

### Files Not Updating

```bash
# Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
# Check deployment succeeded
firebase hosting:sites:list
```

## Useful Commands

```bash
# Check Firebase CLI version
firebase --version

# List projects
firebase projects:list

# View deployment history
firebase hosting:sites:list

# Open Firebase Console
firebase open hosting

# View logs
firebase hosting:logs

# Get help
firebase help hosting
```

## URLs

After deployment, your app will be available at:

### Default Firebase URLs

- Production: `https://studio-revenue-manager.web.app`
- Production (alt): `https://studio-revenue-manager.firebaseapp.com`
- Staging: `https://studio-revenue-manager-staging.web.app`
- Development: `https://studio-revenue-manager-dev.web.app`

### Preview Channels

- Format: `https://studio-revenue-manager--preview-name-abc123.web.app`

### Custom Domain (after setup)

- Your domain: `https://app.yourdomain.com`

## CI/CD Integration

### GitHub Actions Secret

```bash
# Generate CI token
firebase login:ci

# Add to GitHub Secrets as FIREBASE_TOKEN
```

### Deploy from CI

```yaml
- run: npm run build
- run: firebase deploy --only hosting:production --token ${{ secrets.FIREBASE_TOKEN }}
```

## Performance Checklist

Before deploying to production:

- [ ] Build succeeds without errors
- [ ] Bundle size is reasonable (<500KB initial)
- [ ] Environment variables are correct
- [ ] API URL points to production backend
- [ ] Debug mode is disabled
- [ ] All features tested in preview
- [ ] Lighthouse score >90
- [ ] Load time <3s on 3G

## Monitoring

### Firebase Console

- Bandwidth usage: [Console → Hosting → Usage](https://console.firebase.google.com/)
- Performance: [Console → Performance](https://console.firebase.google.com/)
- Analytics: [Console → Analytics](https://console.firebase.google.com/)

### Browser Testing

```bash
# Check in different browsers
# Chrome, Firefox, Safari, Edge

# Mobile testing
# iOS Safari, Chrome on Android
```

## Rollback

If deployment has issues:

```bash
# View deployment history in Firebase Console
# Or use Firebase CLI to rollback

# Note: Firebase doesn't have built-in rollback
# Best practice: Keep previous build in separate directory
# Or redeploy previous version from git
```

## Support Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Full Deployment Guide](./DEPLOYMENT.md)

## Emergency Contacts

- Firebase Support: https://firebase.google.com/support
- Project Issues: https://github.com/your-org/studio-revenue-manager/issues
- Team Lead: support@studiomorph.com
