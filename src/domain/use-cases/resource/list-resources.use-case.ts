import { Inject, Injectable } from '@nestjs/common';
import { Resource } from '../../entities/resource.entity';
import {
  PaginationParams,
  PaginatedResult,
} from '../../pagination';
import {
  IResourceRepository,
  ResourceFilters,
} from '../../repositories/resource.repository.interface';
import { IRoleRepository } from '../../repositories/role.repository.interface';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';
import { ROLE_REPOSITORY } from '../role/list-roles.use-case';

@Injectable()
export class ListResourcesUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(
    filters: ResourceFilters | undefined,
    pagination: PaginationParams | undefined,
    actingRoleId: number,
  ): Promise<PaginatedResult<Resource>> {
    const allowedTypeIds = await this.roleRepo.findAllowedTypeIds(actingRoleId);
    return this.resourceRepo.findAll(
      { ...filters, allowedTypeIds },
      pagination,
    );
  }
}