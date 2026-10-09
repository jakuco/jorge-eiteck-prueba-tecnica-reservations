import { createHash, randomBytes } from 'node:crypto';

/**
 * Genera un refresh token opaco de alta entropía. Se devuelve al cliente una
 * sola vez; en la base solo se persiste su hash.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Hash determinístico (sha256) del refresh token para almacenarlo/buscarlo.
 * Es seguro usar sha256 (y no bcrypt) porque el token es aleatorio de 384 bits:
 * no es adivinable por fuerza bruta como una contraseña.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
