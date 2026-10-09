import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resource, ResourceStatus } from '../../entities/resource.entity';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';

export interface UpdateResourceStatusInput {
  id: number;
  status: ResourceStatus;
}

@Injectable()
export class UpdateResourceStatusUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
  ) {}

  async execute(input: UpdateResourceStatusInput): Promise<Resource> {
    const existing = await this.resourceRepo.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Recurso ${input.id} no existe`);
    }
    if (existing.status === input.status) {
      return existing;
    }
    return this.resourceRepo.setStatus(input.id, input.status);
  }
}