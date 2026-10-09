import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IReservationRepository } from '../../repositories/reservation.repository.interface';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../reservation/create-reservation.use-case';
import { RESERVATION_REPOSITORY } from './cancel-reservation.use-case';

export interface GetResourceAvailabilityInput {
  resourceId: number;
  from: Date;
  to: Date;
}

export interface AvailabilitySlot {
  id: number;
  startTime: Date;
  endTime: Date;
}

export interface ResourceAvailability {
  resourceId: number;
  from: Date;
  to: Date;
  busy: AvailabilitySlot[];
}

@Injectable()
export class GetResourceAvailabilityUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: IReservationRepository,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: IResourceRepository,
  ) {}

  async execute(input: GetResourceAvailabilityInput): Promise<ResourceAvailability> {
    if (input.from >= input.to) {
      throw new BadRequestException('`from` debe ser anterior a `to`');
    }

    const resource = await this.resourceRepo.findById(input.resourceId);
    if (!resource) {
      throw new NotFoundException(`Recurso ${input.resourceId} no existe`);
    }

    const busy = await this.reservationRepo.findOverlappingInRange(
      input.resourceId,
      input.from,
      input.to,
    );

    return {
      resourceId: input.resourceId,
      from: input.from,
      to: input.to,
      busy: busy.map((r) => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    };
  }
}