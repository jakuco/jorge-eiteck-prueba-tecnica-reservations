import { ForbiddenException } from '@nestjs/common';

/**
 * Verifica que el tipo del recurso esté dentro de los tipos permitidos para el
 * rol del usuario. `allowedTypeIds` sale íntegramente de `role_type_access`
 * (no hay hardcodeo de roles).
 */
export function assertTypeAccess(
  allowedTypeIds: number[],
  typeId: number,
): void {
  if (!allowedTypeIds.includes(typeId)) {
    throw new ForbiddenException(
      'El rol no tiene acceso a este tipo de recurso',
    );
  }
}