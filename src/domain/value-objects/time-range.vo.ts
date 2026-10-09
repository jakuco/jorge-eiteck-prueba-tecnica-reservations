import { InvalidTimeRangeError } from '../errors/invalid-time-range.error';

export class TimeRange {
  private static readonly SLOT_MINUTES = 30;
  private static readonly MIN_DURATION_MINUTES = 30;

  constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {
    if (start >= end) {
      throw new InvalidTimeRangeError('start debe ser menor que end');
    }
    if (start.getTime() < Date.now() - 60_000) {
      throw new InvalidTimeRangeError('start no puede ser en el pasado');
    }
    if (
      start.getMinutes() % TimeRange.SLOT_MINUTES !== 0 ||
      start.getSeconds() !== 0 ||
      start.getMilliseconds() !== 0
    ) {
      throw new InvalidTimeRangeError(
        `start debe ser múltiplo de ${TimeRange.SLOT_MINUTES} minutos (ej: 10:00, 10:30)`,
      );
    }
    if (
      end.getMinutes() % TimeRange.SLOT_MINUTES !== 0 ||
      end.getSeconds() !== 0 ||
      end.getMilliseconds() !== 0
    ) {
      throw new InvalidTimeRangeError(
        `end debe ser múltiplo de ${TimeRange.SLOT_MINUTES} minutos (ej: 11:00, 11:30)`,
      );
    }
    const durationMin = (end.getTime() - start.getTime()) / 60_000;
    if (durationMin < TimeRange.MIN_DURATION_MINUTES) {
      throw new InvalidTimeRangeError(
        `La duración mínima es ${TimeRange.MIN_DURATION_MINUTES} minutos`,
      );
    }
  }

  durationMs(): number {
    return this.end.getTime() - this.start.getTime();
  }

  overlapsWith(other: TimeRange): boolean {
    return this.start < other.end && other.start < this.end;
  }
}