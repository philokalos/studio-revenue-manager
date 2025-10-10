export interface HeadcountChange {
  id: number;
  reservation_id: number;
  new_headcount: number;
  change_time: string;
  created_at: string;
}

export interface Reservation {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_time: string;
  end_time: string;
  initial_headcount: number;
  created_at: string;
  updated_at: string;
  headcount_changes?: HeadcountChange[];
}

export interface CreateReservationInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_time: string;
  end_time: string;
  initial_headcount: number;
}

export interface UpdateReservationInput {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  start_time?: string;
  end_time?: string;
  initial_headcount?: number;
}

export interface AddHeadcountChangeInput {
  new_headcount: number;
  change_time: string;
}

export interface ReservationFilters {
  search?: string;
  status?: 'upcoming' | 'past' | 'all';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sort_by?: 'start_time' | 'created_at' | 'customer_name';
  sort_order?: 'asc' | 'desc';
}
