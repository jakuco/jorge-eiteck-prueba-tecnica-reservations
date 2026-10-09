import { Resource, ResourceStatus } from '../entities/resource.entity';
import { PaginationParams, PaginatedResult } from '../pagination';

export interface ResourceFilters {
  status?: ResourceStatus;
  typeId?: number;
  name?: string;
  nameLike?: string;
}

/**
 * Filtros de listado con el alcance por rol ya resuelto. `allowedTypeIds` es
 * obligatorio a propósito: un listado sin alcance de tipos no puede existir,
 * evitando fugas por omitir el filtro (deny-by-default).
 */
export interface ResourceQueryFilters extends ResourceFilters {
  allowedTypeIds: number[];
}

export interface NewResourceData {
  name: string;
  description?: string;
  typeId: number;
}

export interface IResourceRepository {
  findById(id: number): Promise<Resource | null>;
  findAll(
    filters: ResourceQueryFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Resource>>;
  create(data: NewResourceData): Promise<Resource>;
  setStatus(id: number, status: ResourceStatus): Promise<Resource>;
}