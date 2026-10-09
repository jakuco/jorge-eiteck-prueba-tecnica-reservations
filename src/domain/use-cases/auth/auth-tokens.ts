export interface AuthUser {
  id: number;
  email: string;
  roleName: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_expires_in: number;
  user: AuthUser;
}
