/**
 * Create Reservation Function
 * POST /reservations
 * Auth: Staff or Admin only
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired, validateChannel, validateReservationStatus } from '../utils/validation';
import { verifyToken, requireStaff } from '../utils/auth';

interface CreateReservationRequest {
  googleCalendarEventId?: string;
  startTime: string; // ISO 8601 date string
  endTime: string; // ISO 8601 date string
  initialHeadcount: number;
  channel?: 'default' | 'hourplace' | 'spacecloud';
  status?: 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  needsCorrection?: boolean;
  payerName?: string;
  phone?: string;
  peopleCount?: number;
  parkingCount?: number;
  shootingPurpose?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export const createReservation = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept POST requests
      if (request.method !== 'POST') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication and authorization
      const user = await verifyToken(request);
      requireStaff(user); // Staff or admin only

      const data = request.body as CreateReservationRequest;

      // Validate required fields
      validateRequired(data, ['startTime', 'endTime', 'initialHeadcount']);

      // Validate field formats
      if (data.channel && !validateChannel(data.channel)) {
        response.status(400).json(errorResponse('Invalid channel value'));
        return;
      }

      if (data.status && !validateReservationStatus(data.status)) {
        response.status(400).json(errorResponse('Invalid status value'));
        return;
      }

      // Validate dates
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        response.status(400).json(errorResponse('Invalid date format'));
        return;
      }

      if (endTime <= startTime) {
        response.status(400).json(errorResponse('End time must be after start time'));
        return;
      }

      // Validate initialHeadcount
      if (typeof data.initialHeadcount !== 'number' || data.initialHeadcount <= 0) {
        response.status(400).json(errorResponse('Initial headcount must be a positive number'));
        return;
      }

      // Generate new reservation ID
      const reservationRef = admin.firestore().collection('reservations').doc();
      const reservationId = reservationRef.id;

      const now = admin.firestore.Timestamp.now();

      // Create reservation document
      const reservation = {
        id: reservationId,
        googleCalendarEventId: data.googleCalendarEventId || null,
        startTime: admin.firestore.Timestamp.fromDate(startTime),
        endTime: admin.firestore.Timestamp.fromDate(endTime),
        initialHeadcount: data.initialHeadcount,
        headcountChanges: [],
        channel: data.channel || 'default',
        status: data.status || 'CONFIRMED',
        notes: data.notes || null,
        needsCorrection: data.needsCorrection || false,
        correctedAt: null,
        payerName: data.payerName || null,
        phone: data.phone || null,
        peopleCount: data.peopleCount || null,
        parkingCount: data.parkingCount || 0,
        shootingPurpose: data.shootingPurpose || null,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        createdAt: now,
        updatedAt: now,
      };

      await reservationRef.set(reservation);

      response.status(201).json(successResponse(
        reservation,
        'Reservation created successfully'
      ));

    } catch (error) {
      console.error('Create reservation error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse('Authentication required'));
      } else if (errorMessage.includes('permission-denied')) {
        response.status(403).json(errorResponse('Insufficient permissions'));
      } else if (errorMessage.includes('invalid-argument')) {
        response.status(400).json(errorResponse(errorMessage));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
