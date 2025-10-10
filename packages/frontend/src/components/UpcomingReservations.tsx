import { useQuery } from '@tanstack/react-query';
import { getUpcomingReservations } from '../api/dashboard';
import { format, parseISO, differenceInHours, isSameDay } from 'date-fns';

export default function UpcomingReservations() {
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['upcomingReservations'],
    queryFn: () => getUpcomingReservations(7),
    refetchInterval: 30000,
  });

  // Check for time conflicts
  const hasConflict = (index: number): boolean => {
    if (!reservations || index === 0) return false;

    const current = reservations[index];
    const previous = reservations[index - 1];

    const currentStart = parseISO(current.startTime);
    const previousEnd = parseISO(previous.endTime);

    return (
      isSameDay(currentStart, previousEnd) &&
      differenceInHours(currentStart, previousEnd) < 1
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Reservations</h2>
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
        <h2 className="text-xl font-semibold text-gray-800">Upcoming Reservations</h2>
        <span className="text-sm text-gray-500">Next 7 days</span>
      </div>

      {reservations && reservations.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {reservations.map((reservation, index) => {
            const conflict = hasConflict(index);
            return (
              <div
                key={reservation.id}
                className={`border rounded-lg p-4 transition-all ${
                  conflict
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {conflict && (
                  <div className="flex items-center gap-2 mb-2 text-red-600 text-sm font-medium">
                    <span>⚠️</span>
                    <span>Potential conflict with previous booking</span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{reservation.customerName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(parseISO(reservation.startTime), 'EEE, MMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {format(parseISO(reservation.startTime), 'h:mm a')} -{' '}
                      {format(parseISO(reservation.endTime), 'h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-800">
                      ${reservation.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(
                        differenceInHours(
                          parseISO(reservation.endTime),
                          parseISO(reservation.startTime)
                        ) * 10
                      ) / 10}{' '}
                      hours
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors">
                      View Details
                    </button>
                    <button className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded transition-colors">
                      Reschedule
                    </button>
                  </div>
                  <button className="text-sm text-red-600 hover:text-red-800">Cancel</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📅</div>
          <p>No upcoming reservations</p>
          <button className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
            Create New Reservation
          </button>
        </div>
      )}

      {reservations && reservations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total upcoming: {reservations.length} reservations</span>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View Calendar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
