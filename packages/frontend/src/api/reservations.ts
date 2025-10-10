import type {
  Reservation,
  CreateReservationInput,
  UpdateReservationInput,
  AddHeadcountChangeInput,
  ReservationFilters,
} from '@/types/reservation';

const API_BASE_URL = 'http://localhost:3000/api';

export const reservationsApi = {
  // Get all reservations with optional filters
  getReservations: async (filters?: ReservationFilters): Promise<Reservation[]> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const url = `${API_BASE_URL}/reservation${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to fetch reservations');
    }

    return response.json();
  },

  // Get single reservation by ID
  getReservation: async (id: number): Promise<Reservation> => {
    const response = await fetch(`${API_BASE_URL}/reservation/${id}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to fetch reservation');
    }

    return response.json();
  },

  // Create new reservation
  createReservation: async (data: CreateReservationInput): Promise<Reservation> => {
    const response = await fetch(`${API_BASE_URL}/reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create reservation');
    }

    return response.json();
  },

  // Update existing reservation
  updateReservation: async (
    id: number,
    data: UpdateReservationInput
  ): Promise<Reservation> => {
    const response = await fetch(`${API_BASE_URL}/reservation/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to update reservation');
    }

    return response.json();
  },

  // Delete reservation
  deleteReservation: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/reservation/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to delete reservation');
    }
  },

  // Add headcount change to reservation
  addHeadcountChange: async (
    id: number,
    data: AddHeadcountChangeInput
  ): Promise<Reservation> => {
    const response = await fetch(`${API_BASE_URL}/reservation/${id}/headcount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to add headcount change');
    }

    return response.json();
  },
};
