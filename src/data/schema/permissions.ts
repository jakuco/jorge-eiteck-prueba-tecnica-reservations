import { pgTable, serial, varchar, text } from 'drizzle-orm/pg-core';

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
});

export type PermissionRow = typeof permissions.$inferSelect;
export type NewPermissionRow = typeof permissions.$inferInsert;
