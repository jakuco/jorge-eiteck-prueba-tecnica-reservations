import { SetMetadata } from '@nestjs/common';
import { PermissionName } from '../../../domain/authz/permissions';

export const PERMISSIONS_KEY = 'permissions';

/** Exige que el rol del usuario tenga TODOS los permisos indicados. */
export const RequirePermission = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
