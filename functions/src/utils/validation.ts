/**
 * Validation utilities
 */
import { https } from 'firebase-functions/v2';

export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);

  if (missing.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `Missing required fields: ${missing.join(', ')}`
    );
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^010-\d{4}-\d{4}$/;
  return phoneRegex.test(phone);
}

export function validateReservationStatus(status: string): boolean {
  return ['CONFIRMED', 'CANCELLED'].includes(status);
}

export function validateQuoteStatus(status: string): boolean {
  return ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'].includes(status);
}

export function validateInvoiceStatus(status: string): boolean {
  return ['OPEN', 'PAID', 'PARTIAL', 'VOID'].includes(status);
}

export function validateChannel(channel: string): boolean {
  return ['default', 'hourplace', 'spacecloud'].includes(channel);
}
