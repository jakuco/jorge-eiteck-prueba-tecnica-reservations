import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { PaginationParams, PaginatedResult } from '../pagination';

export interface ReservationFilters {
  userId?: number;
  resourceId?: number;
  status?: ReservationStatus;
  startTimeGte?: Date;
  startTimeLte?: Date;
}

export interface NewReservationData {
  resourceId: number;
  userId: number;
  startTime: Date;
  endTime: Date;
}

export interface IReservationRepository {
  findById(id: number): Promise<Reservation | null>;
  findMany(
    filters: ReservationFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Reservation>>;
  create(data: NewReservationData): Promise<Reservation>;
  setStatus(id: number, status: ReservationStatus): Promise<Reservation>;
}