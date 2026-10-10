/**
 * Catálogo de permisos del plano de gestión. La autorización se resuelve por
 * estos permisos (tabla `role_permissions`), no por nombre de rol.
 */
export const PERMISSIONS = {
  RESOURCES_MANAGE: 'resources:manage',
  USERS_READ: 'users:read',
  RESERVATIONS_READ_ALL: 'reservations:read:all',
  RESERVATIONS_CANCEL_ANY: 'reservations:cancel:any',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionName[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<PermissionName, string> = {
  [PERMISSIONS.RESOURCES_MANAGE]: 'Crear recursos y cambiar su estado',
  [PERMISSIONS.USERS_READ]: 'Listar los usuarios del sistema',
  [PERMISSIONS.RESERVATIONS_READ_ALL]: 'Ver las reservas de todos los usuarios',
  [PERMISSIONS.RESERVATIONS_CANCEL_ANY]:
    'Cancelar reservas de cualquier usuario',
};
