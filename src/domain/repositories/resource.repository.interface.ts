import { Resource, ResourceStatus } from '../entities/resource.entity';
import { PaginationParams, PaginatedResult } from '../pagination';

export interface ResourceFilters {
  status?: ResourceStatus;
  typeId?: number;
  name?: string;
  nameLike?: string;
}

export interface NewResourceData {
  name: string;
  description?: string;
  typeId: number;
}

export interface IResourceRepository {
  findById(id: number): Promise<Resource | null>;
  findAll(
    filters?: ResourceFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Resource>>;
  create(data: NewResourceData): Promise<Resource>;
  setStatus(id: number, status: ResourceStatus): Promise<Resource>;
}