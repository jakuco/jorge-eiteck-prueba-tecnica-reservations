import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { roles } from './roles';
import { permissions } from './permissions';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);

export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type NewRolePermissionRow = typeof rolePermissions.$inferInsert;
