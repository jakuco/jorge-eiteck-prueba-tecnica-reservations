import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListRolesUseCase } from '../../domain/use-cases/role/list-roles.use-case';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly listRoles: ListRolesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Listar roles disponibles',
    description:
      'Devuelve todos los roles del sistema. Cualquier usuario autenticado puede consultar.',
  })
  @ApiResponse({ status: 200, description: 'Lista de roles' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async list() {
    return this.listRoles.execute();
  }
}