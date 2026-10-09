import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reservation } from '../../entities/reservation.entity';
import { IReservationRepository } from '../../repositories/reservation.repository.interface';

export const RESERVATION_REPOSITORY = Symbol('IReservationRepository');

export interface CancelReservationInput {
  reservationId: number;
  actingUserId: number;
  isAdmin: boolean;
}

@Injectable()
export class CancelReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: IReservationRepository,
  ) {}

  async execute(input: CancelReservationInput): Promise<Reservation> {
    const reservation = await this.reservationRepo.findById(input.reservationId);
    if (!reservation) {
      throw new NotFoundException(
        `Reserva ${input.reservationId} no existe`,
      );
    }

    if (!input.isAdmin && reservation.userId !== input.actingUserId) {
      throw new ForbiddenException(
        'No podés cancelar reservas de otro usuario',
      );
    }

    if (reservation.status === 'cancelled') {
      return reservation;
    }

    return this.reservationRepo.setStatus(input.reservationId, 'cancelled');
  }
}