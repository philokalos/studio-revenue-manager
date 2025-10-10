import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getRevenueData } from '../api/dashboard';
import type { DateRange } from '../types/dashboard';

type ChartType = 'line' | 'bar';

export default function RevenueChart() {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showComparison, setShowComparison] = useState(true);

  const getDaysFromRange = (range: DateRange): number => {
    switch (range) {
      case '7days':
        return 7;
      case '30days':
        return 30;
      case '90days':
        return 90;
      default:
        return 30;
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['revenueData', dateRange, showComparison],
    queryFn: () => getRevenueData(getDaysFromRange(dateRange), showComparison),
    refetchInterval: 30000,
  });

  const exportToImage = () => {
    // This would require html2canvas or similar library
    alert('Export to image functionality - would use html2canvas library');
  };

  const exportToPDF = () => {
    // This would require jsPDF or similar library
    alert('Export to PDF functionality - would use jsPDF library');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Revenue Trend</h2>

        <div className="flex flex-wrap gap-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>

          {/* Chart Type Toggle */}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-2 text-sm ${
                chartType === 'line'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-2 text-sm border-l border-gray-300 ${
                chartType === 'bar'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Bar
            </button>
          </div>

          {/* Comparison Toggle */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Show Comparison</span>
          </label>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToImage}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              title="Export to Image"
            >
              📷 PNG
            </button>
            <button
              onClick={exportToPDF}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              title="Export to PDF"
            >
              📄 PDF
            </button>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#666', fontSize: 12 }}
                stroke="#ccc"
              />
              <YAxis
                tick={{ fill: '#666', fontSize: 12 }}
                stroke="#ccc"
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
                name="Current Period"
              />
              {showComparison && (
                <Line
                  type="monotone"
                  dataKey="previousPeriod"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#94a3b8' }}
                  name="Previous Period"
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#666', fontSize: 12 }}
                stroke="#ccc"
              />
              <YAxis
                tick={{ fill: '#666', fontSize: 12 }}
                stroke="#ccc"
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Bar
                dataKey="revenue"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                name="Current Period"
              />
              {showComparison && (
                <Bar
                  dataKey="previousPeriod"
                  fill="#94a3b8"
                  radius={[8, 8, 0, 0]}
                  name="Previous Period"
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {data && data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Revenue:</span>
              <span className="ml-2 font-semibold text-gray-800">
                ${data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Average:</span>
              <span className="ml-2 font-semibold text-gray-800">
                ${Math.round(data.reduce((sum, item) => sum + item.revenue, 0) / data.length).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Peak Day:</span>
              <span className="ml-2 font-semibold text-gray-800">
                ${Math.max(...data.map(item => item.revenue)).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Days with Revenue:</span>
              <span className="ml-2 font-semibold text-gray-800">
                {data.filter(item => item.revenue > 0).length} / {data.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
