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
import { CancelReservationUseCase } from '../../domain/use-cases/reservation/cancel-reservation.use-case';
import { CreateReservationUseCase } from '../../domain/use-cases/reservation/create-reservation.use-case';
import { ListReservationsUseCase } from '../../domain/use-cases/reservation/list-reservations.use-case';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';

@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly createReservation: CreateReservationUseCase,
    private readonly listReservations: ListReservationsUseCase,
    private readonly cancelReservation: CancelReservationUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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