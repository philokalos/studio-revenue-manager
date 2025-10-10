import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { calendarApi } from '../api/calendar';

const STORAGE_KEY = 'google_calendar_tokens';

export default function CalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleCallbackMutation = useMutation({
    mutationFn: (code: string) => calendarApi.handleOAuthCallback(code),
    onSuccess: (data) => {
      // Store tokens in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tokens));

      // Redirect to settings with success message
      navigate('/calendar/settings?success=true', { replace: true });
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to complete authorization');
      // Redirect to settings after 3 seconds
      setTimeout(() => {
        navigate('/calendar/settings?error=true', { replace: true });
      }, 3000);
    },
  });

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authorization was denied or cancelled');
      setTimeout(() => {
        navigate('/calendar/settings?error=true', { replace: true });
      }, 3000);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setTimeout(() => {
        navigate('/calendar/settings?error=true', { replace: true });
      }, 3000);
      return;
    }

    // Exchange code for tokens
    handleCallbackMutation.mutate(code);
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-md rounded-lg p-8">
          {error ? (
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Authorization Failed
              </h2>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <p className="mt-4 text-xs text-gray-500">
                Redirecting to settings...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <svg
                className="animate-spin mx-auto h-12 w-12 text-blue-600"
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
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Completing Authorization
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we connect your Google Calendar...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
