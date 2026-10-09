import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateResourceStatusDto {
  @ApiProperty({
    description: 'Nuevo estado del recurso',
    example: 'disabled',
    enum: ['enabled', 'disabled'],
  })
  @IsIn(['enabled', 'disabled'])
  status!: 'enabled' | 'disabled';
}