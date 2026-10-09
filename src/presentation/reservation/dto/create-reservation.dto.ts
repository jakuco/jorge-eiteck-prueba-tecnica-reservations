import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'ID del recurso a reservar',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  resourceId!: number;

  @ApiProperty({
    description: 'Inicio de la reserva (ISO 8601, debe estar alineado a 30 min)',
    example: '2026-12-15T10:00:00.000Z',
    format: 'date-time',
  })
  @IsISO8601()
  startTime!: string;

  @ApiProperty({
    description: 'Fin de la reserva (ISO 8601, debe estar alineado a 30 min)',
    example: '2026-12-15T11:00:00.000Z',
    format: 'date-time',
  })
  @IsISO8601()
  endTime!: string;
}