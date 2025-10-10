import type {
  CalendarAuthUrl,
  CalendarOAuthResponse,
  SyncToCalendarRequest,
  SyncFromCalendarRequest,
  DeleteCalendarEventRequest,
  SyncResponse,
  SyncHistoryRecord
} from '../types/calendar';

const API_BASE_URL = 'http://localhost:3000/api/calendar';

export const calendarApi = {
  /**
   * Get Google OAuth authorization URL
   */
  async getAuthUrl(): Promise<CalendarAuthUrl> {
    const response = await fetch(`${API_BASE_URL}/auth-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get authorization URL');
    }

    return response.json();
  },

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string): Promise<CalendarOAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/oauth2callback?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exchange OAuth code for tokens');
    }

    return response.json();
  },

  /**
   * Sync reservation to Google Calendar
   */
  async syncToCalendar(request: SyncToCalendarRequest): Promise<SyncResponse> {
    const response = await fetch(`${API_BASE_URL}/sync-to-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sync to calendar');
    }

    return response.json();
  },

  /**
   * Sync events from Google Calendar
   */
  async syncFromCalendar(request: SyncFromCalendarRequest): Promise<SyncResponse> {
    const response = await fetch(`${API_BASE_URL}/sync-from-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sync from calendar');
    }

    return response.json();
  },

  /**
   * Get sync history for a reservation
   */
  async getSyncHistory(reservationId?: number): Promise<SyncHistoryRecord[]> {
    const url = reservationId
      ? `${API_BASE_URL}/sync-history/${reservationId}`
      : `${API_BASE_URL}/sync-history`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync history');
    }

    return response.json();
  },

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(request: DeleteCalendarEventRequest): Promise<SyncResponse> {
    const response = await fetch(`${API_BASE_URL}/event/${request.eventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken: request.accessToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete calendar event');
    }

    return response.json();
  },
};
