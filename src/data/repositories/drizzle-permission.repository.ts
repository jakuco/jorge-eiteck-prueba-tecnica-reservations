import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { permissions, rolePermissions } from '../schema';
import { IPermissionRepository } from '../../domain/repositories/permission.repository.interface';

@Injectable()
export class DrizzlePermissionRepository implements IPermissionRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async findNamesByRoleId(roleId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.name);
  }
}
