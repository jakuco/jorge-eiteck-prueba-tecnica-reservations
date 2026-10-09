import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    description: 'Nombre del recurso',
    example: 'Sala A1',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Descripción opcional del recurso',
    example: 'Sala principal con proyector',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID del tipo de recurso (referencia a type_resources)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  typeId!: number;
}