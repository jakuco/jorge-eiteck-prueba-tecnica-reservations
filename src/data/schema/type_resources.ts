import { pgTable, serial, varchar, text } from 'drizzle-orm/pg-core';

export const typeResources = pgTable('type_resources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
});

export type TypeResourceRow = typeof typeResources.$inferSelect;
export type NewTypeResourceRow = typeof typeResources.$inferInsert;