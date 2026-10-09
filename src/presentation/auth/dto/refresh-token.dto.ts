import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token emitido en /auth/login o en el último /auth/refresh',
    example: 'wJalrXUtnFEMI_K7MDENGbPxRfiCY_EXAMPLE_refresh_token',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
