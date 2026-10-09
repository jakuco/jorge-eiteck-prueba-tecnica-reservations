import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { roleTypeAccess, roles } from '../schema';
import { Role } from '../../domain/entities/role.entity';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface';

@Injectable()
export class DrizzleRoleRepository implements IRoleRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async findById(id: number): Promise<Role | null> {
    const [r] = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    return r ? new Role(r.id, r.name, r.description, r.isActive) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const [r] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);
    return r ? new Role(r.id, r.name, r.description, r.isActive) : null;
  }

  async findAll(): Promise<Role[]> {
    const rows = await this.db.select().from(roles).orderBy(roles.id);
    return rows.map((r) => new Role(r.id, r.name, r.description, r.isActive));
  }

  async findAllowedTypeIds(roleId: number): Promise<number[]> {
    const rows = await this.db
      .select({ typeResourceId: roleTypeAccess.typeResourceId })
      .from(roleTypeAccess)
      .where(eq(roleTypeAccess.roleId, roleId));
    return rows.map((r) => r.typeResourceId);
  }
}