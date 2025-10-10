import type { QuoteInput, QuoteResponse } from '../types/quote';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function calculateQuote(input: QuoteInput): Promise<QuoteResponse> {
  const response = await fetch(`${API_BASE_URL}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to calculate quote' }));
    throw new Error(error.message || 'Failed to calculate quote');
  }

  return response.json();
}
