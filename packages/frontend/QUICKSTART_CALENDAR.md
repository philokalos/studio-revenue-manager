# Google Calendar Integration - Quick Start Guide

## Overview
This guide will help you quickly integrate Google Calendar sync into your application.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Verify Installation
All required files are already created and configured. No installation needed!

### Step 2: Configure Backend
Ensure your backend is running on `http://localhost:3000` with the following endpoints:
- `GET /api/calendar/auth-url`
- `GET /api/calendar/oauth2callback`
- `POST /api/calendar/sync-to-calendar`
- `POST /api/calendar/sync-from-calendar`
- `GET /api/calendar/sync-history/:reservationId`
- `DELETE /api/calendar/event/:eventId`

### Step 3: Start Frontend
```bash
cd packages/frontend
npm run dev
```

### Step 4: Test the Integration
1. Navigate to `http://localhost:5173/calendar/settings`
2. Click "Connect Google Calendar"
3. Complete OAuth flow
4. Return to see connected status

---

## 📦 What's Included

### Components
- **CalendarSettings** - Main settings page for OAuth connection
- **CalendarCallback** - OAuth redirect handler
- **CalendarSync** - Sync dashboard with manual controls
- **SyncHistory** - Detailed sync operation history

### API Client
- Full TypeScript API client (`src/api/calendar.ts`)
- All backend endpoints integrated
- Comprehensive error handling

### Types
- Complete TypeScript definitions (`src/types/calendar.ts`)
- Strict type safety throughout

---

## 💡 Usage Examples

### Basic Integration
Add sync to any page:

```typescript
import CalendarSync from '../components/CalendarSync';

function MyPage() {
  return (
    <div>
      <h1>Reservations</h1>
      <CalendarSync reservationId={123} />
    </div>
  );
}
```

### Just Show History
Display sync history only:

```typescript
import SyncHistory from '../components/SyncHistory';

function MyPage() {
  return <SyncHistory reservationId={123} />;
}
```

### Settings Link
Add settings link to your navigation:

```typescript
<a href="/calendar/settings">
  Calendar Settings
</a>
```

---

## 🎯 Key Features

### OAuth Flow
- ✅ Secure Google OAuth2 authentication
- ✅ Token storage in localStorage
- ✅ Auto-sync toggle
- ✅ Connection status display

### Sync Operations
- ✅ Push reservations to Google Calendar
- ✅ Pull events from Google Calendar
- ✅ Real-time sync status
- ✅ Comprehensive error handling

### Sync History
- ✅ Complete operation log
- ✅ Direction indicators (TO/FROM Calendar)
- ✅ Status badges (SUCCESS/FAILED/PENDING)
- ✅ Error message display
- ✅ Auto-refresh every 10 seconds

---

## 🔑 Available Routes

```typescript
/calendar/settings  → Calendar connection and settings
/calendar/callback  → OAuth redirect handler (automatic)
/calendar/demo      → Live demo and examples
```

---

## 📚 API Functions

All available in `src/api/calendar.ts`:

```typescript
import { calendarApi } from './api/calendar';

// Get OAuth URL
const { authUrl } = await calendarApi.getAuthUrl();

// Exchange OAuth code for tokens
const { tokens } = await calendarApi.handleOAuthCallback(code);

// Sync to calendar
await calendarApi.syncToCalendar({
  reservationId: 123,
  accessToken: token
});

// Sync from calendar
await calendarApi.syncFromCalendar({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  accessToken: token
});

// Get sync history
const history = await calendarApi.getSyncHistory(123);

// Delete calendar event
await calendarApi.deleteCalendarEvent({
  eventId: 'event123',
  accessToken: token
});
```

---

## 🎨 Customization

### Colors
All colors use TailwindCSS utilities and can be customized in `tailwind.config.js`:

- Primary: `blue-600`, `blue-700`
- Success: `green-50` to `green-800`
- Error: `red-50` to `red-800`
- Warning: `yellow-50` to `yellow-800`

### Token Storage
Tokens are stored in localStorage with key `google_calendar_tokens`. To use a different storage:

1. Update `CalendarSettings.tsx` line 7
2. Update `CalendarCallback.tsx` line 6
3. Update `CalendarSync.tsx` line 5

---

## ⚠️ Important Notes

### Security
- Tokens are stored in localStorage (consider encryption for production)
- Never log tokens or sensitive data
- Clear tokens on disconnect
- Validate tokens before API calls

### OAuth Redirect
Ensure your backend OAuth configuration has the correct redirect URI:
```
http://localhost:5173/calendar/callback
```

### CORS
Backend must allow requests from frontend origin:
```
http://localhost:5173
```

---

## 🐛 Troubleshooting

### "Not connected" error
→ Go to `/calendar/settings` and connect your account

### OAuth fails
→ Check backend OAuth credentials and redirect URI

### Sync fails
→ Verify backend is running and accessible
→ Check browser console for API errors
→ Ensure valid access token

### Tokens expired
→ Disconnect and reconnect in settings

---

## 📖 Full Documentation

For complete documentation, see:
- `CALENDAR_INTEGRATION.md` - Comprehensive integration guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation details and architecture

---

## ✨ Next Steps

1. **Connect Account**
   - Visit `/calendar/settings`
   - Click "Connect Google Calendar"
   - Authorize the app

2. **Test Sync**
   - Go to `/calendar/demo`
   - Try "Push to Calendar"
   - Try "Pull from Calendar"

3. **Integrate into App**
   - Add `<CalendarSync />` to your pages
   - Link to `/calendar/settings` in navigation
   - Monitor sync history

4. **Production Deployment**
   - Configure OAuth credentials
   - Update redirect URIs
   - Consider token encryption
   - Set up monitoring

---

## 🎉 You're Ready!

The Google Calendar integration is fully implemented and ready to use. Start by visiting `/calendar/settings` to connect your account.

**Questions?** Check `CALENDAR_INTEGRATION.md` for detailed documentation.
