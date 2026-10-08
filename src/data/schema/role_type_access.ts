import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { roles } from './roles';
import { typeResources } from './type_resources';

export const roleTypeAccess = pgTable(
  'role_type_access',
  {
    typeResourceId: integer('type_resource_id')
      .notNull()
      .references(() => typeResources.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.typeResourceId] }),
  }),
);

export type RoleTypeAccessRow = typeof roleTypeAccess.$inferSelect;
export type NewRoleTypeAccessRow = typeof roleTypeAccess.$inferInsert;