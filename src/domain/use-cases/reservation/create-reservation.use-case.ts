import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IResourceRepository } from '../../repositories/resource.repository.interface';
import { IReservationRepository } from '../../repositories/reservation.repository.interface';
import { IRoleRepository } from '../../repositories/role.repository.interface';
import { Reservation } from '../../entities/reservation.entity';
import { TimeRange } from '../../value-objects/time-range.vo';
import { assertTypeAccess } from '../../helpers/type-access';
import { ROLE_REPOSITORY } from '../role/list-roles.use-case';
import { RESERVATION_REPOSITORY } from './cancel-reservation.use-case';

export const RESOURCE_REPOSITORY = Symbol('IResourceRepository');

export interface CreateReservationInput {
  resourceId: number;
  userId: number;
  roleId: number;
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepo: IReservationRepository,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: IResourceRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: IRoleRepository,
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

    const allowedTypeIds = await this.roleRepo.findAllowedTypeIds(input.roleId);
    assertTypeAccess(allowedTypeIds, resource.type.id);

    return this.reservationRepo.create({
      resourceId: input.resourceId,
      userId: input.userId,
      startTime: range.start,
      endTime: range.end,
    });
  }
}
