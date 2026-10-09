import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ReservationStatus } from '../../../domain/entities/reservation.entity';

export class ListReservationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por recurso',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  resourceId?: number;

  @ApiPropertyOptional({
    description: 'Filtra por estado de la reserva',
    enum: ['confirmed', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['confirmed', 'cancelled'])
  status?: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Filtra reservas con start_time >= from (ISO 8601)',
    example: '2026-12-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filtra reservas con start_time <= to (ISO 8601)',
    example: '2026-12-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    description: 'Número de página (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de items por página (máx 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}