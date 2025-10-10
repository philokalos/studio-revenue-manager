import CalendarSync from '../components/CalendarSync';

/**
 * Demo page showing how to integrate CalendarSync component
 * This can be added to any reservation or booking management page
 */
export default function CalendarDemo() {
  // Example: Get reservationId from URL params or props
  const reservationId = 123; // Replace with actual reservation ID

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Calendar Sync Demo
          </h1>
          <p className="mt-2 text-gray-600">
            Example integration of Google Calendar sync for reservations
          </p>
        </div>

        {/* Calendar Sync Component */}
        <CalendarSync reservationId={reservationId} />

        {/* Usage Instructions */}
        <div className="mt-8 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Integration Guide
          </h2>

          <div className="prose max-w-none">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              1. Connect Google Calendar
            </h3>
            <p className="text-gray-600 mb-4">
              Navigate to <a href="/calendar/settings" className="text-blue-600 hover:text-blue-700">Calendar Settings</a> and
              click "Connect Google Calendar" to authorize the application.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              2. Enable Auto-Sync (Optional)
            </h3>
            <p className="text-gray-600 mb-4">
              In settings, toggle "Automatic Sync" to automatically create calendar events when reservations are created.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              3. Manual Sync
            </h3>
            <p className="text-gray-600 mb-4">
              Use the sync buttons above to manually push reservations to calendar or pull events from calendar.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              4. Monitor Sync History
            </h3>
            <p className="text-gray-600">
              The sync history table shows all sync operations, their status, and any errors that occurred.
            </p>
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Component Usage
          </h2>
          <pre className="text-green-400 text-sm overflow-x-auto">
{`import CalendarSync from '../components/CalendarSync';

// In your reservation detail page
function ReservationDetail({ reservationId }) {
  return (
    <div>
      {/* Other reservation details */}

      <CalendarSync reservationId={reservationId} />
    </div>
  );
}

// For general calendar sync (without specific reservation)
function CalendarManagement() {
  return <CalendarSync />;
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
