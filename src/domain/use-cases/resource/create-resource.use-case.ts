import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Resource } from '../../entities/resource.entity';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { ITypeResourceRepository } from '../../repositories/type-resource.repository.interface';
import { IRoleRepository } from '../../repositories/role.repository.interface';
import { assertTypeAccess } from '../../helpers/type-access';
import { isUniqueViolation } from '../../helpers/db-errors';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';
import { ROLE_REPOSITORY } from '../role/list-roles.use-case';

export const TYPE_RESOURCE_REPOSITORY = Symbol('ITypeResourceRepository');

export interface CreateResourceInput {
  name: string;
  description?: string;
  typeId: number;
  roleId: number;
}

@Injectable()
export class CreateResourceUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
    @Inject(TYPE_RESOURCE_REPOSITORY)
    private readonly typeRepo: ITypeResourceRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(input: CreateResourceInput): Promise<Resource> {
    const type = await this.typeRepo.findById(input.typeId);
    if (!type) {
      throw new BadRequestException(
        `Tipo de recurso ${input.typeId} no existe`,
      );
    }

    const allowedTypeIds = await this.roleRepo.findAllowedTypeIds(input.roleId);
    assertTypeAccess(allowedTypeIds, input.typeId);

    try {
      return await this.resourceRepo.create({
        name: input.name,
        description: input.description,
        typeId: input.typeId,
      });
    } catch (err) {
      if (isUniqueViolation(err, 'resources_name_unique')) {
        throw new ConflictException(
          `Ya existe un recurso con el nombre "${input.name}"`,
        );
      }
      throw err;
    }
  }
}
