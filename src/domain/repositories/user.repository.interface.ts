import { User } from '../entities/user.entity';
import { PaginationParams, PaginatedResult } from '../pagination';

export interface NewUserData {
  email: string;
  passwordHash: string;
  name: string;
  roleId: number;
}

export interface UserFilters {
  roleId?: number;
  isActive?: boolean;
  emailLike?: string;
  nameLike?: string;
}

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(
    filters?: UserFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<User>>;
  create(data: NewUserData): Promise<User>;
}