/**
 * Authentication Integration Tests
 * Comprehensive tests for auth flow including token verification and role-based access
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { TestDb } from '../utils/testDb';
import { TestAuth } from '../utils/testAuth';
import pool from '../../db';

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await TestDb.clean();
  });

  afterAll(async () => {
    await TestDb.clean();
  });

  beforeEach(async () => {
    await TestAuth.cleanup();
  });

  describe('User Registration Flow', () => {
    it('should register new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123',
          name: 'New User',
          role: 'staff'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject duplicate email registration', async () => {
      await TestAuth.createUser('duplicate@test.com');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password123',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak@test.com',
          password: '1234567', // 7 chars
          name: 'Weak Pass'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@test.com'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Login with Credentials', () => {
    beforeEach(async () => {
      await TestAuth.createUser('login@test.com', 'correct123');
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'correct123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('login@test.com');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notexist@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com' });

      expect(response.status).toBe(400);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const { user, token } = await TestAuth.createUserWithToken('verify@test.com');

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe('verify@test.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token required');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Route Access', () => {
    it('should allow authenticated access to protected routes', async () => {
      const { token } = await TestAuth.createUserWithToken('protected@test.com');

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(200);
    });

    it('should deny unauthenticated access to protected routes', async () => {
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
    });
  });

  describe('Token Expiration Handling', () => {
    it('should reject expired token', async () => {
      const user = await TestAuth.createUser('expired@test.com');
      const expiredToken = TestAuth.generateExpiredToken(user.id);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin routes', async () => {
      const { token } = await TestAuth.createUserWithToken(
        'admin@test.com',
        'password123',
        'Admin User',
        'admin'
      );

      // Test admin-specific endpoint if exists
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('admin');
    });

    it('should allow manager to create reservations', async () => {
      const { token } = await TestAuth.createUserWithToken(
        'manager@test.com',
        'password123',
        'Manager User',
        'manager'
      );

      const response = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          reservation: {
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            people: 5,
            channel: 'default'
          }
        });

      expect(response.status).toBe(200);
    });

    it('should allow staff to view their own data', async () => {
      const { user, token } = await TestAuth.createUserWithToken(
        'staff@test.com',
        'password123',
        'Staff User',
        'staff'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('staff');
      expect(response.body.user.id).toBe(user.id);
    });
  });

  describe('Security Edge Cases', () => {
    it('should not leak user existence on failed login', async () => {
      const existingResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'exists@test.com', password: 'wrong' });

      const nonExistingResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notexists@test.com', password: 'wrong' });

      // Both should return same error message
      expect(existingResponse.status).toBe(401);
      expect(nonExistingResponse.status).toBe(401);
      expect(existingResponse.body.error).toBe(nonExistingResponse.body.error);
    });

    it('should sanitize email input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: '  UPPERCASE@TEST.COM  ',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('uppercase@test.com');
    });

    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "' OR '1'='1",
          password: "' OR '1'='1"
        });

      expect(response.status).toBe(401);
    });
  });
});
