import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, asc } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { typeResources } from '../schema';
import { TypeResource } from '../../domain/entities/type-resource.entity';
import { PaginatedResult, buildPaginatedResult, normalizePagination } from '../../domain/pagination';
import {
  ITypeResourceRepository,
  TypeResourceFilters,
} from '../../domain/repositories/type-resource.repository.interface';

@Injectable()
export class DrizzleTypeResourceRepository implements ITypeResourceRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async findById(id: number): Promise<TypeResource | null> {
    const [r] = await this.db
      .select()
      .from(typeResources)
      .where(eq(typeResources.id, id))
      .limit(1);
    return r ? this.toDomain(r) : null;
  }

  async findAll(
    filters?: TypeResourceFilters,
    pagination?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResult<TypeResource>> {
    const { page, pageSize, offset } = normalizePagination(pagination);

    const conditions = [];
    if (filters?.name) conditions.push(eq(typeResources.name, filters.name));
    if (filters?.nameLike) conditions.push(sql`${typeResources.name} LIKE ${`%${filters.nameLike}%`}`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(typeResources)
        .where(where ?? sql`TRUE`)
        .orderBy(asc(typeResources.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ total: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(typeResources)
        .where(where ?? sql`TRUE`),
    ]);

    return buildPaginatedResult(rows.map((r) => this.toDomain(r)), total, page, pageSize);
  }

  private toDomain(r: typeof typeResources.$inferSelect): TypeResource {
    return new TypeResource(r.id, r.name, r.description);
  }
}