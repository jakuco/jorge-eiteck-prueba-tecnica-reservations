import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { users, roles } from '../schema';
import { User } from '../../domain/entities/user.entity';
import { Role } from '../../domain/entities/role.entity';
import { PaginatedResult, buildPaginatedResult, normalizePagination } from '../../domain/pagination';
import {
  IUserRepository,
  NewUserData,
  UserFilters,
} from '../../domain/repositories/user.repository.interface';

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async findById(id: number): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);
    if (!rows[0] || !rows[0].roles) return null;
    return this.toDomain(rows[0].users, rows[0].roles);
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1);
    if (!rows[0] || !rows[0].roles) return null;
    return this.toDomain(rows[0].users, rows[0].roles);
  }

  async findMany(
    filters?: UserFilters,
    pagination?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResult<User>> {
    const { page, pageSize, offset } = normalizePagination(pagination);

    const conditions = [];
    if (filters?.roleId !== undefined) conditions.push(eq(users.roleId, filters.roleId));
    if (filters?.isActive !== undefined) conditions.push(eq(users.isActive, filters.isActive));
    if (filters?.emailLike) conditions.push(sql`${users.email} LIKE ${`%${filters.emailLike}%`}`);
    if (filters?.nameLike) conditions.push(sql`${users.name} LIKE ${`%${filters.nameLike}%`}`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ user: users, role: roles })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(where ?? sql`TRUE`)
        .orderBy(sql`${users.id} ASC`)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ total: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(users)
        .where(where ?? sql`TRUE`),
    ]);

    const items = rows
      .filter((r) => r.role !== null)
      .map((r) => this.toDomain(r.user, r.role!));

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async create(data: NewUserData): Promise<User> {
    const [u] = await this.db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        roleId: data.roleId,
      })
      .returning();

    const [r] = await this.db.select().from(roles).where(eq(roles.id, u.roleId)).limit(1);
    if (!r) throw new Error(`Rol ${u.roleId} no existe`);
    return this.toDomain(u, r);
  }

  private toDomain(u: typeof users.$inferSelect, r: typeof roles.$inferSelect): User {
    return new User(
      u.id,
      u.email,
      u.passwordHash,
      u.name,
      new Role(r.id, r.name, r.description, r.isActive),
      u.isActive,
      u.createdAt,
      u.updatedAt,
    );
  }
}