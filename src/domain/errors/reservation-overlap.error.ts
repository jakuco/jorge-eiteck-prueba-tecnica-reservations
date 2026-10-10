import { DomainError } from './domain.error';

export class ReservationOverlapError extends DomainError {
  readonly statusCode = 409;
  readonly code = 'RESERVATION_OVERLAP';
}
