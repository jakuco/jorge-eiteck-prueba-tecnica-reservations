import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CancelReservationUseCase } from '../../domain/use-cases/reservation/cancel-reservation.use-case';
import { CreateReservationUseCase } from '../../domain/use-cases/reservation/create-reservation.use-case';
import { ListReservationsUseCase } from '../../domain/use-cases/reservation/list-reservations.use-case';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly createReservation: CreateReservationUseCase,
    private readonly listReservations: ListReservationsUseCase,
    private readonly cancelReservation: CancelReservationUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una reserva',
    description:
      'Crea una reserva para el usuario autenticado. El recurso debe existir y estar habilitado. El rango debe ser múltiplo de 30 min, duración mínima 30 min, y no solaparse con otra reserva confirmada del mismo recurso (EXCLUDE constraint).',
  })
  @ApiResponse({ status: 201, description: 'Reserva creada' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos, recurso inexistente, recurso deshabilitado, o rango inválido',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 409, description: 'Conflicto: ya existe una reserva en ese horario' })
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createReservation.execute({
      resourceId: dto.resourceId,
      userId: user.sub,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Listar reservas',
    description:
      'Lista reservas. Los usuarios no-admin solo ven las propias; los admin ven todas. Soporta filtros y paginación.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de reservas' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  list(
    @Query() query: ListReservationsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const { page, pageSize, from, to, ...filters } = query;
    return this.listReservations.execute({
      actingUserId: user.sub,
      isAdmin: user.roleName === 'admin',
      filters: {
        ...filters,
        startTimeGte: from ? new Date(from) : undefined,
        startTimeLte: to ? new Date(to) : undefined,
      },
      pagination: { page, pageSize },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar una reserva',
    description:
      'Cancela una reserva. Un user solo puede cancelar las propias; admin puede cancelar cualquiera. Idempotente.',
  })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No es dueño ni admin' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cancelReservation.execute({
      reservationId: id,
      actingUserId: user.sub,
      isAdmin: user.roleName === 'admin',
    });
  }
}