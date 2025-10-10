import { useState } from 'react';
import type { TransactionMatch, MatchStatus } from '../types/csvBank';
import { format, parseISO } from 'date-fns';

interface MatchResultsProps {
  matches: TransactionMatch[];
  onConfirm: (matchId: number, status: 'MANUAL' | 'REJECTED') => Promise<void>;
  onManualMatch: (match: TransactionMatch) => void;
  isLoading?: boolean;
}

type FilterStatus = 'ALL' | MatchStatus;
type SortField = 'confidence' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function MatchResults({
  matches,
  onConfirm,
  onManualMatch,
  isLoading = false,
}: MatchResultsProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const filteredMatches = matches.filter((match) => {
    if (filterStatus === 'ALL') return true;
    return match.status === filterStatus;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortField) {
      case 'confidence':
        aValue = a.confidence;
        bValue = b.confidence;
        break;
      case 'date':
        aValue = new Date(a.transaction?.date || 0).getTime();
        bValue = new Date(b.transaction?.date || 0).getTime();
        break;
      case 'amount':
        aValue = a.transaction?.amount || 0;
        bValue = b.transaction?.amount || 0;
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusBadge = (status: MatchStatus) => {
    const badges = {
      AUTO: 'bg-blue-100 text-blue-800',
      MANUAL: 'bg-purple-100 text-purple-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || badges.PENDING;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {(['ALL', 'AUTO', 'MANUAL', 'PENDING', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? '전체' : status}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-600">
          {sortedMatches.length}개의 매칭 결과
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3"></th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>날짜</span>
                    {sortField === 'date' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  거래 내역
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('amount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>금액</span>
                    {sortField === 'amount' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  예약 ID
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('confidence')}
                >
                  <div className="flex items-center space-x-1">
                    <span>확신도</span>
                    {sortField === 'confidence' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : sortedMatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    매칭 결과가 없습니다
                  </td>
                </tr>
              ) : (
                sortedMatches.map((match) => (
                  <>
                    <tr
                      key={match.id}
                      className={`hover:bg-gray-50 ${
                        match.confidence >= 80
                          ? 'bg-green-50'
                          : match.confidence >= 60
                          ? 'bg-yellow-50'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRow(match.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            className={`h-5 w-5 transition-transform ${
                              expandedRows.has(match.id) ? 'rotate-90' : ''
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.transaction?.date
                          ? format(parseISO(match.transaction.date), 'yyyy-MM-dd')
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {match.transaction?.description || '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(match.transaction?.amount || 0)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {match.reservationId || '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                match.confidence >= 80
                                  ? 'bg-green-500'
                                  : match.confidence >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${match.confidence}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${getConfidenceColor(
                              match.confidence
                            )}`}
                          >
                            {match.confidence}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                            match.status
                          )}`}
                        >
                          {match.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm space-x-2">
                        {match.status === 'AUTO' || match.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => onManualMatch(match)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              수동 매칭
                            </button>
                            <button
                              onClick={() => onConfirm(match.id, 'REJECTED')}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              거부
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    {expandedRows.has(match.id) && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">매칭 정보</h4>
                              <p className="text-gray-600">
                                <span className="font-medium">매칭 이유:</span>{' '}
                                {match.matchReason}
                              </p>
                              {match.reservation && (
                                <>
                                  <p className="text-gray-600 mt-1">
                                    <span className="font-medium">고객명:</span>{' '}
                                    {match.reservation.customerName}
                                  </p>
                                  <p className="text-gray-600 mt-1">
                                    <span className="font-medium">예약 금액:</span>{' '}
                                    {formatCurrency(match.reservation.totalAmount)}
                                  </p>
                                </>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">거래 상세</h4>
                              {match.transaction && (
                                <>
                                  <p className="text-gray-600">
                                    <span className="font-medium">거래 유형:</span>{' '}
                                    {match.transaction.type || '-'}
                                  </p>
                                  <p className="text-gray-600 mt-1">
                                    <span className="font-medium">잔액:</span>{' '}
                                    {match.transaction.balance
                                      ? formatCurrency(match.transaction.balance)
                                      : '-'}
                                  </p>
                                  <p className="text-gray-600 mt-1">
                                    <span className="font-medium">등록일:</span>{' '}
                                    {format(parseISO(match.transaction.createdAt), 'yyyy-MM-dd HH:mm')}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
