// Authentication Types for Studio Revenue Manager

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: User['role'];
  iat: number;  // issued at
  exp: number;  // expiration
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
  expiresIn: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
