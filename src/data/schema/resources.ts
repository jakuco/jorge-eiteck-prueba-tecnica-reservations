import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { typeResources } from './type_resources';

export const resources = pgTable(
  'resources',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    typeId: integer('type_id')
      .notNull()
      .references(() => typeResources.id),
    status: varchar('status', { length: 20 }).notNull().default('enabled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCheck: sql`CHECK (${table.status} IN ('enabled', 'disabled'))`,
  }),
);

export type ResourceRow = typeof resources.$inferSelect;
export type NewResourceRow = typeof resources.$inferInsert;