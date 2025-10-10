import type {
  RevenueSummary,
  ReservationSummary,
  PaymentStatusSummary,
  OccupancyData,
  RevenueDataPoint,
  DashboardStats,
} from '../types/dashboard';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Invoice {
  id: number;
  created_at: string;
  total_amount: number;
  status: string;
  due_date: string;
  paid_at?: string;
  payment_method?: string;
}

interface Reservation {
  id: number;
  customer_name: string;
  start_time: string;
  end_time: string;
  total_amount?: number;
  status?: string;
  created_at: string;
}

// Helper function for API calls
async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  return response.json();
}

// Calculate date ranges
function getDateRanges() {
  const now = new Date();
  return {
    today: startOfDay(now),
    thisWeek: startOfWeek(now, { weekStartsOn: 0 }),
    thisMonth: startOfMonth(now),
    previousWeek: startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 }),
    previousMonth: startOfMonth(subMonths(now, 1)),
  };
}

// Revenue Summary API
export async function getRevenueSummary(): Promise<RevenueSummary> {
  const invoices = await fetchAPI<Invoice[]>('/api/invoice');
  const ranges = getDateRanges();

  const filterByDate = (invoice: Invoice, startDate: Date) =>
    new Date(invoice.created_at) >= startDate;

  const sumRevenue = (filtered: Invoice[]) =>
    filtered.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Current period revenues
  const todayInvoices = invoices.filter((inv) => filterByDate(inv, ranges.today));
  const weekInvoices = invoices.filter((inv) => filterByDate(inv, ranges.thisWeek));
  const monthInvoices = invoices.filter((inv) => filterByDate(inv, ranges.thisMonth));

  // Previous period revenues for comparison
  const prevWeekInvoices = invoices.filter(
    (inv) =>
      new Date(inv.created_at) >= ranges.previousWeek &&
      new Date(inv.created_at) < ranges.thisWeek
  );
  const prevMonthInvoices = invoices.filter(
    (inv) =>
      new Date(inv.created_at) >= ranges.previousMonth &&
      new Date(inv.created_at) < ranges.thisMonth
  );

  const today = sumRevenue(todayInvoices);
  const thisWeek = sumRevenue(weekInvoices);
  const thisMonth = sumRevenue(monthInvoices);
  const total = sumRevenue(invoices);

  const prevWeekTotal = sumRevenue(prevWeekInvoices);
  const prevMonthTotal = sumRevenue(prevMonthInvoices);

  return {
    today,
    thisWeek,
    thisMonth,
    total,
    todayChange: 0, // Can't compare single day easily
    weekChange: prevWeekTotal > 0 ? ((thisWeek - prevWeekTotal) / prevWeekTotal) * 100 : 0,
    monthChange: prevMonthTotal > 0 ? ((thisMonth - prevMonthTotal) / prevMonthTotal) * 100 : 0,
  };
}

// Recent Reservations API
export async function getRecentReservations(limit = 10): Promise<ReservationSummary[]> {
  const reservations = await fetchAPI<Reservation[]>('/api/reservation');

  return reservations
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map((res) => ({
      id: res.id,
      customerName: res.customer_name,
      startTime: res.start_time,
      endTime: res.end_time,
      totalAmount: res.total_amount || 0,
      status: (res.status || 'confirmed') as 'confirmed' | 'pending' | 'cancelled' | 'completed',
      createdAt: res.created_at,
    }));
}

// Upcoming Reservations API
export async function getUpcomingReservations(days = 7): Promise<ReservationSummary[]> {
  const reservations = await fetchAPI<Reservation[]>('/api/reservation');
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return reservations
    .filter((res) => {
      const startTime = new Date(res.start_time);
      return startTime >= now && startTime <= futureDate;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((res) => ({
      id: res.id,
      customerName: res.customer_name,
      startTime: res.start_time,
      endTime: res.end_time,
      totalAmount: res.total_amount || 0,
      status: (res.status || 'confirmed') as 'confirmed' | 'pending' | 'cancelled' | 'completed',
      createdAt: res.created_at,
    }));
}

// Payment Status API
export async function getPaymentStatus(): Promise<PaymentStatusSummary> {
  const invoices = await fetchAPI<Invoice[]>('/api/invoice');
  const now = new Date();
  const monthStart = startOfMonth(now);

  const pending = invoices.filter((inv) => inv.status === 'pending').length;
  const overdue = invoices.filter(
    (inv) => inv.status === 'pending' && new Date(inv.due_date) < now
  ).length;
  const paidThisMonth = invoices.filter(
    (inv) => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at) >= monthStart
  ).length;

  // Count payment methods
  const paymentMethods = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce(
      (acc, inv) => {
        const method = (inv.payment_method || 'other').toLowerCase();
        if (method === 'cash') acc.cash++;
        else if (method === 'card' || method === 'credit_card') acc.card++;
        else if (method === 'transfer' || method === 'bank_transfer') acc.transfer++;
        else acc.other++;
        return acc;
      },
      { cash: 0, card: 0, transfer: 0, other: 0 }
    );

  return {
    pending,
    overdue,
    paidThisMonth,
    paymentMethods,
  };
}

// Occupancy Rate API
export async function getOccupancyRate(
  startDate: Date,
  endDate: Date
): Promise<OccupancyData> {
  const reservations = await fetchAPI<Reservation[]>('/api/reservation');

  const BUSINESS_HOURS_START = 9; // 9 AM
  const BUSINESS_HOURS_END = 23; // 11 PM
  const DAILY_AVAILABLE_HOURS = BUSINESS_HOURS_END - BUSINESS_HOURS_START; // 14 hours

  // Calculate total available hours
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalAvailableHours = daysDiff * DAILY_AVAILABLE_HOURS;

  // Calculate total reserved hours
  const totalHoursReserved = reservations
    .filter((res) => {
      const resStart = new Date(res.start_time);
      return resStart >= startDate && resStart <= endDate;
    })
    .reduce((total, res) => {
      const start = new Date(res.start_time);
      const end = new Date(res.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);

  const rate = totalAvailableHours > 0 ? (totalHoursReserved / totalAvailableHours) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10, // Round to 1 decimal place
    totalHoursReserved: Math.round(totalHoursReserved * 10) / 10,
    totalAvailableHours,
  };
}

// Revenue Data for Charts
export async function getRevenueData(
  days: number,
  includeComparison = true
): Promise<RevenueDataPoint[]> {
  const invoices = await fetchAPI<Invoice[]>('/api/invoice');
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);

  // Generate date range
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const revenueByDate = dateRange.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayRevenue = invoices
      .filter((inv) => {
        const invDate = format(parseISO(inv.created_at), 'yyyy-MM-dd');
        return invDate === dateStr;
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    let previousPeriod: number | undefined;
    if (includeComparison) {
      const compDate = subDays(date, days);
      const compDateStr = format(compDate, 'yyyy-MM-dd');
      previousPeriod = invoices
        .filter((inv) => {
          const invDate = format(parseISO(inv.created_at), 'yyyy-MM-dd');
          return invDate === compDateStr;
        })
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    }

    return {
      date: format(date, 'MMM dd'),
      revenue: dayRevenue,
      previousPeriod: includeComparison ? previousPeriod : undefined,
    };
  });

  return revenueByDate;
}

// Dashboard Stats API
export async function getDashboardStats(): Promise<DashboardStats> {
  const [reservations, invoices] = await Promise.all([
    fetchAPI<Reservation[]>('/api/reservation'),
    fetchAPI<Invoice[]>('/api/invoice'),
  ]);

  const totalReservations = reservations.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const averageBookingValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;
  const pendingPaymentsCount = invoices.filter((inv) => inv.status === 'pending').length;

  return {
    totalReservations,
    averageBookingValue: Math.round(averageBookingValue * 100) / 100,
    pendingPaymentsCount,
  };
}
