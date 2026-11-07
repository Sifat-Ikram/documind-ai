import { createHash, randomBytes } from 'node:crypto';

export const generateRefreshToken = (): string =>
  randomBytes(48).toString('base64url');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
