import { useNavigate } from 'react-router-dom';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function QuickActionButton({ icon, label, description, onClick, color }: QuickActionButtonProps) {
  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg ${iconBgClasses[color]} flex items-center justify-center text-2xl flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 group-hover:text-gray-900 mb-1">
            {label}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
          →
        </div>
      </div>
    </button>
  );
}

export default function QuickActions() {
  const navigate = useNavigate();

  const handleNewReservation = () => {
    alert('Navigate to New Reservation page');
  };

  const handleCalculateQuote = () => {
    navigate('/quote');
  };

  const handleUploadCSV = () => {
    alert('Navigate to CSV Upload page');
  };

  const handleSyncCalendar = () => {
    alert('Sync with external calendar');
  };

  const handleGenerateReport = () => {
    alert('Open Report Generator');
  };

  const handleViewAnalytics = () => {
    alert('Navigate to Analytics page');
  };

  const handleManageInvoices = () => {
    alert('Navigate to Invoices page');
  };

  const handleSettings = () => {
    alert('Navigate to Settings page');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionButton
          icon="📝"
          label="New Reservation"
          description="Create a new booking"
          onClick={handleNewReservation}
          color="blue"
        />

        <QuickActionButton
          icon="💰"
          label="Calculate Quote"
          description="Generate price estimate"
          onClick={handleCalculateQuote}
          color="green"
        />

        <QuickActionButton
          icon="📊"
          label="Upload CSV"
          description="Import bank transactions"
          onClick={handleUploadCSV}
          color="purple"
        />

        <QuickActionButton
          icon="📅"
          label="Sync Calendar"
          description="Update external calendars"
          onClick={handleSyncCalendar}
          color="orange"
        />

        <QuickActionButton
          icon="📈"
          label="Generate Report"
          description="Create financial reports"
          onClick={handleGenerateReport}
          color="blue"
        />

        <QuickActionButton
          icon="📊"
          label="View Analytics"
          description="Detailed insights & trends"
          onClick={handleViewAnalytics}
          color="purple"
        />

        <QuickActionButton
          icon="🧾"
          label="Manage Invoices"
          description="View & manage payments"
          onClick={handleManageInvoices}
          color="green"
        />

        <QuickActionButton
          icon="⚙️"
          label="Settings"
          description="Configure preferences"
          onClick={handleSettings}
          color="orange"
        />
      </div>
    </div>
  );
}
