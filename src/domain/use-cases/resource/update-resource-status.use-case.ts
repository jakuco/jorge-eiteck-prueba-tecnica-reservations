import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resource, ResourceStatus } from '../../entities/resource.entity';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { IRoleRepository } from '../../repositories/role.repository.interface';
import { assertTypeAccess } from '../../helpers/type-access';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';
import { ROLE_REPOSITORY } from '../role/list-roles.use-case';

export interface UpdateResourceStatusInput {
  id: number;
  status: ResourceStatus;
  roleId: number;
}

@Injectable()
export class UpdateResourceStatusUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(input: UpdateResourceStatusInput): Promise<Resource> {
    const existing = await this.resourceRepo.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Recurso ${input.id} no existe`);
    }

    const allowedTypeIds = await this.roleRepo.findAllowedTypeIds(input.roleId);
    assertTypeAccess(allowedTypeIds, existing.type.id);

    if (existing.status === input.status) {
      return existing;
    }
    return this.resourceRepo.setStatus(input.id, input.status);
  }
}
