/**
 * Quote calculator types
 */

export interface HeadcountChange {
  time: string; // ISO 8601 datetime string
  newHeadcount: number;
}

export interface QuoteInput {
  start_time: string; // ISO 8601 datetime string
  end_time: string; // ISO 8601 datetime string
  initial_headcount: number;
  headcount_changes?: HeadcountChange[];
  discount_percentage?: number;
}

export interface PricingDetail {
  band: 'WEEKDAY' | 'WEEKEND' | 'NIGHT';
  duration_minutes: number;
  headcount: number;
  price_per_slot: number;
  slot_count: number;
  subtotal: number;
}

export interface QuoteResponse {
  start_time: string;
  end_time: string;
  total_minutes: number;
  details: PricingDetail[];
  subtotal: number;
  discount_amount: number;
  total: number;
  discount_percentage?: number;
}

export interface QuoteFormData {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  initialHeadcount: number;
  headcountChanges: Array<{
    changeDate: string;
    changeTime: string;
    newHeadcount: number;
  }>;
  discountPercentage: number;
}
