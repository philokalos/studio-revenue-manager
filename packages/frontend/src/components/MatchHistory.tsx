import type { ImportHistory } from '../types/csvBank';
import { format, parseISO } from 'date-fns';

interface MatchHistoryProps {
  history: ImportHistory[];
  onExport: (startDate?: string, endDate?: string) => Promise<void>;
  onReMatch: (historyId: number) => Promise<void>;
  isLoading?: boolean;
}

export default function MatchHistory({
  history,
  onExport,
  onReMatch,
  isLoading = false,
}: MatchHistoryProps) {
  const handleExport = async () => {
    const startDate = prompt('시작 날짜 (YYYY-MM-DD):');
    const endDate = prompt('종료 날짜 (YYYY-MM-DD):');

    try {
      await onExport(startDate || undefined, endDate || undefined);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getBankTypeLabel = (bankType: string) => {
    const labels: Record<string, string> = {
      KB_KOOKMIN: 'KB 국민은행',
      SHINHAN: '신한은행',
      WOORI: '우리은행',
      HANA: '하나은행',
      NH: 'NH 농협은행',
      DEFAULT: '기타/일반',
    };
    return labels[bankType] || bankType;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">가져오기 기록</h3>
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>내보내기</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  파일명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  은행
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  업로드 날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  전체 행
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  성공
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  실패
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  평균 확신도
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
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    가져오기 기록이 없습니다
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{item.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                        {getBankTypeLabel(item.bankType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(parseISO(item.uploadedAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalRows}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-green-600 font-medium">
                        {item.successfulRows}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-red-600 font-medium">
                        {item.failedRows}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div
                            className={`h-2 rounded-full ${
                              item.averageConfidence >= 80
                                ? 'bg-green-500'
                                : item.averageConfidence >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${item.averageConfidence}%` }}
                          />
                        </div>
                        <span className="text-gray-900 font-medium">
                          {item.averageConfidence.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => onReMatch(item.id)}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        재매칭
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">총 가져오기</p>
            <p className="text-2xl font-bold text-gray-900">{history.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">총 거래 수</p>
            <p className="text-2xl font-bold text-gray-900">
              {history.reduce((sum, item) => sum + item.totalRows, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">성공률</p>
            <p className="text-2xl font-bold text-green-600">
              {(
                (history.reduce((sum, item) => sum + item.successfulRows, 0) /
                  history.reduce((sum, item) => sum + item.totalRows, 0)) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">평균 확신도</p>
            <p className="text-2xl font-bold text-blue-600">
              {(
                history.reduce((sum, item) => sum + item.averageConfidence, 0) /
                history.length
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
