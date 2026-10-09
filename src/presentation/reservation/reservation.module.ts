import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { AvailabilityController } from './availability.controller';
import { CreateReservationUseCase } from '../../domain/use-cases/reservation/create-reservation.use-case';
import { CancelReservationUseCase, RESERVATION_REPOSITORY } from '../../domain/use-cases/reservation/cancel-reservation.use-case';
import { ListReservationsUseCase } from '../../domain/use-cases/reservation/list-reservations.use-case';
import { GetResourceAvailabilityUseCase } from '../../domain/use-cases/reservation/get-resource-availability.use-case';
import { DrizzleReservationRepository } from '../../data/repositories/drizzle-reservation.repository';
import { DrizzleResourceRepository } from '../../data/repositories/drizzle-resource.repository';
import { RESOURCE_REPOSITORY } from '../../domain/use-cases/reservation/create-reservation.use-case';

@Module({
  controllers: [ReservationController, AvailabilityController],
  providers: [
    CreateReservationUseCase,
    CancelReservationUseCase,
    ListReservationsUseCase,
    GetResourceAvailabilityUseCase,
    { provide: RESERVATION_REPOSITORY, useClass: DrizzleReservationRepository },
    { provide: RESOURCE_REPOSITORY, useClass: DrizzleResourceRepository },
  ],
})
export class ReservationModule {}