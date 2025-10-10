# Studio Revenue Manager - Frontend

React + TypeScript + Vite frontend application for Studio Revenue Manager, deployed on Firebase Hosting.

## Tech Stack

- **Framework**: React 19.1
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7.1
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Hosting**: Firebase Hosting

## Prerequisites

- Node.js 18+ and npm
- Firebase CLI: `npm install -g firebase-tools`
- Firebase account and project setup

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy and configure environment file:

```bash
cp .env.example .env.development
```

Edit `.env.development` with your configuration:
- Set `VITE_API_URL` to your backend URL (default: `http://localhost:3000`)
- Add Firebase credentials from Firebase Console
- Adjust feature flags as needed

### 3. Start Development Server

```bash
npm run dev
```

App runs at `http://localhost:5173` with hot module replacement.

## Available Scripts

### Development

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build (port 4173)
npm run lint         # Run ESLint
```

### Firebase Hosting

```bash
# From project root
firebase serve --only hosting              # Test with Firebase emulator
firebase deploy --only hosting:production  # Deploy to production
firebase deploy --only hosting:staging     # Deploy to staging
firebase deploy --only hosting:development # Deploy to development
```

See [HOSTING-QUICKSTART.md](./HOSTING-QUICKSTART.md) for detailed deployment commands.

## Project Structure

```
packages/frontend/
├── public/               # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/         # Base UI components (buttons, inputs, etc.)
│   │   └── ...         # Feature-specific components
│   ├── pages/          # Page components (routes)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and helpers
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Root application component
│   └── main.tsx        # Application entry point
├── .env.example        # Environment variables template
├── .env.development    # Development environment config
├── .env.production     # Production environment config
├── firebase.json       # Firebase Hosting configuration (in project root)
├── vite.config.ts      # Vite build configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in code.

### Required Variables

- `VITE_API_URL` - Backend API URL
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket

### Optional Variables

See [.env.example](./.env.example) for complete list of available configuration options.

### Accessing Variables

```typescript
// In your code
const apiUrl = import.meta.env.VITE_API_URL;
const appName = import.meta.env.VITE_APP_NAME;
```

## Features

### Current Features

- ✅ Dashboard with revenue analytics
- ✅ CSV bank statement upload and processing
- ✅ Transaction categorization
- ✅ Revenue reports and charts
- ✅ Google Calendar integration
- ✅ Multi-language support (Korean/English)
- ✅ Responsive design
- ✅ Dark mode support

### Feature Flags

Enable/disable features via environment variables:

```env
VITE_FEATURE_DASHBOARD=true
VITE_FEATURE_CSV_UPLOAD=true
VITE_FEATURE_CALENDAR=true
VITE_FEATURE_REPORTS=true
VITE_FEATURE_DARK_MODE=true
```

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Write meaningful commit messages
- Use ESLint rules configured in the project

### Component Guidelines

1. **File Naming**: Use PascalCase for components (`UserProfile.tsx`)
2. **Export Pattern**: Use named exports for components
3. **Props**: Define TypeScript interfaces for props
4. **Hooks**: Extract complex logic into custom hooks
5. **Styling**: Use Tailwind CSS utility classes

### Example Component

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UserProfileProps {
  userId: string;
  onUpdate?: () => void;
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      // Update logic
      onUpdate?.();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Button onClick={handleUpdate} disabled={loading}>
        {loading ? 'Updating...' : 'Update Profile'}
      </Button>
    </div>
  );
}
```

## Build Optimization

### Code Splitting

The build is configured with manual chunk splitting for optimal loading:

- `react-vendor`: React core libraries
- `react-query`: TanStack Query
- `charts`: Recharts library
- `ui-vendor`: Radix UI components
- `utils`: Utility libraries
- `icons`: Lucide React icons
- `forms`: React Hook Form
- `file-upload`: React Dropzone

### Performance Budgets

- Initial bundle: <500KB
- Total assets: <2MB
- Code coverage: >80% for critical paths

### Optimization Tips

1. Use dynamic imports for route-based code splitting
2. Implement lazy loading for heavy components
3. Optimize images (WebP, responsive images)
4. Minimize bundle size by auditing dependencies
5. Use production mode for final builds

## Firebase Hosting Configuration

### Cache Strategy

Static assets are cached aggressively:

- **Images/Fonts**: 1 year (immutable)
- **JS/CSS**: 1 year (immutable, with content hashing)
- **HTML**: 1 hour (must-revalidate)

### Security Headers

Production deployment includes:

- Content Security Policy (CSP)
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy with restricted features

### SPA Routing

All routes rewrite to `/index.html` for client-side routing support.

## Deployment

### Local Build and Test

```bash
# Build production bundle
npm run build

# Test production build locally
npm run preview
```

### Deploy to Firebase Hosting

```bash
# From project root
firebase deploy --only hosting:production
```

Your app will be available at:
- `https://studio-revenue-manager.web.app`
- `https://studio-revenue-manager.firebaseapp.com`

### Preview Channels (for testing)

```bash
# Create preview channel for testing
firebase hosting:channel:deploy preview-feature-name
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

#### Environment Variables Not Working

- Ensure variables are prefixed with `VITE_`
- Restart dev server after changing `.env` files
- Check that `.env.production` exists for production builds

#### Hot Module Replacement Not Working

- Check that `vite.config.ts` has correct configuration
- Restart dev server
- Clear browser cache

#### Slow Build Performance

- Check bundle size: `npm run build`
- Review dependencies for unnecessary large packages
- Consider code splitting for large routes

### Getting Help

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Project Issues](https://github.com/your-org/studio-revenue-manager/issues)

## Testing

### Manual Testing Checklist

Before deploying to production:

- [ ] Build succeeds without errors or warnings
- [ ] All routes load correctly
- [ ] Forms submit successfully
- [ ] API integration works
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Dark mode toggle works
- [ ] Performance metrics are acceptable (Lighthouse)

### Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- iOS Safari: iOS 14+
- Chrome on Android: Last 2 versions

## Performance Monitoring

### Metrics to Track

- **Load Time**: <3s on 3G, <1s on WiFi
- **First Contentful Paint (FCP)**: <1.8s
- **Largest Contentful Paint (LCP)**: <2.5s
- **First Input Delay (FID)**: <100ms
- **Cumulative Layout Shift (CLS)**: <0.1

### Tools

- Chrome DevTools Lighthouse
- Firebase Performance Monitoring
- Google Analytics (if configured)
- Web Vitals Chrome extension

## Contributing

1. Create a feature branch from `main`
2. Make your changes following code style guidelines
3. Test thoroughly (build, run, manual testing)
4. Submit pull request with clear description
5. Ensure CI/CD checks pass

## License

Private - Studio Morph

## Support

For questions or issues:

- Email: support@studiomorph.com
- Documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Quick Reference: [HOSTING-QUICKSTART.md](./HOSTING-QUICKSTART.md)

---

**Last Updated**: 2025-01-10
