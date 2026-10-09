import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListTypeResourcesUseCase } from '../../domain/use-cases/type-resource/list-type-resources.use-case';

@ApiTags('type-resources')
@ApiBearerAuth()
@Controller('type-resources')
export class TypeResourceController {
  constructor(
    private readonly listTypeResources: ListTypeResourcesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar tipos de recursos',
    description:
      'Devuelve todos los tipos del catálogo (Sala de reuniones, Vehículo, etc). Cualquier usuario autenticado puede consultar.',
  })
  @ApiResponse({ status: 200, description: 'Lista de tipos de recursos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async list() {
    return this.listTypeResources.execute();
  }
}