import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DATABASE, type DB } from '../../../data/database.module';
import { reservations } from '../../../data/schema';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { Reservation } from '../../entities/reservation.entity';
import { TimeRange } from '../../value-objects/time-range.vo';
import { isExclusionViolation } from '../../helpers/db-errors';

export const RESOURCE_REPOSITORY = Symbol('IResourceRepository');

export interface CreateReservationInput {
  resourceId: number;
  userId: number;
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(DATABASE) private readonly db: DB,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: IResourceRepository,
  ) {}

  async execute(input: CreateReservationInput): Promise<Reservation> {
    const range = new TimeRange(input.startTime, input.endTime);

    const resource = await this.resourceRepo.findById(input.resourceId);
    if (!resource) {
      throw new BadRequestException(`Recurso ${input.resourceId} no existe`);
    }
    if (!resource.isEnabled()) {
      throw new BadRequestException('El recurso no está habilitado');
    }

    return this.db.transaction(async (tx) => {
      try {
        const [row] = await tx
          .insert(reservations)
          .values({
            resourceId: input.resourceId,
            userId: input.userId,
            startTime: range.start,
            endTime: range.end,
            status: 'confirmed',
          })
          .returning();

        return new Reservation(
          row.id,
          row.resourceId,
          row.userId,
          row.startTime,
          row.endTime,
          row.status as 'confirmed' | 'cancelled',
          row.createdAt,
          row.updatedAt,
        );
      } catch (err) {
        if (isExclusionViolation(err)) {
          throw new ConflictException(
            'El recurso ya está reservado en ese horario',
          );
        }
        throw err;
      }
    });
  }
}