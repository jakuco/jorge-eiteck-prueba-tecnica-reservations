import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { UpdateResourceStatusDto } from './dto/update-resource-status.dto';
import { CreateResourceUseCase } from '../../domain/use-cases/resource/create-resource.use-case';
import { GetResourceUseCase } from '../../domain/use-cases/resource/get-resource.use-case';
import { ListResourcesUseCase } from '../../domain/use-cases/resource/list-resources.use-case';
import { UpdateResourceStatusUseCase } from '../../domain/use-cases/resource/update-resource-status.use-case';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourceController {
  constructor(
    private readonly listResources: ListResourcesUseCase,
    private readonly getResource: GetResourceUseCase,
    private readonly createResource: CreateResourceUseCase,
    private readonly updateResourceStatus: UpdateResourceStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar recursos',
    description:
      'Lista todos los recursos con filtros opcionales y paginación. Cualquier usuario autenticado puede llamar.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de recursos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  list(@Query() query: ListResourcesQueryDto) {
    const { page, pageSize, ...filters } = query;
    return this.listResources.execute(filters, { page, pageSize });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un recurso por ID',
    description: 'Devuelve el detalle de un recurso incluyendo su tipo.',
  })
  @ApiResponse({ status: 200, description: 'Recurso encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.getResource.execute(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un recurso (solo admin)',
    description:
      'Crea un nuevo recurso. El typeId debe existir en type_resources.',
  })
  @ApiResponse({ status: 201, description: 'Recurso creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o typeId inexistente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No es admin' })
  create(@Body() dto: CreateResourceDto) {
    return this.createResource.execute(dto);
  }

  @Patch(':id/status')
  @Roles('admin')
  @ApiOperation({
    summary: 'Cambiar estado de un recurso (solo admin)',
    description:
      'Habilita o deshabilita un recurso. Idempotente: si el estado ya es el solicitado, no hace nada.',
  })
  @ApiResponse({ status: 200, description: 'Recurso actualizado' })
  @ApiResponse({ status: 400, description: 'Status inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No es admin' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourceStatusDto,
  ) {
    return this.updateResourceStatus.execute({ id, status: dto.status });
  }
}