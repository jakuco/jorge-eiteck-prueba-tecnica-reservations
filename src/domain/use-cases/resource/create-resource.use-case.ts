import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Resource } from '../../entities/resource.entity';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { ITypeResourceRepository } from '../../repositories/type-resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';

export const TYPE_RESOURCE_REPOSITORY = Symbol('ITypeResourceRepository');

export interface CreateResourceInput {
  name: string;
  description?: string;
  typeId: number;
}

@Injectable()
export class CreateResourceUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
    @Inject(TYPE_RESOURCE_REPOSITORY)
    private readonly typeRepo: ITypeResourceRepository,
  ) {}

  async execute(input: CreateResourceInput): Promise<Resource> {
    const type = await this.typeRepo.findById(input.typeId);
    if (!type) {
      throw new BadRequestException(
        `Tipo de recurso ${input.typeId} no existe`,
      );
    }

    return this.resourceRepo.create({
      name: input.name,
      description: input.description,
      typeId: input.typeId,
    });
  }
}