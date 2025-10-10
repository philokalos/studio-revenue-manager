/**
 * Reservation E2E Tests
 * Complete reservation lifecycle testing
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { TestDb } from '../utils/testDb';
import { TestAuth } from '../utils/testAuth';
import { TestData } from '../utils/testData';
import pool from '../../db';

describe('Reservation E2E Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await TestDb.clean();
    const { user, token } = await TestAuth.createUserWithToken('reservation@test.com');
    authToken = token;
    userId = user.id;
  });

  afterAll(async () => {
    await TestDb.clean();
  });

  beforeEach(async () => {
    await TestData.cleanup();
  });

  describe('Complete Reservation Lifecycle', () => {
    it('should complete full reservation flow: quote → reservation → update → delete', async () => {
      // Step 1: Create quote
      const quoteResponse = await request(app)
        .post('/api/quote/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quote: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(quoteResponse.status).toBe(200);
      expect(quoteResponse.body.ok).toBe(true);
      const quoteId = quoteResponse.body.data.quoteId;
      expect(quoteId).toBeDefined();

      // Step 2: Create reservation from quote
      const reservationResponse = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quoteId,
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default',
            status: 'confirmed'
          }
        });

      expect(reservationResponse.status).toBe(200);
      expect(reservationResponse.body.ok).toBe(true);
      const reservationId = reservationResponse.body.data.reservationId;
      expect(reservationId).toBeDefined();

      // Step 3: View reservation details
      const detailsResponse = await request(app)
        .get(`/api/reservation/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(detailsResponse.status).toBe(200);
      expect(detailsResponse.body.data.id).toBe(reservationId);
      expect(detailsResponse.body.data.people).toBe(5);

      // Step 4: Add headcount change
      const headcountResponse = await request(app)
        .post(`/api/reservation/${reservationId}/headcount`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newCount: 7,
          reason: 'Guest added'
        });

      expect(headcountResponse.status).toBe(200);
      expect(headcountResponse.body.ok).toBe(true);

      // Verify headcount change was recorded
      const changesResult = await pool.query(
        'SELECT * FROM headcount_changes WHERE reservation_id = $1',
        [reservationId]
      );
      expect(changesResult.rows.length).toBe(1);
      expect(changesResult.rows[0].old_count).toBe(5);
      expect(changesResult.rows[0].new_count).toBe(7);

      // Step 5: Update reservation
      const updateResponse = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId,
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 7,
            channel: 'direct',
            status: 'confirmed'
          }
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.people).toBe(7);
      expect(updateResponse.body.data.channel).toBe('direct');

      // Step 6: Delete reservation
      const deleteResponse = await request(app)
        .delete(`/api/reservation/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/reservation/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('Error Scenarios', () => {
    it('should prevent overlapping bookings', async () => {
      const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endAt = new Date(Date.now() + 26 * 60 * 60 * 1000);

      // Create first reservation
      const first = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(first.status).toBe(200);

      // Try to create overlapping reservation
      const overlap = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(startAt.getTime() + 30 * 60 * 1000).toISOString(), // 30 min after
            endAt: new Date(endAt.getTime() + 30 * 60 * 1000).toISOString(),
            people: 3,
            channel: 'default'
          }
        });

      expect(overlap.status).toBe(400);
      expect(overlap.body.error).toContain('overlap');
    });

    it('should reject invalid date ranges', async () => {
      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // End before start
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('before');
    });

    it('should reject past dates', async () => {
      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            endAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('past');
    });

    it('should reject invalid people count', async () => {
      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 0,
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('people');
    });
  });

  describe('Permission Checks', () => {
    it('should require authentication for all reservation operations', async () => {
      const responses = await Promise.all([
        request(app).post('/api/reservation/upsert').send({}),
        request(app).get('/api/reservation/some-id'),
        request(app).delete('/api/reservation/some-id')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });

    it('should allow authorized user to manage reservations', async () => {
      const reservation = await TestData.createReservation();

      const response = await request(app)
        .get(`/api/reservation/${reservation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Reservation Status Transitions', () => {
    it('should transition from pending to confirmed', async () => {
      const createRes = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default',
            status: 'pending'
          }
        });

      const reservationId = createRes.body.data.reservationId;

      const updateRes = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId,
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default',
            status: 'confirmed'
          }
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('confirmed');
    });

    it('should transition to cancelled', async () => {
      const reservation = await TestData.createReservation();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          reservation: {
            startAt: reservation.start_at,
            endAt: reservation.end_at,
            people: reservation.people,
            channel: reservation.channel,
            status: 'cancelled'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
    });
  });

  describe('Bulk Operations', () => {
    it('should list all reservations', async () => {
      // Create multiple reservations
      await Promise.all([
        TestData.createReservation(),
        TestData.createReservation(),
        TestData.createReservation()
      ]);

      const response = await request(app)
        .get('/api/reservation')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter reservations by date range', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TestData.createReservation({
        startAt: futureDate,
        endAt: new Date(futureDate.getTime() + 2 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .get('/api/reservation')
        .query({
          startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
