import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, asc } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { reservations } from '../schema';
import {
  Reservation,
  ReservationStatus,
} from '../../domain/entities/reservation.entity';
import { PaginatedResult, buildPaginatedResult, normalizePagination } from '../../domain/pagination';
import {
  IReservationRepository,
  NewReservationData,
  ReservationFilters,
} from '../../domain/repositories/reservation.repository.interface';

@Injectable()
export class DrizzleReservationRepository implements IReservationRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async findById(id: number): Promise<Reservation | null> {
    const [r] = await this.db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);
    return r ? this.toDomain(r) : null;
  }

  async findMany(
    filters: ReservationFilters,
    pagination?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResult<Reservation>> {
    const { page, pageSize, offset } = normalizePagination(pagination);

    const conditions = [];
    if (filters.userId !== undefined) conditions.push(eq(reservations.userId, filters.userId));
    if (filters.resourceId !== undefined)
      conditions.push(eq(reservations.resourceId, filters.resourceId));
    if (filters.status) conditions.push(eq(reservations.status, filters.status));
    if (filters.startTimeGte)
      conditions.push(sql`${reservations.startTime} >= ${filters.startTimeGte}`);
    if (filters.startTimeLte)
      conditions.push(sql`${reservations.startTime} <= ${filters.startTimeLte}`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(reservations)
        .where(where ?? sql`TRUE`)
        .orderBy(asc(reservations.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ total: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(reservations)
        .where(where ?? sql`TRUE`),
    ]);

    return buildPaginatedResult(rows.map((r) => this.toDomain(r)), total, page, pageSize);
  }

  async findOverlappingInRange(
    resourceId: number,
    from: Date,
    to: Date,
  ): Promise<Reservation[]> {
    const rows = await this.db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          eq(reservations.status, 'confirmed'),
          sql`${reservations.endTime} > ${from.toISOString()}`,
          sql`${reservations.startTime} < ${to.toISOString()}`,
        ),
      )
      .orderBy(asc(reservations.startTime));
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: NewReservationData): Promise<Reservation> {
    const [r] = await this.db
      .insert(reservations)
      .values({
        resourceId: data.resourceId,
        userId: data.userId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'confirmed',
      })
      .returning();
    return this.toDomain(r);
  }

  async setStatus(id: number, status: ReservationStatus): Promise<Reservation> {
    const [r] = await this.db
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return this.toDomain(r);
  }

  private toDomain(r: typeof reservations.$inferSelect): Reservation {
    return new Reservation(
      r.id,
      r.resourceId,
      r.userId,
      r.startTime,
      r.endTime,
      r.status as ReservationStatus,
      r.createdAt,
      r.updatedAt,
    );
  }
}