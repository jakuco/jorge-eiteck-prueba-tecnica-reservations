import { DomainError } from './domain.error';

export class InvalidTimeRangeError extends DomainError {
  readonly statusCode = 400;
  readonly code = 'INVALID_TIME_RANGE';
}