import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListUsersUseCase } from '../../domain/use-cases/user/list-users.use-case';

class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly listUsers: ListUsersUseCase) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar usuarios (solo admin)',
    description:
      'Devuelve la lista paginada de usuarios con su rol. No expone el password hash.',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No es admin' })
  async list(@Query() query: ListUsersQueryDto) {
    return this.listUsers.execute({ page: query.page, pageSize: query.pageSize });
  }
}