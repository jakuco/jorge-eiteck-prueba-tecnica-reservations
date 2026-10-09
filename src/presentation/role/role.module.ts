import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { ListRolesUseCase, ROLE_REPOSITORY } from '../../domain/use-cases/role/list-roles.use-case';
import { DrizzleRoleRepository } from '../../data/repositories/drizzle-role.repository';

@Module({
  controllers: [RoleController],
  providers: [
    ListRolesUseCase,
    { provide: ROLE_REPOSITORY, useClass: DrizzleRoleRepository },
  ],
})
export class RoleModule {}