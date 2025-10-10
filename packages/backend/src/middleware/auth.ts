// Authentication Middleware for Studio Revenue Manager
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload, User } from '../types/auth';
import pool from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (user: User): string => {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Authenticate JWT token middleware
 * Verifies token and attaches user to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;

    // Fetch full user from database
    const result = await pool.query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      role: result.rows[0].role,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Role-based authorization middleware
 * Requires user to have one of the allowed roles
 */
export const requireRole = (...allowedRoles: User['role'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Requires one of roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};
