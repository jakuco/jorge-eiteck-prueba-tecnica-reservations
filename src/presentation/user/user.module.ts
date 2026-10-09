import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ListUsersUseCase } from '../../domain/use-cases/user/list-users.use-case';
import { USER_REPOSITORY } from '../../domain/use-cases/auth/login.use-case';
import { DrizzleUserRepository } from '../../data/repositories/drizzle-user.repository';

@Module({
  controllers: [UserController],
  providers: [
    ListUsersUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
  ],
})
export class UserModule {}