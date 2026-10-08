import { TypeResource } from '../entities/type-resource.entity';
import { PaginationParams, PaginatedResult } from '../pagination';

export interface TypeResourceFilters {
  name?: string;
  nameLike?: string;
}

export interface ITypeResourceRepository {
  findById(id: number): Promise<TypeResource | null>;
  findAll(
    filters?: TypeResourceFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<TypeResource>>;
}