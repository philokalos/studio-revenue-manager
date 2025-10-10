import { useQuery } from '@tanstack/react-query';
import { getPaymentStatus } from '../api/dashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  cash: '#10b981',
  card: '#3b82f6',
  transfer: '#8b5cf6',
  other: '#f59e0b',
};

export default function PaymentStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['paymentStatus'],
    queryFn: getPaymentStatus,
    refetchInterval: 30000,
  });

  const paymentMethodData = data
    ? [
        { name: 'Cash', value: data.paymentMethods.cash, color: COLORS.cash },
        { name: 'Card', value: data.paymentMethods.card, color: COLORS.card },
        { name: 'Transfer', value: data.paymentMethods.transfer, color: COLORS.transfer },
        { name: 'Other', value: data.paymentMethods.other, color: COLORS.other },
      ].filter((item) => item.value > 0)
    : [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Status</h2>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Payment Status</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-800">Pending</span>
            <span className="text-2xl">⏳</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">{data?.pending || 0}</div>
          <div className="text-xs text-yellow-700 mt-1">Invoices awaiting payment</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800">Overdue</span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{data?.overdue || 0}</div>
          <div className="text-xs text-red-700 mt-1">Past due date</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Paid This Month</span>
            <span className="text-2xl">✓</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{data?.paidThisMonth || 0}</div>
          <div className="text-xs text-green-700 mt-1">Successfully collected</div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Method Breakdown</h3>

        {paymentMethodData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => {
                      const name = entry.name || '';
                      const percent = entry.percent || 0;
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} payments`, 'Count']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full md:w-1/2 space-y-3">
              {paymentMethodData.map((method) => (
                <div
                  key={method.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: method.color }}
                    ></div>
                    <span className="font-medium text-gray-700">{method.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{method.value}</div>
                    <div className="text-xs text-gray-500">
                      {(
                        (method.value /
                          paymentMethodData.reduce((sum, m) => sum + m.value, 0)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">💳</div>
            <p>No payment data available</p>
          </div>
        )}
      </div>

      {data && (data.pending > 0 || data.overdue > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {data.overdue > 0 && (
                <span className="text-red-600 font-medium">
                  {data.overdue} overdue payment{data.overdue !== 1 ? 's' : ''} require attention
                </span>
              )}
            </div>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors">
              Manage Payments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
