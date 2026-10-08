export type ReservationStatus = 'confirmed' | 'cancelled';

export class Reservation {
  constructor(
    public readonly id: number,
    public readonly resourceId: number,
    public readonly userId: number,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly status: ReservationStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isConfirmed(): boolean {
    return this.status === 'confirmed';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  overlapsWith(start: Date, end: Date): boolean {
    return this.startTime < end && start < this.endTime;
  }

  cancel(): Reservation {
    if (this.isCancelled()) return this;
    return new Reservation(
      this.id,
      this.resourceId,
      this.userId,
      this.startTime,
      this.endTime,
      'cancelled',
      this.createdAt,
      new Date(),
    );
  }
}