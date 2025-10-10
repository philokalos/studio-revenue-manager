import { useState } from 'react';
import type { QuoteResponse } from '../types/quote';

interface QuoteSummaryProps {
  quote: QuoteResponse;
}

export default function QuoteSummary({ quote }: QuoteSummaryProps) {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const generateSummaryText = () => {
    const startTime = new Date(quote.start_time).toLocaleString('ko-KR');
    const endTime = new Date(quote.end_time).toLocaleString('ko-KR');
    const duration = `${Math.floor(quote.total_minutes / 60)}시간 ${quote.total_minutes % 60}분`;

    let text = `=== Studio Rental Quote ===\n\n`;
    text += `Period: ${startTime} - ${endTime}\n`;
    text += `Duration: ${duration}\n\n`;
    text += `--- Price Breakdown ---\n`;

    quote.details.forEach((detail) => {
      text += `${detail.band}: ${detail.slot_count} slots × ${formatCurrency(detail.price_per_slot)} = ${formatCurrency(detail.subtotal)}\n`;
    });

    text += `\nSubtotal: ${formatCurrency(quote.subtotal)}\n`;

    if (quote.discount_amount > 0) {
      text += `Discount (${quote.discount_percentage}%): -${formatCurrency(quote.discount_amount)}\n`;
    }

    text += `\nTotal: ${formatCurrency(quote.total)}\n`;

    return text;
  };

  const handleCopyToClipboard = async () => {
    const text = generateSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleExportPDF = () => {
    // This would integrate with a PDF library like jsPDF or react-pdf
    // For now, we'll show an alert
    alert('PDF export feature will be implemented with jsPDF or react-pdf library');
  };

  const handleCreateReservation = () => {
    // This would navigate to reservation creation page with pre-filled data
    alert('Reservation creation feature will be implemented with navigation to reservation form');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Quote Summary</h2>

      <div className="space-y-3">
        <button
          onClick={handleCopyToClipboard}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>

        <button
          onClick={handleExportPDF}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export to PDF
        </button>

        <button
          onClick={handleCreateReservation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Create Reservation
        </button>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-between">
            <span>View Text Summary</span>
            <svg
              className="w-5 h-5 transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <pre className="mt-3 text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto text-gray-700 whitespace-pre-wrap">
            {generateSummaryText()}
          </pre>
        </details>
      </div>
    </div>
  );
}
