import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '../api/calendar';
import type { CalendarTokens } from '../types/calendar';
import SyncHistory from './SyncHistory';

const STORAGE_KEY = 'google_calendar_tokens';

interface CalendarSyncProps {
  reservationId?: number;
}

export default function CalendarSync({ reservationId }: CalendarSyncProps) {
  const queryClient = useQueryClient();
  const [tokens] = useState<CalendarTokens | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('last_sync_time');
  });

  const syncToCalendarMutation = useMutation({
    mutationFn: (resId: number) => {
      if (!tokens?.access_token) {
        throw new Error('Not connected to Google Calendar');
      }
      return calendarApi.syncToCalendar({
        reservationId: resId,
        accessToken: tokens.access_token,
      });
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      setLastSyncTime(now);
      localStorage.setItem('last_sync_time', now);
      setNotification({
        type: 'success',
        message: 'Successfully synced to Google Calendar',
      });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to sync to calendar',
      });
    },
  });

  const syncFromCalendarMutation = useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      if (!tokens?.access_token) {
        throw new Error('Not connected to Google Calendar');
      }
      return calendarApi.syncFromCalendar({
        startDate,
        endDate,
        accessToken: tokens.access_token,
      });
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      setLastSyncTime(now);
      localStorage.setItem('last_sync_time', now);
      setNotification({
        type: 'success',
        message: 'Successfully synced from Google Calendar',
      });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to sync from calendar',
      });
    },
  });

  const handleSyncToCalendar = () => {
    if (reservationId) {
      syncToCalendarMutation.mutate(reservationId);
    } else {
      setNotification({
        type: 'error',
        message: 'No reservation ID provided',
      });
    }
  };

  const handleSyncFromCalendar = () => {
    // Default to next 30 days
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    syncFromCalendarMutation.mutate({ startDate, endDate });
  };

  const isConnected = !!tokens?.access_token;
  const isLoading = syncToCalendarMutation.isPending || syncFromCalendarMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-md ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setNotification(null)}
                className="inline-flex text-gray-400 hover:text-gray-500"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Controls */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Calendar Sync Dashboard
          </h2>
          {lastSyncTime && (
            <div className="text-sm text-gray-500">
              Last sync: {new Date(lastSyncTime).toLocaleString()}
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Google Calendar Not Connected
                </h3>
                <p className="mt-2 text-sm text-yellow-700">
                  Please connect your Google Calendar in settings to use sync features.
                </p>
                <a
                  href="/calendar/settings"
                  className="mt-3 inline-block text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Go to Settings →
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Push to Calendar */}
            <button
              onClick={handleSyncToCalendar}
              disabled={isLoading || !reservationId}
              className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {syncToCalendarMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16l-4-4m0 0l4-4m-4 4h18"
                    />
                  </svg>
                  Push to Calendar
                </>
              )}
            </button>

            {/* Pull from Calendar */}
            <button
              onClick={handleSyncFromCalendar}
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed"
            >
              {syncFromCalendarMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                  Pull from Calendar
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Sync History */}
      {isConnected && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sync History
          </h3>
          <SyncHistory reservationId={reservationId} />
        </div>
      )}
    </div>
  );
}
