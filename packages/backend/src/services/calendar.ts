/**
 * Google Calendar Integration Service
 * Track 4: Bidirectional sync between Studio Reservations and Google Calendar
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  calendarId: string;
}

export interface CalendarEvent {
  id?: string;
  reservationId: number;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
  operation: 'create' | 'update' | 'delete';
}

/**
 * Google Calendar Service
 * Handles OAuth2 authentication and calendar operations
 */
export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  constructor(config: CalendarConfig) {
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.calendarId = config.calendarId;
  }

  /**
   * Set OAuth2 credentials from tokens
   */
  setCredentials(tokens: { access_token: string; refresh_token?: string }) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Create calendar event from reservation
   */
  async createEvent(event: CalendarEvent): Promise<SyncResult> {
    try {
      const calendarEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description || '',
        location: event.location || 'Studio',
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'Asia/Seoul',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'Asia/Seoul',
        },
        attendees: event.attendees?.map((email) => ({ email })) || [],
        extendedProperties: {
          private: {
            reservationId: event.reservationId.toString(),
          },
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: calendarEvent,
      });

      return {
        success: true,
        eventId: response.data.id || undefined,
        operation: 'create',
      };
    } catch (error: any) {
      console.error('Failed to create calendar event:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        operation: 'create',
      };
    }
  }

  /**
   * Update existing calendar event
   */
  async updateEvent(eventId: string, event: CalendarEvent): Promise<SyncResult> {
    try {
      const calendarEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description || '',
        location: event.location || 'Studio',
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'Asia/Seoul',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'Asia/Seoul',
        },
        attendees: event.attendees?.map((email) => ({ email })) || [],
        extendedProperties: {
          private: {
            reservationId: event.reservationId.toString(),
          },
        },
      };

      await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        requestBody: calendarEvent,
      });

      return {
        success: true,
        eventId,
        operation: 'update',
      };
    } catch (error: any) {
      console.error('Failed to update calendar event:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        operation: 'update',
      };
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId: string): Promise<SyncResult> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });

      return {
        success: true,
        eventId,
        operation: 'delete',
      };
    } catch (error: any) {
      console.error('Failed to delete calendar event:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        operation: 'delete',
      };
    }
  }

  /**
   * Get calendar event by ID
   */
  async getEvent(eventId: string): Promise<calendar_v3.Schema$Event | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get calendar event:', error);
      return null;
    }
  }

  /**
   * List calendar events within date range
   */
  async listEvents(
    startDate: Date,
    endDate: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error: any) {
      console.error('Failed to list calendar events:', error);
      return [];
    }
  }

  /**
   * Find calendar event by reservation ID
   */
  async findEventByReservationId(
    reservationId: number
  ): Promise<calendar_v3.Schema$Event | null> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        privateExtendedProperty: [`reservationId=${reservationId}`],
        maxResults: 1,
      });

      return response.data.items?.[0] || null;
    } catch (error: any) {
      console.error('Failed to find calendar event by reservation ID:', error);
      return null;
    }
  }
}

/**
 * Create calendar service instance from environment variables
 */
export function createCalendarService(): CalendarService {
  const config: CalendarConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/oauth2callback',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  };

  return new CalendarService(config);
}
