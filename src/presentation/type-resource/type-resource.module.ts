import { Module } from '@nestjs/common';
import { TypeResourceController } from './type-resource.controller';
import { ListTypeResourcesUseCase } from '../../domain/use-cases/type-resource/list-type-resources.use-case';
import { TYPE_RESOURCE_REPOSITORY } from '../../domain/use-cases/resource/create-resource.use-case';
import { DrizzleTypeResourceRepository } from '../../data/repositories/drizzle-type-resource.repository';

@Module({
  controllers: [TypeResourceController],
  providers: [
    ListTypeResourcesUseCase,
    {
      provide: TYPE_RESOURCE_REPOSITORY,
      useClass: DrizzleTypeResourceRepository,
    },
  ],
})
export class TypeResourceModule {}