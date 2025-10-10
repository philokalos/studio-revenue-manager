import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { calendarApi } from '../api/calendar';
import { CalendarTokens } from '../types/calendar';

const STORAGE_KEY = 'google_calendar_tokens';

export default function CalendarSettings() {
  const [tokens, setTokens] = useState<CalendarTokens | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTokens(parsed);
      } catch (error) {
        console.error('Failed to parse stored tokens:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const autoSyncSetting = localStorage.getItem('calendar_auto_sync');
    if (autoSyncSetting) {
      setAutoSync(autoSyncSetting === 'true');
    }
  }, []);

  const getAuthUrlMutation = useMutation({
    mutationFn: () => calendarApi.getAuthUrl(),
    onSuccess: (data) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to connect to Google Calendar',
      });
    },
  });

  const handleConnect = () => {
    getAuthUrlMutation.mutate();
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('calendar_auto_sync');
    setTokens(null);
    setAutoSync(false);
    setNotification({
      type: 'success',
      message: 'Disconnected from Google Calendar',
    });
  };

  const handleAutoSyncToggle = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    localStorage.setItem('calendar_auto_sync', newValue.toString());
    setNotification({
      type: 'success',
      message: `Auto-sync ${newValue ? 'enabled' : 'disabled'}`,
    });
  };

  const isConnected = !!tokens?.access_token;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Google Calendar Settings
          </h1>

          {/* Notification */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-md ${
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

          {/* Connection Status */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Connection Status
            </h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </p>
                  {isConnected && tokens && (
                    <p className="text-xs text-gray-500 mt-1">
                      Token expires:{' '}
                      {tokens.expiry_date
                        ? new Date(tokens.expiry_date).toLocaleString()
                        : 'Unknown'}
                    </p>
                  )}
                </div>
              </div>
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={getAuthUrlMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
                >
                  {getAuthUrlMutation.isPending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
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
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <span>Connect Google Calendar</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Auto-Sync Settings */}
          {isConnected && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Sync Settings
              </h2>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Automatic Sync
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically sync reservations to Google Calendar when created
                  </p>
                </div>
                <button
                  onClick={handleAutoSyncToggle}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    autoSync ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={autoSync}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoSync ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              How to use Google Calendar integration
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Click "Connect Google Calendar" to authorize access</li>
              <li>You'll be redirected to Google's authorization page</li>
              <li>After approval, you'll return here with your account connected</li>
              <li>Enable auto-sync to automatically create calendar events</li>
              <li>Use the sync dashboard to manually sync individual reservations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
