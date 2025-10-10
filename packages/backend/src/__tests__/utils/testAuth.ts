/**
 * Test Authentication Utilities
 * Helpers for creating test users and generating tokens
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../db';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string;
}

export class TestAuth {
  /**
   * Create a test user in database
   */
  static async createUser(
    email: string = 'testuser@example.com',
    password: string = 'password123',
    name: string = 'Test User',
    role: 'admin' | 'manager' | 'staff' = 'staff'
  ): Promise<TestUser> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email, hashedPassword, name, role]
    );

    return {
      ...result.rows[0],
      password // Return plain password for testing
    };
  }

  /**
   * Generate JWT token for user
   */
  static generateToken(userId: string, role: string = 'staff'): string {
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jwt.sign(
      { userId, role },
      secret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Create user and return with token
   */
  static async createUserWithToken(
    email?: string,
    password?: string,
    name?: string,
    role?: 'admin' | 'manager' | 'staff'
  ): Promise<{ user: TestUser; token: string }> {
    const user = await this.createUser(email, password, name, role);
    const token = this.generateToken(user.id, user.role);
    return { user, token };
  }

  /**
   * Clean up test users
   */
  static async cleanup(): Promise<void> {
    await pool.query(`DELETE FROM users WHERE email LIKE '%test%'`);
  }

  /**
   * Verify token is valid
   */
  static verifyToken(token: string): any {
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jwt.verify(token, secret);
  }

  /**
   * Create expired token for testing
   */
  static generateExpiredToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jwt.sign(
      { userId, role: 'staff' },
      secret,
      { expiresIn: '-1h' } // Already expired
    );
  }
}
