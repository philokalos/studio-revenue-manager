import { useQuery } from '@tanstack/react-query';
import { getRecentReservations } from '../api/dashboard';
import { format, parseISO } from 'date-fns';

const statusColors = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const statusIcons = {
  confirmed: '✓',
  pending: '⏳',
  cancelled: '✗',
  completed: '✓',
};

export default function RecentActivity() {
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['recentReservations'],
    queryFn: () => getRecentReservations(10),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
        <span className="text-sm text-gray-500">Last 10 reservations</span>
      </div>

      {reservations && reservations.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{reservation.customerName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(parseISO(reservation.startTime), 'MMM dd, yyyy h:mm a')} -{' '}
                    {format(parseISO(reservation.endTime), 'h:mm a')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusColors[reservation.status]
                  }`}
                >
                  {statusIcons[reservation.status]} {reservation.status}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-lg font-bold text-gray-800">
                  ${reservation.totalAmount.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors">
                    View
                  </button>
                  <button className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>No recent reservations</p>
        </div>
      )}
    </div>
  );
}
