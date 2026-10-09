import { Inject, Injectable } from '@nestjs/common';
import { ITypeResourceRepository } from '../../repositories/type-resource.repository.interface';
import { TYPE_RESOURCE_REPOSITORY } from '../resource/create-resource.use-case';
import { TypeResource } from '../../entities/type-resource.entity';

@Injectable()
export class ListTypeResourcesUseCase {
  constructor(
    @Inject(TYPE_RESOURCE_REPOSITORY)
    private readonly repo: ITypeResourceRepository,
  ) {}

  async execute(): Promise<TypeResource[]> {
    const result = await this.repo.findAll();
    return result.items;
  }
}