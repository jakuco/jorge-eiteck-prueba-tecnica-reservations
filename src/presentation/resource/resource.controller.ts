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
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { UpdateResourceStatusDto } from './dto/update-resource-status.dto';
import { CreateResourceUseCase } from '../../domain/use-cases/resource/create-resource.use-case';
import { GetResourceUseCase } from '../../domain/use-cases/resource/get-resource.use-case';
import { ListResourcesUseCase } from '../../domain/use-cases/resource/list-resources.use-case';
import { UpdateResourceStatusUseCase } from '../../domain/use-cases/resource/update-resource-status.use-case';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('resources')
export class ResourceController {
  constructor(
    private readonly listResources: ListResourcesUseCase,
    private readonly getResource: GetResourceUseCase,
    private readonly createResource: CreateResourceUseCase,
    private readonly updateResourceStatus: UpdateResourceStatusUseCase,
  ) {}

  @Get()
  list(@Query() query: ListResourcesQueryDto) {
    const { page, pageSize, ...filters } = query;
    return this.listResources.execute(filters, { page, pageSize });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.getResource.execute(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateResourceDto) {
    return this.createResource.execute(dto);
  }

  @Patch(':id/status')
  @Roles('admin')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourceStatusDto,
  ) {
    return this.updateResourceStatus.execute({ id, status: dto.status });
  }
}