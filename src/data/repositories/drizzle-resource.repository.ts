import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, asc, inArray } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { resources, typeResources } from '../schema';
import { Resource, ResourceStatus } from '../../domain/entities/resource.entity';
import { TypeResource } from '../../domain/entities/type-resource.entity';
import { PaginatedResult, buildPaginatedResult, normalizePagination } from '../../domain/pagination';
import {
  IResourceRepository,
  NewResourceData,
  ResourceFilters,
} from '../../domain/repositories/resource.repository.interface';

@Injectable()
export class DrizzleResourceRepository implements IResourceRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async findById(id: number): Promise<Resource | null> {
    const rows = await this.db
      .select()
      .from(resources)
      .leftJoin(typeResources, eq(resources.typeId, typeResources.id))
      .where(eq(resources.id, id))
      .limit(1);
    if (!rows[0] || !rows[0].type_resources) return null;
    return this.toDomain(rows[0].resources, rows[0].type_resources);
  }

  async findAll(
    filters?: ResourceFilters,
    pagination?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResult<Resource>> {
    const { page, pageSize, offset } = normalizePagination(pagination);

    const conditions = [];
    if (filters?.status) conditions.push(eq(resources.status, filters.status));
    if (filters?.typeId) conditions.push(eq(resources.typeId, filters.typeId));
    if (filters?.name) conditions.push(eq(resources.name, filters.name));
    if (filters?.nameLike) conditions.push(sql`${resources.name} LIKE ${`%${filters.nameLike}%`}`);
    if (filters?.allowedTypeIds !== undefined) {
      conditions.push(
        filters.allowedTypeIds.length > 0
          ? inArray(resources.typeId, filters.allowedTypeIds)
          : sql`FALSE`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(resources)
        .leftJoin(typeResources, eq(resources.typeId, typeResources.id))
        .where(where ?? sql`TRUE`)
        .orderBy(asc(resources.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ total: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(resources)
        .where(where ?? sql`TRUE`),
    ]);

    const items = rows
      .filter((r) => r.type_resources !== null)
      .map((r) => this.toDomain(r.resources, r.type_resources!));

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async create(data: NewResourceData): Promise<Resource> {
    const [r] = await this.db
      .insert(resources)
      .values({
        name: data.name,
        description: data.description,
        typeId: data.typeId,
        status: 'enabled',
      })
      .returning();

    const [tr] = await this.db
      .select()
      .from(typeResources)
      .where(eq(typeResources.id, r.typeId))
      .limit(1);
    if (!tr) throw new Error(`Tipo de recurso ${r.typeId} no existe`);
    return this.toDomain(r, tr);
  }

  async setStatus(id: number, status: ResourceStatus): Promise<Resource> {
    const [r] = await this.db
      .update(resources)
      .set({ status, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();

    const [tr] = await this.db
      .select()
      .from(typeResources)
      .where(eq(typeResources.id, r.typeId))
      .limit(1);
    if (!tr) throw new Error(`Tipo de recurso ${r.typeId} no existe`);
    return this.toDomain(r, tr);
  }

  private toDomain(
    r: typeof resources.$inferSelect,
    tr: typeof typeResources.$inferSelect,
  ): Resource {
    return new Resource(
      r.id,
      r.name,
      r.description,
      new TypeResource(tr.id, tr.name, tr.description),
      r.status as ResourceStatus,
      r.createdAt,
      r.updatedAt,
    );
  }
}