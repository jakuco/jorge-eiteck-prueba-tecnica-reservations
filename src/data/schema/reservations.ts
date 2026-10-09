import { pgTable, serial, timestamp, varchar, integer, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { resources } from './resources';
import { users } from './users';

export const reservations = pgTable(
  'reservations',
  {
    id: serial('id').primaryKey(),
    resourceId: integer('resource_id')
      .notNull()
      .references(() => resources.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('confirmed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('reservations_range_check', sql`${table.endTime} > ${table.startTime}`),
    check(
      'reservations_status_check',
      sql`${table.status} IN ('confirmed', 'cancelled')`,
    ),
    sql`ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
      EXCLUDE USING gist (
        ${table.resourceId} WITH =,
        tstzrange(${table.startTime}, ${table.endTime}, '[)') WITH &&
      ) WHERE (${table.status} = 'confirmed')`,
  ],
);

export type ReservationRow = typeof reservations.$inferSelect;
export type NewReservationRow = typeof reservations.$inferInsert;