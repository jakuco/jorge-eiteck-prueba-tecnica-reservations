export interface IPermissionRepository {
  /** Nombres de los permisos asignados a un rol (vía `role_permissions`). */
  findNamesByRoleId(roleId: number): Promise<string[]>;
}
