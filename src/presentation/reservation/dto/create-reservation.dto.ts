import { IsInt, IsISO8601, Min } from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  @Min(1)
  resourceId!: number;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;
}