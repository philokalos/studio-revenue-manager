export interface CalendarTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

export interface CalendarAuthUrl {
  authUrl: string;
}

export interface CalendarOAuthResponse {
  tokens: CalendarTokens;
  email?: string;
}

export const SyncDirection = {
  TO_CALENDAR: 'TO_CALENDAR',
  FROM_CALENDAR: 'FROM_CALENDAR'
} as const;

export type SyncDirection = typeof SyncDirection[keyof typeof SyncDirection];

export const SyncStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PENDING: 'PENDING'
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

export interface SyncHistoryRecord {
  id: number;
  reservationId?: number;
  direction: SyncDirection;
  status: SyncStatus;
  timestamp: string;
  errorMessage?: string;
  eventId?: string;
  details?: {
    startDate?: string;
    endDate?: string;
    guestName?: string;
    roomName?: string;
  };
}

export interface SyncToCalendarRequest {
  reservationId: number;
  accessToken: string;
}

export interface SyncFromCalendarRequest {
  startDate: string;
  endDate: string;
  accessToken: string;
}

export interface DeleteCalendarEventRequest {
  eventId: string;
  accessToken: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  eventId?: string;
  syncHistoryId?: number;
}

export interface CalendarSettings {
  isConnected: boolean;
  email?: string;
  autoSync: boolean;
  lastSyncTime?: string;
}
