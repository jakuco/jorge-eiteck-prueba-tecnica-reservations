import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resource } from '../../entities/resource.entity';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { IRoleRepository } from '../../repositories/role.repository.interface';
import { assertTypeAccess } from '../../helpers/type-access';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';
import { ROLE_REPOSITORY } from '../role/list-roles.use-case';

@Injectable()
export class GetResourceUseCase {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(id: number, actingRoleId: number): Promise<Resource> {
    const resource = await this.resourceRepo.findById(id);
    if (!resource) {
      throw new NotFoundException(`Recurso ${id} no existe`);
    }
    const allowedTypeIds = await this.roleRepo.findAllowedTypeIds(actingRoleId);
    assertTypeAccess(allowedTypeIds, resource.type.id);
    return resource;
  }
}