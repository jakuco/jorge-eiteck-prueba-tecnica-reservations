import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { CreateResourceUseCase, TYPE_RESOURCE_REPOSITORY } from '../../domain/use-cases/resource/create-resource.use-case';
import { GetResourceUseCase } from '../../domain/use-cases/resource/get-resource.use-case';
import { ListResourcesUseCase } from '../../domain/use-cases/resource/list-resources.use-case';
import { UpdateResourceStatusUseCase } from '../../domain/use-cases/resource/update-resource-status.use-case';
import { RESOURCE_REPOSITORY } from '../../domain/use-cases/reservation/create-reservation.use-case';
import { ROLE_REPOSITORY } from '../../domain/use-cases/role/list-roles.use-case';
import { DrizzleResourceRepository } from '../../data/repositories/drizzle-resource.repository';
import { DrizzleRoleRepository } from '../../data/repositories/drizzle-role.repository';
import { DrizzleTypeResourceRepository } from '../../data/repositories/drizzle-type-resource.repository';

@Module({
  controllers: [ResourceController],
  providers: [
    ListResourcesUseCase,
    GetResourceUseCase,
    CreateResourceUseCase,
    UpdateResourceStatusUseCase,
    { provide: RESOURCE_REPOSITORY, useClass: DrizzleResourceRepository },
    { provide: ROLE_REPOSITORY, useClass: DrizzleRoleRepository },
    { provide: TYPE_RESOURCE_REPOSITORY, useClass: DrizzleTypeResourceRepository },
  ],
})
export class ResourceModule {}