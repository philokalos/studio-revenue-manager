# Google Calendar Integration - Frontend Implementation

## Overview

This document describes the Google Calendar integration UI implementation for the Studio Revenue Manager application.

## Features

### 1. OAuth2 Authentication Flow
- **CalendarSettings.tsx**: Main settings page for connecting/disconnecting Google Calendar
- **CalendarCallback.tsx**: Handles OAuth redirect and token exchange
- Secure token storage in localStorage
- Auto-sync toggle for automatic calendar event creation

### 2. Sync Dashboard
- **CalendarSync.tsx**: Main sync interface with manual sync controls
- Push to Calendar: Sync reservation → Google Calendar event
- Pull from Calendar: Import events from Google Calendar
- Real-time sync status indicators
- Last sync timestamp tracking

### 3. Sync History
- **SyncHistory.tsx**: Detailed sync operation history
- Direction indicators (TO_CALENDAR, FROM_CALENDAR)
- Status badges (SUCCESS, FAILED, PENDING)
- Error message display
- Filterable by reservation
- Auto-refresh every 10 seconds

## File Structure

```
packages/frontend/src/
├── types/
│   └── calendar.ts              # TypeScript type definitions
├── api/
│   └── calendar.ts              # API client functions
├── components/
│   ├── CalendarSync.tsx         # Main sync dashboard component
│   └── SyncHistory.tsx          # Sync history table component
└── pages/
    ├── CalendarSettings.tsx     # Settings and connection page
    ├── CalendarCallback.tsx     # OAuth callback handler
    └── CalendarDemo.tsx         # Demo/example page
```

## API Integration

### Endpoints Used

```typescript
GET  /api/calendar/auth-url
GET  /api/calendar/oauth2callback?code=...
POST /api/calendar/sync-to-calendar
POST /api/calendar/sync-from-calendar
GET  /api/calendar/sync-history/:reservationId
DELETE /api/calendar/event/:eventId
```

### Type Definitions

All types are defined in `src/types/calendar.ts`:

- `CalendarTokens`: OAuth token structure
- `SyncDirection`: TO_CALENDAR | FROM_CALENDAR
- `SyncStatus`: SUCCESS | FAILED | PENDING
- `SyncHistoryRecord`: Complete sync history entry
- And more...

## Component Usage

### CalendarSettings Page

```typescript
import CalendarSettings from './pages/CalendarSettings';

// Add to router
<Route path="/calendar/settings" element={
  <ProtectedRoute>
    <CalendarSettings />
  </ProtectedRoute>
} />
```

### CalendarSync Component

```typescript
import CalendarSync from './components/CalendarSync';

// Use with specific reservation
<CalendarSync reservationId={123} />

// Use for general sync (pulls from calendar)
<CalendarSync />
```

### SyncHistory Component

```typescript
import SyncHistory from './components/SyncHistory';

// Show history for specific reservation
<SyncHistory reservationId={123} />

// Show all sync history
<SyncHistory />
```

## OAuth Flow

1. User clicks "Connect Google Calendar" in CalendarSettings
2. Frontend fetches auth URL from backend (`/api/calendar/auth-url`)
3. User is redirected to Google OAuth consent screen
4. Google redirects to `/calendar/callback?code=...`
5. CalendarCallback component exchanges code for tokens via backend
6. Tokens are stored in localStorage
7. User is redirected back to settings with success message

## Security Considerations

### Token Storage
- Currently using localStorage for token storage
- **TODO**: Consider encryption for sensitive tokens
- **TODO**: Implement token refresh mechanism
- **TODO**: Add token expiration checking

### Best Practices
- Never log tokens or sensitive data
- Clear tokens on disconnect
- Validate token presence before API calls
- Handle expired tokens gracefully

## Error Handling

### OAuth Errors
- Invalid code → Clear message, redirect to settings
- Denied access → User-friendly error message
- Network errors → Retry mechanism with exponential backoff

### Sync Errors
- API failures → Display error notification
- Invalid tokens → Prompt to reconnect
- Network timeouts → Retry option
- Validation errors → Clear error messages

## UI/UX Features

### Loading States
- Spinner animations during OAuth flow
- Loading indicators on sync buttons
- Skeleton screens while fetching history

### Notifications
- Success messages (green with checkmark)
- Error messages (red with X icon)
- Auto-dismiss option
- Manual close button

### Responsive Design
- Mobile-friendly layouts
- Responsive tables
- Touch-friendly buttons
- Proper spacing on all screen sizes

## TanStack Query Integration

All API calls use TanStack Query for:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling
- Loading states

### Query Keys
```typescript
['syncHistory', reservationId] // Sync history for specific reservation
['syncHistory']                // All sync history
```

### Mutations
```typescript
syncToCalendar    // Push reservation to calendar
syncFromCalendar  // Pull events from calendar
deleteEvent       // Remove calendar event
```

## Styling

Built with TailwindCSS using:
- Utility-first approach
- Consistent color palette
- Shadow and border utilities
- Hover and focus states
- Transition animations

### Color Scheme
- Primary: Blue (600, 700)
- Success: Green (50, 100, 200, 400, 800)
- Error: Red (50, 100, 200, 400, 600, 800)
- Warning: Yellow (50, 100, 200, 400, 800)
- Neutral: Gray (50-900)

## Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Tokens stored in localStorage
- [ ] Disconnect clears tokens
- [ ] Auto-sync toggle persists
- [ ] Push to Calendar creates events
- [ ] Pull from Calendar imports events
- [ ] Sync history displays correctly
- [ ] Error states show appropriate messages
- [ ] Loading states display during operations
- [ ] Responsive design works on mobile
- [ ] Token expiration handled gracefully
- [ ] Network errors handled properly

## Future Enhancements

1. **Token Security**
   - Implement encryption for localStorage tokens
   - Use HttpOnly cookies for token storage
   - Add refresh token rotation

2. **Advanced Features**
   - Batch sync multiple reservations
   - Conflict resolution for overlapping events
   - Calendar selection (primary/secondary calendars)
   - Event templates with customization
   - Recurring event support

3. **UI Improvements**
   - Sync progress indicators
   - Detailed sync logs
   - Filter and search sync history
   - Export sync reports
   - Dark mode support

4. **Performance**
   - Implement virtual scrolling for large history
   - Add pagination to sync history
   - Optimize API calls with debouncing
   - Cache sync history with TTL

## Troubleshooting

### Common Issues

**Issue**: "Not connected to Google Calendar" error
- **Solution**: Navigate to /calendar/settings and connect account

**Issue**: Tokens expired
- **Solution**: Disconnect and reconnect Google Calendar

**Issue**: Sync fails silently
- **Solution**: Check network tab for API errors, verify backend is running

**Issue**: Callback page shows error
- **Solution**: Verify redirect URI matches backend OAuth configuration

## Support

For issues or questions:
1. Check sync history for error messages
2. Review browser console for errors
3. Verify backend API is accessible
4. Check OAuth credentials configuration
