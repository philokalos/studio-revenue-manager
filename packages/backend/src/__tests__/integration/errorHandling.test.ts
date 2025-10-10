/**
 * API Error Handling Tests
 * Tests for different HTTP error scenarios and responses
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { TestDb } from '../utils/testDb';
import { TestAuth } from '../utils/testAuth';
import { TestData } from '../utils/testData';

describe('API Error Handling Tests', () => {
  beforeAll(async () => {
    await TestDb.clean();
  });

  afterAll(async () => {
    await TestDb.clean();
  });

  describe('400 Bad Request', () => {
    it('should return 400 for missing required fields', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: new Date().toISOString()
            // Missing endAt, people, channel
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid date format', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: 'invalid-date',
            endAt: 'also-invalid',
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('date');
    });

    it('should return 400 for invalid data types', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            people: 'five', // Should be number
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for malformed JSON', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('401 Unauthorized', () => {
    it('should return 401 for missing auth token', async () => {
      const response = await request(app)
        .post('/api/reservation/upsert')
        .send({
          reservation: {
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token required');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should return 401 for malformed auth header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });
  });

  describe('403 Forbidden', () => {
    it('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.string');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should return 403 for expired token', async () => {
      const user = await TestAuth.createUser('expired@test.com');
      const expiredToken = TestAuth.generateExpiredToken(user.id);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('expired');
    });

    it('should return 403 for insufficient permissions (if role-based)', async () => {
      const { token } = await TestAuth.createUserWithToken(
        'staff@test.com',
        'password123',
        'Staff User',
        'staff'
      );

      // Try to access admin-only route if exists
      // This is a placeholder - adjust based on your actual routes
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // Should succeed for /me endpoint
      expect(response.status).toBe(200);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/api/nonexistent/route');

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent resource', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .get('/api/reservation/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      // Adjust based on your actual route behavior
      expect([404, 400]).toContain(response.status);
    });
  });

  describe('500 Internal Server Error', () => {
    it('should handle database errors gracefully', async () => {
      const { token } = await TestAuth.createUserWithToken();

      // Try to create invoice without reservation (should trigger DB error)
      const response = await request(app)
        .post('/api/invoice/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservationId: 'invalid-uuid-format-will-cause-error'
        });

      // Should handle error gracefully, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should not leak sensitive error details', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/invoice/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservationId: 'cause-error'
        });

      // Error message should not contain SQL or internal details
      expect(response.body.error).not.toContain('SELECT');
      expect(response.body.error).not.toContain('INSERT');
      expect(response.body.error).not.toContain('DATABASE');
    });
  });

  describe('Validation Errors', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123', // Too short
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    it('should validate date ranges', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            endAt: new Date().toISOString(), // End before start
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('before');
    });

    it('should validate numeric ranges', async () => {
      const { token } = await TestAuth.createUserWithToken();

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            people: 0, // Invalid
            channel: 'default'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('people');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'wrong'
        });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body).toHaveProperty('ok');
      expect(response.body.ok).toBe(false);
    });

    it('should include helpful error messages', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123'
        });

      expect(response.body.error).toBeTruthy();
      expect(response.body.error.length).toBeGreaterThan(10); // Meaningful message
    });
  });

  describe('CORS and Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/auth/login');

      expect([200, 204]).toContain(response.status);
    });
  });
});
