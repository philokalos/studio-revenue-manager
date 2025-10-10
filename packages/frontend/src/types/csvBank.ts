export type BankType = 'KB_KOOKMIN' | 'SHINHAN' | 'WOORI' | 'HANA' | 'NH' | 'DEFAULT';

export type MatchStatus = 'AUTO' | 'MANUAL' | 'REJECTED' | 'PENDING';

export interface BankTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  type?: 'DEPOSIT' | 'WITHDRAWAL';
  createdAt: string;
}

export interface TransactionMatch {
  id: number;
  transactionId: number;
  reservationId: number | null;
  confidence: number;
  matchReason: string;
  status: MatchStatus;
  confirmedBy: number | null;
  confirmedAt: string | null;
  createdAt: string;
  transaction?: BankTransaction;
  reservation?: {
    id: number;
    customerName: string;
    totalAmount: number;
    startTime: string;
  };
}

export interface ImportHistory {
  id: number;
  filename: string;
  bankType: BankType;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  averageConfidence: number;
  uploadedBy: number;
  uploadedAt: string;
}

export interface UploadResponse {
  message: string;
  bankType: BankType;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  transactions: BankTransaction[];
}

export interface MatchResponse {
  message: string;
  totalMatches: number;
  highConfidenceMatches: number;
  mediumConfidenceMatches: number;
  lowConfidenceMatches: number;
  matches: TransactionMatch[];
}

export interface ExportParams {
  startDate?: string;
  endDate?: string;
}

export interface MatchFilters {
  status?: MatchStatus;
  minConfidence?: number;
}
