import { Inject, Injectable } from '@nestjs/common';
import { Reservation } from '../../entities/reservation.entity';
import {
  PaginationParams,
  PaginatedResult,
} from '../../pagination';
import {
  IReservationRepository,
  ReservationFilters,
} from '../../repositories/reservation.repository.interface';
import { RESERVATION_REPOSITORY } from './cancel-reservation.use-case';

export interface ListReservationsInput {
  actingUserId: number;
  canReadAll: boolean;
  filters: ReservationFilters;
  pagination?: PaginationParams;
}

@Injectable()
export class ListReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: IReservationRepository,
  ) {}

  async execute(
    input: ListReservationsInput,
  ): Promise<PaginatedResult<Reservation>> {
    const filters: ReservationFilters = { ...input.filters };
    if (!input.canReadAll) {
      filters.userId = input.actingUserId;
    }
    return this.reservationRepo.findMany(filters, input.pagination);
  }
}