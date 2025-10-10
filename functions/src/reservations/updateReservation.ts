/**
 * Update Reservation Function
 * PUT /reservations/{id}
 * Auth: Staff or Admin only
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateChannel, validateReservationStatus } from '../utils/validation';
import { verifyToken, requireStaff } from '../utils/auth';

interface UpdateReservationRequest {
  googleCalendarEventId?: string;
  startTime?: string; // ISO 8601 date string
  endTime?: string; // ISO 8601 date string
  initialHeadcount?: number;
  headcountChanges?: Array<{
    timestamp: string;
    from: number;
    to: number;
    reason?: string;
  }>;
  channel?: 'default' | 'hourplace' | 'spacecloud';
  status?: 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  needsCorrection?: boolean;
  correctedAt?: string;
  payerName?: string;
  phone?: string;
  peopleCount?: number;
  parkingCount?: number;
  shootingPurpose?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export const updateReservation = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept PUT or PATCH requests
      if (request.method !== 'PUT' && request.method !== 'PATCH') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication and authorization
      const user = await verifyToken(request);
      requireStaff(user); // Staff or admin only

      // Extract reservation ID from query parameter or path
      const reservationId = request.query.id as string ||
                           request.path.split('/').pop();

      if (!reservationId) {
        response.status(400).json(errorResponse('Reservation ID is required'));
        return;
      }

      const data = request.body as UpdateReservationRequest;

      // Validate field formats if provided
      if (data.channel && !validateChannel(data.channel)) {
        response.status(400).json(errorResponse('Invalid channel value'));
        return;
      }

      if (data.status && !validateReservationStatus(data.status)) {
        response.status(400).json(errorResponse('Invalid status value'));
        return;
      }

      // Check if reservation exists
      const reservationRef = admin.firestore()
        .collection('reservations')
        .doc(reservationId);

      const reservationDoc = await reservationRef.get();

      if (!reservationDoc.exists) {
        response.status(404).json(errorResponse('Reservation not found'));
        return;
      }

      // Build update object
      const updates: any = {
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Validate and add date fields
      if (data.startTime) {
        const startTime = new Date(data.startTime);
        if (isNaN(startTime.getTime())) {
          response.status(400).json(errorResponse('Invalid startTime format'));
          return;
        }
        updates.startTime = admin.firestore.Timestamp.fromDate(startTime);
      }

      if (data.endTime) {
        const endTime = new Date(data.endTime);
        if (isNaN(endTime.getTime())) {
          response.status(400).json(errorResponse('Invalid endTime format'));
          return;
        }
        updates.endTime = admin.firestore.Timestamp.fromDate(endTime);
      }

      // Validate date range if both provided
      if (updates.startTime && updates.endTime && updates.endTime <= updates.startTime) {
        response.status(400).json(errorResponse('End time must be after start time'));
        return;
      }

      // Add other fields if provided
      if (data.googleCalendarEventId !== undefined) {
        updates.googleCalendarEventId = data.googleCalendarEventId;
      }

      if (data.initialHeadcount !== undefined) {
        if (typeof data.initialHeadcount !== 'number' || data.initialHeadcount <= 0) {
          response.status(400).json(errorResponse('Initial headcount must be a positive number'));
          return;
        }
        updates.initialHeadcount = data.initialHeadcount;
      }

      if (data.headcountChanges !== undefined) {
        // Convert timestamp strings to Firestore Timestamps
        updates.headcountChanges = data.headcountChanges.map(change => ({
          timestamp: admin.firestore.Timestamp.fromDate(new Date(change.timestamp)),
          from: change.from,
          to: change.to,
          reason: change.reason || null,
        }));
      }

      if (data.channel !== undefined) {
        updates.channel = data.channel;
      }

      if (data.status !== undefined) {
        updates.status = data.status;
      }

      if (data.notes !== undefined) {
        updates.notes = data.notes;
      }

      if (data.needsCorrection !== undefined) {
        updates.needsCorrection = data.needsCorrection;
      }

      if (data.correctedAt !== undefined) {
        if (data.correctedAt) {
          const correctedAt = new Date(data.correctedAt);
          if (isNaN(correctedAt.getTime())) {
            response.status(400).json(errorResponse('Invalid correctedAt format'));
            return;
          }
          updates.correctedAt = admin.firestore.Timestamp.fromDate(correctedAt);
        } else {
          updates.correctedAt = null;
        }
      }

      if (data.payerName !== undefined) {
        updates.payerName = data.payerName;
      }

      if (data.phone !== undefined) {
        updates.phone = data.phone;
      }

      if (data.peopleCount !== undefined) {
        updates.peopleCount = data.peopleCount;
      }

      if (data.parkingCount !== undefined) {
        updates.parkingCount = data.parkingCount;
      }

      if (data.shootingPurpose !== undefined) {
        updates.shootingPurpose = data.shootingPurpose;
      }

      if (data.customerName !== undefined) {
        updates.customerName = data.customerName;
      }

      if (data.customerEmail !== undefined) {
        updates.customerEmail = data.customerEmail;
      }

      if (data.customerPhone !== undefined) {
        updates.customerPhone = data.customerPhone;
      }

      // Update the reservation
      await reservationRef.update(updates);

      // Fetch and return updated reservation
      const updatedDoc = await reservationRef.get();
      const updatedReservation = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };

      response.status(200).json(successResponse(
        updatedReservation,
        'Reservation updated successfully'
      ));

    } catch (error) {
      console.error('Update reservation error:', error);
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
