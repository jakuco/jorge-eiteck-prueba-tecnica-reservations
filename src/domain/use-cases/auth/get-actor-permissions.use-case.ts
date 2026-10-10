import { Inject, Injectable } from '@nestjs/common';
import { IPermissionRepository } from '../../repositories/permission.repository.interface';

export const PERMISSION_REPOSITORY = Symbol('IPermissionRepository');

@Injectable()
export class GetActorPermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepo: IPermissionRepository,
  ) {}

  execute(roleId: number): Promise<string[]> {
    return this.permissionRepo.findNamesByRoleId(roleId);
  }
}
