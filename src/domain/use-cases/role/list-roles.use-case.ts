import { Inject, Injectable } from '@nestjs/common';
import { IRoleRepository } from '../../repositories/role.repository.interface';
import { Role } from '../../entities/role.entity';

export const ROLE_REPOSITORY = Symbol('IRoleRepository');

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(): Promise<Role[]> {
    return this.roleRepo.findAll();
  }
}