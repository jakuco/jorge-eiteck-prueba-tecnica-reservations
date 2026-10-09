import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resource } from '../../entities/resource.entity';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';

@Injectable()
export class GetResourceUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
  ) {}

  async execute(id: number): Promise<Resource> {
    const resource = await this.resourceRepo.findById(id);
    if (!resource) {
      throw new NotFoundException(`Recurso ${id} no existe`);
    }
    return resource;
  }
}