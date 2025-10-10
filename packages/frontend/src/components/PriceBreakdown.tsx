import type { QuoteResponse } from '../types/quote';

interface PriceBreakdownProps {
  quote: QuoteResponse;
}

const BAND_COLORS = {
  WEEKDAY: 'bg-blue-100 text-blue-800',
  WEEKEND: 'bg-green-100 text-green-800',
  NIGHT: 'bg-purple-100 text-purple-800',
};

const BAND_LABELS = {
  WEEKDAY: 'Weekday',
  WEEKEND: 'Weekend',
  NIGHT: 'Night',
};

export default function PriceBreakdown({ quote }: PriceBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Price Breakdown</h2>

      {/* Timeline visualization */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Time Bands
        </h3>
        <div className="flex gap-2 h-12 rounded-lg overflow-hidden">
          {quote.details.map((detail, index) => {
            const widthPercent = (detail.duration_minutes / quote.total_minutes) * 100;
            return (
              <div
                key={index}
                className={`${BAND_COLORS[detail.band]} transition-all duration-300 flex items-center justify-center text-xs font-medium px-2 relative group`}
                style={{ width: `${widthPercent}%` }}
              >
                <span className="truncate">{BAND_LABELS[detail.band]}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                  <div>{BAND_LABELS[detail.band]}</div>
                  <div>{formatDuration(detail.duration_minutes)}</div>
                  <div>{detail.headcount}명</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed breakdown table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Detailed Breakdown
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Band
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Headcount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate/Slot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slots
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quote.details.map((detail, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BAND_COLORS[detail.band]}`}>
                      {BAND_LABELS[detail.band]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(detail.duration_minutes)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {detail.headcount}명
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(detail.price_per_slot)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {detail.slot_count}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(detail.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price summary */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">{formatCurrency(quote.subtotal)}</span>
        </div>

        {quote.discount_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Discount ({quote.discount_percentage}%)
            </span>
            <span className="text-red-600 font-medium">
              -{formatCurrency(quote.discount_amount)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span className="text-gray-900">Total</span>
          <span className="text-blue-600 transition-all duration-300">
            {formatCurrency(quote.total)}
          </span>
        </div>
      </div>

      {/* Additional info */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Total Duration:</span>
          <span className="font-medium text-gray-900">{formatDuration(quote.total_minutes)}</span>
        </div>
        <div className="flex justify-between">
          <span>Start Time:</span>
          <span className="font-medium text-gray-900">
            {new Date(quote.start_time).toLocaleString('ko-KR')}
          </span>
        </div>
        <div className="flex justify-between">
          <span>End Time:</span>
          <span className="font-medium text-gray-900">
            {new Date(quote.end_time).toLocaleString('ko-KR')}
          </span>
        </div>
      </div>
    </div>
  );
}
