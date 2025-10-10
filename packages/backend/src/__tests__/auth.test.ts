/**
 * Authentication Integration Tests
 * Track 1: Testing auth endpoints and middleware
 */
import request from 'supertest';
import app from '../index';
import pool from '../db';

describe('Authentication System', () => {
  let testUserId: string;
  let authToken: string;

  // Clean up test data before all tests
  beforeAll(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE '%test%'`);
  });

  // Clean up after all tests
  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE '%test%'`);
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'staff'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.role).toBe('staff');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');

      testUserId = response.body.user.id;
      authToken = response.body.token;
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com'
          // Missing password and name
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'short@example.com',
          password: '1234567', // Only 7 characters
          name: 'Short Password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com', // Duplicate
          password: 'password123',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.id).toBe(testUserId);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('Protected Routes - Invoice Creation', () => {
    it('should allow authenticated user to create invoice', async () => {
      // First create a test reservation
      const reservationResponse = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(reservationResponse.status).toBe(200);
      const reservationId = reservationResponse.body.data.reservationId;

      // Create invoice with authentication
      const invoiceResponse = await request(app)
        .post('/api/invoice/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId
        });

      expect(invoiceResponse.status).toBe(200);
      expect(invoiceResponse.body.ok).toBe(true);
      expect(invoiceResponse.body.data).toHaveProperty('invoiceId');

      // Verify discount log has user ID, not 'system'
      const invoiceId = invoiceResponse.body.data.invoiceId;
      const logCheck = await pool.query(
        'SELECT applied_by FROM discount_logs WHERE invoice_id = $1',
        [invoiceId]
      );

      if (logCheck.rows.length > 0) {
        expect(logCheck.rows[0].applied_by).not.toBe('system');
        expect(logCheck.rows[0].applied_by).toBe(testUserId);
      }
    });

    it('should reject invoice creation without authentication', async () => {
      const response = await request(app)
        .post('/api/invoice/create')
        .send({
          reservationId: 'test-id'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Routes - Reservation Creation', () => {
    it('should allow authenticated user to create reservation', async () => {
      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 3,
            channel: 'default'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('reservationId');
    });

    it('should reject reservation creation without authentication', async () => {
      const response = await request(app)
        .post('/api/reservation/upsert')
        .send({
          reservation: {
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            people: 3,
            channel: 'default'
          }
        });

      expect(response.status).toBe(401);
    });
  });
});
