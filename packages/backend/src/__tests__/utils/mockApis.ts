/**
 * Mock External APIs
 * Utilities for mocking external API calls (Google Calendar, etc.)
 */
import nock from 'nock';

export class MockApis {
  /**
   * Mock Google OAuth token endpoint
   */
  static mockGoogleOAuth(success: boolean = true): nock.Scope {
    const scope = nock('https://oauth2.googleapis.com')
      .post('/token');

    if (success) {
      return scope.reply(200, {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer'
      });
    } else {
      return scope.reply(400, {
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      });
    }
  }

  /**
   * Mock Google Calendar event creation
   */
  static mockCalendarCreateEvent(success: boolean = true): nock.Scope {
    const scope = nock('https://www.googleapis.com')
      .post(/\/calendar\/v3\/calendars\/.*\/events/);

    if (success) {
      return scope.reply(200, {
        id: 'mock_event_id',
        summary: 'Test Event',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event?eid=mock_event_id'
      });
    } else {
      return scope.reply(403, {
        error: {
          code: 403,
          message: 'Calendar access denied'
        }
      });
    }
  }

  /**
   * Mock Google Calendar event update
   */
  static mockCalendarUpdateEvent(eventId: string, success: boolean = true): nock.Scope {
    const scope = nock('https://www.googleapis.com')
      .put(new RegExp(`/calendar/v3/calendars/.*/events/${eventId}`));

    if (success) {
      return scope.reply(200, {
        id: eventId,
        summary: 'Updated Event',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
        status: 'confirmed'
      });
    } else {
      return scope.reply(404, {
        error: {
          code: 404,
          message: 'Event not found'
        }
      });
    }
  }

  /**
   * Mock Google Calendar event deletion
   */
  static mockCalendarDeleteEvent(eventId: string, success: boolean = true): nock.Scope {
    const scope = nock('https://www.googleapis.com')
      .delete(new RegExp(`/calendar/v3/calendars/.*/events/${eventId}`));

    if (success) {
      return scope.reply(204);
    } else {
      return scope.reply(404, {
        error: {
          code: 404,
          message: 'Event not found'
        }
      });
    }
  }

  /**
   * Mock Google Calendar list events
   */
  static mockCalendarListEvents(success: boolean = true): nock.Scope {
    const scope = nock('https://www.googleapis.com')
      .get(/\/calendar\/v3\/calendars\/.*\/events/);

    if (success) {
      return scope.reply(200, {
        items: [
          {
            id: 'event1',
            summary: 'Event 1',
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }
          },
          {
            id: 'event2',
            summary: 'Event 2',
            start: { dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
            end: { dateTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString() }
          }
        ]
      });
    } else {
      return scope.reply(403, {
        error: {
          code: 403,
          message: 'Calendar access denied'
        }
      });
    }
  }

  /**
   * Clean up all mocks
   */
  static cleanAll(): void {
    nock.cleanAll();
  }

  /**
   * Enable/disable net connect
   */
  static disableNetConnect(): void {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1'); // Allow local connections
  }

  static enableNetConnect(): void {
    nock.enableNetConnect();
  }
}
