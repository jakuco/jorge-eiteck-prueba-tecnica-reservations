import { RefreshToken } from '../entities/refresh-token.entity';

export interface NewRefreshTokenData {
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}

export type RotateResult =
  | { status: 'rotated'; token: RefreshToken }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'reused'; userId: number };

export interface IRefreshTokenRepository {
  create(userId: number, data: NewRefreshTokenData): Promise<RefreshToken>;

  findByHash(hash: string): Promise<RefreshToken | null>;

  /**
   * Consume atómicamente un refresh token activo y emite uno nuevo en la misma
   * transacción (rotación). Si el token ya fue revocado (o hubo una carrera),
   * devuelve `reused` para que la capa de aplicación revoque todas las
   * sesiones del usuario.
   */
  rotate(
    oldHash: string,
    data: NewRefreshTokenData,
    now: Date,
  ): Promise<RotateResult>;

  /** Revoca un refresh token activo. Idempotente. Devuelve si revocó algo. */
  revokeByHash(hash: string, now: Date): Promise<boolean>;

  /** Revoca todas las sesiones activas de un usuario (reuso/robo detectado). */
  revokeAllForUser(userId: number, now: Date): Promise<void>;
}
