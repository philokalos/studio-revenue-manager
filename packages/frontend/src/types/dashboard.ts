export interface RevenueSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  todayChange: number;
  weekChange: number;
  monthChange: number;
}

export interface ReservationSummary {
  id: number;
  customerName: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface PaymentStatusSummary {
  pending: number;
  overdue: number;
  paidThisMonth: number;
  paymentMethods: {
    cash: number;
    card: number;
    transfer: number;
    other: number;
  };
}

export interface OccupancyData {
  rate: number;
  totalHoursReserved: number;
  totalAvailableHours: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  previousPeriod?: number;
}

export interface DashboardStats {
  totalReservations: number;
  averageBookingValue: number;
  pendingPaymentsCount: number;
}

export type DateRange = '7days' | '30days' | '90days' | 'custom';

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}
