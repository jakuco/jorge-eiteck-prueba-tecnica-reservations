import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '../../repositories/user.repository.interface';
import { USER_REPOSITORY } from '../auth/login.use-case';
import {
  PaginatedResult,
  PaginationParams,
  buildPaginatedResult,
} from '../../pagination';
import { User } from '../../entities/user.entity';

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: {
    id: number;
    name: string;
    description: string | null;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<PublicUser>> {
    const result = await this.userRepo.findMany({}, pagination);
    const items: PublicUser[] = result.items.map((u: User) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: {
        id: u.role.id,
        name: u.role.name,
        description: u.role.description,
      },
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    return buildPaginatedResult(items, result.total, result.page, result.pageSize);
  }
}