import { useQuery } from '@tanstack/react-query';
import { getRevenueSummary, getDashboardStats, getOccupancyRate } from '../api/dashboard';
import { startOfMonth } from 'date-fns';

interface SummaryCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
  loading?: boolean;
}

function SummaryCard({ title, value, trend, icon, color, loading }: SummaryCardProps) {
  const colorClasses = {
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
  };

  const trendColor = trend && trend > 0 ? 'text-green-600' : trend && trend < 0 ? 'text-red-600' : 'text-gray-600';

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`w-10 h-10 rounded-full ${colorClasses[color]} flex items-center justify-center text-xl`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-2">
        {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center text-sm ${trendColor}`}>
          <span className="mr-1">{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
          <span className="ml-1 text-gray-500">vs previous period</span>
        </div>
      )}
    </div>
  );
}

export default function SummaryCards() {
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenueSummary'],
    queryFn: getRevenueSummary,
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000,
  });

  const { data: occupancy, isLoading: occupancyLoading } = useQuery({
    queryKey: ['occupancyRate'],
    queryFn: () => {
      const now = new Date();
      const startDate = startOfMonth(now);
      return getOccupancyRate(startDate, now);
    },
    refetchInterval: 30000,
  });

  const isLoading = revenueLoading || statsLoading || occupancyLoading;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <SummaryCard
        title="Today's Revenue"
        value={revenue?.today || 0}
        trend={revenue?.todayChange}
        icon="💰"
        color="green"
        loading={isLoading}
      />
      <SummaryCard
        title="This Week"
        value={revenue?.thisWeek || 0}
        trend={revenue?.weekChange}
        icon="📊"
        color="blue"
        loading={isLoading}
      />
      <SummaryCard
        title="This Month"
        value={revenue?.thisMonth || 0}
        trend={revenue?.monthChange}
        icon="📈"
        color="purple"
        loading={isLoading}
      />
      <SummaryCard
        title="Total Revenue"
        value={revenue?.total || 0}
        icon="💵"
        color="green"
        loading={isLoading}
      />
      <SummaryCard
        title="Total Reservations"
        value={stats?.totalReservations || 0}
        icon="📅"
        color="blue"
        loading={isLoading}
      />
      <SummaryCard
        title="Occupancy Rate"
        value={`${occupancy?.rate || 0}%`}
        icon="🏢"
        color="purple"
        loading={isLoading}
      />
      <SummaryCard
        title="Average Booking"
        value={stats?.averageBookingValue || 0}
        icon="💳"
        color="orange"
        loading={isLoading}
      />
      <SummaryCard
        title="Pending Payments"
        value={stats?.pendingPaymentsCount || 0}
        icon="⏳"
        color="orange"
        loading={isLoading}
      />
    </div>
  );
}
