import { useState, useEffect } from 'react';
import type { TransactionMatch } from '../types/csvBank';
import { format, parseISO } from 'date-fns';

interface ManualMatchModalProps {
  match: TransactionMatch | null;
  reservations: Array<{
    id: number;
    customerName: string;
    totalAmount: number;
    startTime: string;
  }>;
  onConfirm: (matchId: number, reservationId: number, notes?: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ManualMatchModal({
  match,
  reservations,
  onConfirm,
  onClose,
  isLoading = false,
}: ManualMatchModalProps) {
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (match?.reservationId) {
      setSelectedReservation(match.reservationId);
    }
  }, [match]);

  if (!match) return null;

  const filteredReservations = reservations.filter((res) => {
    const query = searchQuery.toLowerCase();
    return (
      res.customerName.toLowerCase().includes(query) ||
      res.id.toString().includes(query) ||
      res.totalAmount.toString().includes(query)
    );
  });

  const handleConfirm = async () => {
    if (!selectedReservation) {
      alert('예약을 선택해주세요.');
      return;
    }

    try {
      await onConfirm(match.id, selectedReservation, notes || undefined);
      onClose();
    } catch (error) {
      console.error('Manual match failed:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">수동 매칭</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">거래 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">날짜:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {match.transaction?.date
                    ? format(parseISO(match.transaction.date), 'yyyy-MM-dd')
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">금액:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {formatCurrency(match.transaction?.amount || 0)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">거래 내역:</span>
                <span className="ml-2 text-gray-900">
                  {match.transaction?.description || '-'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">현재 매칭 이유:</span>
                <span className="ml-2 text-gray-900">{match.matchReason}</span>
              </div>
            </div>
          </div>

          {/* Reservation Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              예약 검색
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="고객명, 예약ID, 금액으로 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Reservation List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              예약 선택
            </label>
            <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
              {filteredReservations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  검색 결과가 없습니다
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <label
                      key={reservation.id}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedReservation === reservation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="reservation"
                        value={reservation.id}
                        checked={selectedReservation === reservation.id}
                        onChange={() => setSelectedReservation(reservation.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {reservation.customerName}
                            </p>
                            <p className="text-xs text-gray-500">
                              예약 ID: {reservation.id} |{' '}
                              {format(parseISO(reservation.startTime), 'yyyy-MM-dd HH:mm')}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(reservation.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모 (선택사항)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="수동 매칭 사유나 메모를 입력하세요..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReservation || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? '처리 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
