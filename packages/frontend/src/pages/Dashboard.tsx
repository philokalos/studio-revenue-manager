import SummaryCards from '../components/SummaryCards';
import RevenueChart from '../components/RevenueChart';
import RecentActivity from '../components/RecentActivity';
import UpcomingReservations from '../components/UpcomingReservations';
import PaymentStatus from '../components/PaymentStatus';
import QuickActions from '../components/QuickActions';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎵</div>
              <h1 className="text-xl font-bold text-gray-800">Studio Revenue Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
                Notifications
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
                Profile
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 px-3 py-2 rounded-md hover:bg-red-50 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="mt-1 text-sm text-gray-600">
              Monitor your studio's revenue, reservations, and performance metrics.
            </p>
          </div>

          {/* Summary Cards */}
          <SummaryCards />

          {/* Revenue Chart */}
          <div className="mb-6">
            <RevenueChart />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Activity */}
            <RecentActivity />

            {/* Upcoming Reservations */}
            <UpcomingReservations />
          </div>

          {/* Payment Status */}
          <div className="mb-6">
            <PaymentStatus />
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <QuickActions />
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Studio Revenue Manager &copy; 2025. Last updated: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
