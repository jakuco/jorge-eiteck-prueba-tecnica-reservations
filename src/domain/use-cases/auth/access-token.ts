import { JwtService } from '@nestjs/jwt';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  roleName: string;
  roleId: number;
}

/**
 * Firma el access token y devuelve también su vida en segundos, leída del
 * propio token (`exp - iat`), para no acoplar la respuesta a cómo se expresa
 * la duración en la configuración.
 */
export function signAccessToken(
  jwt: JwtService,
  payload: AccessTokenPayload,
): { token: string; expiresIn: number } {
  const token = jwt.sign(payload);
  const decoded = jwt.decode(token) as { iat?: number; exp?: number } | null;
  const expiresIn =
    decoded?.exp !== undefined && decoded?.iat !== undefined
      ? decoded.exp - decoded.iat
      : 0;
  return { token, expiresIn };
}
