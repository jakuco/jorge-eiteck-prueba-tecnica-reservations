import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { GetResourceAvailabilityUseCase } from '../../domain/use-cases/reservation/get-resource-availability.use-case';

@ApiTags('resources')
@ApiBearerAuth()
@Controller('resources')
export class AvailabilityController {
  constructor(
    private readonly getAvailability: GetResourceAvailabilityUseCase,
  ) {}

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Consultar disponibilidad de un recurso en un intervalo de tiempo',
    description:
      'Devuelve los slots ocupados (reservas confirmadas) del recurso en el rango [from, to). Las reservas canceladas no se incluyen.',
  })
  @ApiResponse({ status: 200, description: 'Lista de slots ocupados' })
  @ApiResponse({ status: 400, description: 'Rango inválido (from >= to)' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Recurso no existe' })
  async check(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.getAvailability.execute({
      resourceId: id,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }
}