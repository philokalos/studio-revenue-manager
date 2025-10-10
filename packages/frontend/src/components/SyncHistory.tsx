import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendar';
import type { SyncHistoryRecord } from '../types/calendar';
import { SyncDirection, SyncStatus } from '../types/calendar';

interface SyncHistoryProps {
  reservationId?: number;
}

export default function SyncHistory({ reservationId }: SyncHistoryProps) {
  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ['syncHistory', reservationId],
    queryFn: () => calendarApi.getSyncHistory(reservationId),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getStatusBadge = (status: SyncStatus) => {
    const badges = {
      [SyncStatus.SUCCESS]: 'bg-green-100 text-green-800 border-green-200',
      [SyncStatus.FAILED]: 'bg-red-100 text-red-800 border-red-200',
      [SyncStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getDirectionIcon = (direction: SyncDirection) => {
    if (direction === SyncDirection.TO_CALENDAR) {
      return (
        <svg
          className="w-5 h-5 text-blue-600"
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
      );
    }
    return (
      <svg
        className="w-5 h-5 text-purple-600"
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
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-blue-600"
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          Failed to load sync history: {(error as Error).message}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-4 text-sm text-gray-500">No sync history yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Sync operations will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map((record: SyncHistoryRecord) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getDirectionIcon(record.direction)}
                    <span className="text-sm font-medium text-gray-900">
                      {record.direction === SyncDirection.TO_CALENDAR
                        ? 'To Calendar'
                        : 'From Calendar'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(
                      record.status
                    )}`}
                  >
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {record.details?.guestName && (
                      <div>Guest: {record.details.guestName}</div>
                    )}
                    {record.details?.roomName && (
                      <div>Room: {record.details.roomName}</div>
                    )}
                    {record.details?.startDate && record.details?.endDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(record.details.startDate).toLocaleDateString()} -{' '}
                        {new Date(record.details.endDate).toLocaleDateString()}
                      </div>
                    )}
                    {record.eventId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Event ID: {record.eventId.substring(0, 20)}...
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(record.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {record.errorMessage && (
                    <div className="text-sm text-red-600 max-w-xs truncate" title={record.errorMessage}>
                      {record.errorMessage}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
