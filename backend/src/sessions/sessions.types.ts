export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RotateResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string | null;
}
