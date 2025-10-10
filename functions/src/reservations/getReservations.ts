/**
 * Get Reservations Function (List with filtering)
 * GET /reservations?status=CONFIRMED&channel=default&startDate=2024-01-01&endDate=2024-12-31&limit=50
 * Auth: Authenticated users
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateReservationStatus, validateChannel } from '../utils/validation';
import { verifyToken } from '../utils/auth';

export const getReservations = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept GET requests
      if (request.method !== 'GET') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication
      await verifyToken(request);

      // Extract query parameters
      const {
        status,
        channel,
        startDate,
        endDate,
        limit: limitParam,
      } = request.query;

      // Parse limit (default: 50, max: 100)
      let limit = 50;
      if (limitParam) {
        const parsedLimit = parseInt(limitParam as string, 10);
        if (!isNaN(parsedLimit)) {
          limit = Math.min(Math.max(1, parsedLimit), 100);
        }
      }

      // Validate status if provided
      if (status && !validateReservationStatus(status as string)) {
        response.status(400).json(errorResponse('Invalid status value'));
        return;
      }

      // Validate channel if provided
      if (channel && !validateChannel(channel as string)) {
        response.status(400).json(errorResponse('Invalid channel value'));
        return;
      }

      // Validate dates if provided
      let startTimestamp: admin.firestore.Timestamp | undefined;
      let endTimestamp: admin.firestore.Timestamp | undefined;

      if (startDate) {
        const startDateObj = new Date(startDate as string);
        if (isNaN(startDateObj.getTime())) {
          response.status(400).json(errorResponse('Invalid startDate format'));
          return;
        }
        startTimestamp = admin.firestore.Timestamp.fromDate(startDateObj);
      }

      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (isNaN(endDateObj.getTime())) {
          response.status(400).json(errorResponse('Invalid endDate format'));
          return;
        }
        endTimestamp = admin.firestore.Timestamp.fromDate(endDateObj);
      }

      // Build Firestore query
      let query: admin.firestore.Query = admin.firestore().collection('reservations');

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }

      if (channel) {
        query = query.where('channel', '==', channel);
      }

      if (startTimestamp) {
        query = query.where('startTime', '>=', startTimestamp);
      }

      if (endTimestamp) {
        query = query.where('startTime', '<=', endTimestamp);
      }

      // Order by startTime descending and apply limit
      query = query.orderBy('startTime', 'desc').limit(limit);

      // Execute query
      const snapshot = await query.get();

      const reservations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      response.status(200).json(successResponse({
        reservations,
        total: reservations.length,
        limit,
      }));

    } catch (error) {
      console.error('Get reservations error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse('Authentication required'));
      } else if (errorMessage.includes('invalid-argument')) {
        response.status(400).json(errorResponse(errorMessage));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
