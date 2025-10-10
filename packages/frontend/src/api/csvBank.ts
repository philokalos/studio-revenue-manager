import type {
  BankType,
  UploadResponse,
  MatchResponse,
  TransactionMatch,
  ImportHistory,
  ExportParams,
  MatchFilters,
} from '../types/csvBank';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function for API calls
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API call failed: ${response.statusText}`);
  }

  return response.json();
}

// Upload CSV file
export async function uploadCSV(
  file: File,
  bankType: BankType
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bankType', bankType);

  return fetchAPI<UploadResponse>('/api/csv-bank/upload', {
    method: 'POST',
    body: formData,
  });
}

// Match transactions
export async function matchTransactions(params?: {
  transactionIds?: number[];
  startDate?: string;
  endDate?: string;
}): Promise<MatchResponse> {
  return fetchAPI<MatchResponse>('/api/csv-bank/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params || {}),
  });
}

// Get matches with filters
export async function getMatches(
  filters?: MatchFilters
): Promise<{ matches: TransactionMatch[] }> {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.append('status', filters.status);
  }

  if (filters?.minConfidence !== undefined) {
    params.append('minConfidence', filters.minConfidence.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/csv-bank/matches${queryString ? `?${queryString}` : ''}`;

  return fetchAPI<{ matches: TransactionMatch[] }>(endpoint);
}

// Confirm or reject a match
export async function confirmMatch(
  matchId: number,
  status: 'MANUAL' | 'REJECTED',
  reservationId?: number
): Promise<TransactionMatch> {
  return fetchAPI<TransactionMatch>(`/api/csv-bank/matches/${matchId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, reservationId }),
  });
}

// Export results
export async function exportResults(params?: ExportParams): Promise<Blob> {
  const searchParams = new URLSearchParams();

  if (params?.startDate) {
    searchParams.append('startDate', params.startDate);
  }

  if (params?.endDate) {
    searchParams.append('endDate', params.endDate);
  }

  const queryString = searchParams.toString();
  const endpoint = `/api/csv-bank/export${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  return response.blob();
}

// Get import history
export async function getImportHistory(): Promise<{ imports: ImportHistory[] }> {
  return fetchAPI<{ imports: ImportHistory[] }>('/api/csv-bank/history');
}
