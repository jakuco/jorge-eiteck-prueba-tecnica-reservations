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
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';

@Injectable()
export class ListResourcesUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
  ) {}

  async execute(
    filters?: ResourceFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Resource>> {
    return this.resourceRepo.findAll(filters, pagination);
  }
}