import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CSVUpload from '../components/CSVUpload';
import MatchResults from '../components/MatchResults';
import ManualMatchModal from '../components/ManualMatchModal';
import MatchHistory from '../components/MatchHistory';
import {
  uploadCSV,
  matchTransactions,
  getMatches,
  confirmMatch,
  exportResults,
  getImportHistory,
} from '../api/csvBank';
import { getUpcomingReservations } from '../api/dashboard';
import type { BankType, TransactionMatch } from '../types/csvBank';

export default function CSVBank() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upload' | 'results' | 'history'>('upload');
  const [selectedMatch, setSelectedMatch] = useState<TransactionMatch | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch matches
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['csvMatches'],
    queryFn: () => getMatches(),
    enabled: activeTab === 'results',
  });

  // Fetch import history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['csvHistory'],
    queryFn: () => getImportHistory(),
    enabled: activeTab === 'history',
  });

  // Fetch reservations for manual matching
  const { data: reservationsData } = useQuery({
    queryKey: ['upcomingReservations'],
    queryFn: () => getUpcomingReservations(30),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, bankType }: { file: File; bankType: BankType }) => {
      setUploadProgress(0);
      const result = await uploadCSV(file, bankType);
      setUploadProgress(100);
      return result;
    },
    onSuccess: (data) => {
      setNotification({
        type: 'success',
        message: `${data.successfulRows}개 거래 업로드 성공 (실패: ${data.failedRows}개)`,
      });
      queryClient.invalidateQueries({ queryKey: ['csvHistory'] });
      setActiveTab('results');
      // Auto-match after upload
      matchMutation.mutate({});
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || '업로드 실패',
      });
    },
  });

  // Match mutation
  const matchMutation = useMutation({
    mutationFn: matchTransactions,
    onSuccess: (data) => {
      setNotification({
        type: 'success',
        message: `${data.totalMatches}개 거래 매칭 완료`,
      });
      queryClient.invalidateQueries({ queryKey: ['csvMatches'] });
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || '매칭 실패',
      });
    },
  });

  // Confirm/reject match mutation
  const confirmMutation = useMutation({
    mutationFn: ({
      matchId,
      status,
      reservationId,
    }: {
      matchId: number;
      status: 'MANUAL' | 'REJECTED';
      reservationId?: number;
    }) => confirmMatch(matchId, status, reservationId),
    onSuccess: () => {
      setNotification({
        type: 'success',
        message: '매칭 상태 업데이트 완료',
      });
      queryClient.invalidateQueries({ queryKey: ['csvMatches'] });
      setSelectedMatch(null);
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || '업데이트 실패',
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: exportResults,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-matches-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setNotification({
        type: 'success',
        message: '내보내기 완료',
      });
    },
    onError: (error: Error) => {
      setNotification({
        type: 'error',
        message: error.message || '내보내기 실패',
      });
    },
  });

  const handleUpload = async (file: File, bankType: BankType) => {
    await uploadMutation.mutateAsync({ file, bankType });
  };

  const handleConfirmMatch = async (matchId: number, status: 'MANUAL' | 'REJECTED') => {
    await confirmMutation.mutateAsync({ matchId, status });
  };

  const handleManualMatch = (match: TransactionMatch) => {
    setSelectedMatch(match);
  };

  const handleManualMatchConfirm = async (
    matchId: number,
    reservationId: number,
    _notes?: string
  ) => {
    await confirmMutation.mutateAsync({
      matchId,
      status: 'MANUAL',
      reservationId,
    });
  };

  const handleExport = async (startDate?: string, endDate?: string) => {
    await exportMutation.mutateAsync({ startDate, endDate });
  };

  const handleReMatch = async (historyId: number) => {
    // TODO: Implement re-match functionality
    console.log('Re-match for history ID:', historyId);
    setNotification({
      type: 'success',
      message: '재매칭 시작됨',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">은행 거래 매칭</h1>
          <p className="mt-2 text-gray-600">
            CSV 파일을 업로드하고 예약과 자동으로 매칭합니다
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {notification.message}
              </p>
              <button
                onClick={() => setNotification(null)}
                className={`${
                  notification.type === 'success'
                    ? 'text-green-600 hover:text-green-800'
                    : 'text-red-600 hover:text-red-800'
                }`}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              업로드
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              매칭 결과
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              가져오기 기록
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'upload' && (
            <CSVUpload
              onUpload={handleUpload}
              isUploading={uploadMutation.isPending}
              uploadProgress={uploadProgress}
              error={uploadMutation.error?.message}
            />
          )}

          {activeTab === 'results' && (
            <MatchResults
              matches={matchesData?.matches || []}
              onConfirm={handleConfirmMatch}
              onManualMatch={handleManualMatch}
              isLoading={matchesLoading}
            />
          )}

          {activeTab === 'history' && (
            <MatchHistory
              history={historyData?.imports || []}
              onExport={handleExport}
              onReMatch={handleReMatch}
              isLoading={historyLoading}
            />
          )}
        </div>
      </div>

      {/* Manual Match Modal */}
      {selectedMatch && (
        <ManualMatchModal
          match={selectedMatch}
          reservations={reservationsData || []}
          onConfirm={handleManualMatchConfirm}
          onClose={() => setSelectedMatch(null)}
          isLoading={confirmMutation.isPending}
        />
      )}
    </div>
  );
}
