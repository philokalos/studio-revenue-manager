# Firebase Hosting Deployment Guide

This guide covers deploying the Studio Revenue Manager frontend to Firebase Hosting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Testing](#local-testing)
- [Deployment](#deployment)
- [Environment Management](#environment-management)
- [Preview Channels](#preview-channels)
- [Troubleshooting](#troubleshooting)

## Prerequisites

1. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project** created:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create or select your project
   - Enable Firebase Hosting

3. **Authenticated** with Firebase CLI:
   ```bash
   firebase login
   ```

4. **Firebase Configuration** (from project root):
   ```bash
   firebase use studio-revenue-manager
   ```

## Environment Setup

### 1. Configure Environment Variables

Copy the environment example file:
```bash
cd packages/frontend
cp .env.example .env.production
```

### 2. Update Firebase Credentials

Get credentials from [Firebase Console](https://console.firebase.google.com/) → Project Settings → Web App:

```env
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 3. Update API URL

Set production backend URL:
```env
VITE_API_URL=https://api.yourdomain.com
```

## Local Testing

### 1. Build the Project

From project root:
```bash
cd packages/frontend
npm run build
```

This creates optimized production files in `packages/frontend/dist/`.

### 2. Preview Locally

Test the production build locally:
```bash
npm run preview
```

Or use Firebase emulator:
```bash
firebase serve --only hosting
```

Visit: `http://localhost:4173` (Vite preview) or `http://localhost:5000` (Firebase emulator)

### 3. Verify Build Output

Check the `dist/` directory:
```bash
ls -lh dist/
```

Expected output:
- `index.html` - Main HTML file
- `assets/` - JavaScript, CSS, images, fonts with hashed filenames
- Compressed chunks for code splitting

## Deployment

### Deploy to Production

From project root:
```bash
firebase deploy --only hosting:production
```

Your app will be available at:
- Default: `https://studio-revenue-manager.web.app`
- Custom: `https://studio-revenue-manager.firebaseapp.com`

### Deploy to Staging

```bash
firebase deploy --only hosting:staging
```

### Deploy to Development

```bash
firebase deploy --only hosting:development
```

## Environment Management

### Multiple Environments

The project supports three environments configured in `.firebaserc`:

```json
{
  "targets": {
    "studio-revenue-manager": {
      "hosting": {
        "production": ["studio-revenue-manager"],
        "staging": ["studio-revenue-manager-staging"],
        "development": ["studio-revenue-manager-dev"]
      }
    }
  }
}
```

### Environment-Specific Builds

Use `.env.production`, `.env.staging`, `.env.development` files:

```bash
# Production build
npm run build

# Development build
npm run build -- --mode development

# Staging build
npm run build -- --mode staging
```

## Preview Channels

Preview channels allow testing changes before deploying to production.

### Create a Preview Channel

```bash
firebase hosting:channel:deploy preview-feature-name
```

This creates a temporary URL:
```
https://studio-revenue-manager--preview-feature-name-abc123.web.app
```

### List Active Channels

```bash
firebase hosting:channel:list
```

### Delete a Channel

```bash
firebase hosting:channel:delete preview-feature-name
```

### Set Channel Expiration

```bash
firebase hosting:channel:deploy preview-name --expires 7d
```

## CI/CD Integration

### GitHub Actions Example

See `.github/workflows/deploy-frontend.yml` for automated deployments:

- **Pull Requests**: Deploy to preview channel
- **Merge to staging**: Deploy to staging environment
- **Merge to main**: Deploy to production environment

### Manual Deployment from CI

```yaml
- name: Deploy to Firebase Hosting
  run: |
    cd packages/frontend
    npm run build
    firebase deploy --only hosting:production --token ${{ secrets.FIREBASE_TOKEN }}
```

Get deployment token:
```bash
firebase login:ci
```

## Configuration Details

### Cache Headers

Static assets are cached with optimal strategies:

- **Images/Fonts**: 1 year (`max-age=31536000, immutable`)
- **JS/CSS**: 1 year (`max-age=31536000, immutable`)
- **HTML/JSON**: 1 hour (`max-age=3600, must-revalidate`)

### Security Headers

The following security headers are automatically applied:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` with strict rules
- `Permissions-Policy` with restricted features

### SPA Routing

All routes are rewritten to `/index.html` for client-side routing:

```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

### Internationalization

Default locale is set to Korean (`/ko`):

```json
{
  "i18n": {
    "root": "/ko"
  }
}
```

## Performance Optimization

### Build Optimization

The Vite build is configured for optimal performance:

1. **Code Splitting**: Manual chunks for vendor libraries
2. **Tree Shaking**: Removes unused code
3. **Minification**: ESBuild minifier for fast builds
4. **Asset Optimization**: Images, fonts, and other assets are optimized
5. **Sourcemaps**: Generated for production debugging

### Verification

After deployment, verify:

1. **Lighthouse Score**: Aim for 90+ in all categories
2. **Core Web Vitals**: Monitor LCP, FID, CLS
3. **Bundle Size**: Check for unexpected increases
4. **Load Time**: Test on 3G and WiFi networks

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

### Environment Variables Not Working

- Ensure all variables are prefixed with `VITE_`
- Restart dev server after changes
- Check `.env.production` exists and is correct
- Variables are replaced at build time, not runtime

### Deployment Authorization Error

```bash
# Re-authenticate
firebase login --reauth

# Verify project
firebase use --add
```

### Files Not Updating

- Clear browser cache (hard refresh: Cmd+Shift+R)
- Check Firebase Hosting cache headers
- Verify new deployment completed successfully
- Check CDN propagation (may take a few minutes)

### CSP Errors in Console

Update Content-Security-Policy in `firebase.json` to allow required sources:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; connect-src 'self' https://your-api-domain.com; ..."
}
```

### 404 Errors on Refresh

Ensure rewrites are configured correctly in `firebase.json`:

```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

### Slow Initial Load

1. Check bundle size: `npm run build -- --report`
2. Enable code splitting for large dependencies
3. Implement lazy loading for routes
4. Use CDN for static assets
5. Enable HTTP/2 and compression (automatic on Firebase)

## Useful Commands

```bash
# Login to Firebase
firebase login

# Select project
firebase use studio-revenue-manager

# List projects
firebase projects:list

# Check deployment status
firebase hosting:sites:list

# View deployment history
firebase hosting:clone

# Rollback to previous version
firebase hosting:rollback

# Open Firebase Console
firebase open hosting

# View logs
firebase hosting:logs
```

## Custom Domain Setup

### Add Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `app.studiomorph.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (up to 24 hours)

### DNS Configuration

Add these records to your DNS provider:

```
Type: A
Name: @
Value: (provided by Firebase)

Type: TXT
Name: @
Value: (provided by Firebase for verification)
```

For subdomain:
```
Type: CNAME
Name: app
Value: studio-revenue-manager.web.app
```

## Monitoring

### Firebase Hosting Metrics

View in Firebase Console → Hosting:

- **Bandwidth Usage**: Total data transferred
- **Requests**: Number of requests per period
- **SSL Certificate Status**: Auto-renewed certificates
- **Custom Domain Status**: Domain verification and SSL

### Performance Monitoring

Enable Firebase Performance Monitoring:

```typescript
import { initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';

const app = initializeApp(firebaseConfig);
const perf = getPerformance(app);
```

### Error Tracking

Integrate Sentry or Firebase Crashlytics for error monitoring.

## Support

For issues or questions:

- **Firebase Documentation**: https://firebase.google.com/docs/hosting
- **Firebase Support**: https://firebase.google.com/support
- **Community**: https://stackoverflow.com/questions/tagged/firebase-hosting
- **Project Issues**: https://github.com/your-org/studio-revenue-manager/issues

## Next Steps

After successful deployment:

1. ✅ Set up custom domain
2. ✅ Configure monitoring and analytics
3. ✅ Set up automated deployments (GitHub Actions)
4. ✅ Enable preview channels for PRs
5. ✅ Configure error tracking
6. ✅ Set up performance monitoring
7. ✅ Create backup and rollback procedures
8. ✅ Document incident response process
