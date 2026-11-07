import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };
