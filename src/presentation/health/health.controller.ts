import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check del servicio' })
  @ApiOkResponse({
    description: 'El servicio está operativo',
    schema: {
      example: {
        status: 'ok',
        uptimeSeconds: 12.345,
        timestamp: '2026-10-06T17:30:00.000Z',
      },
    },
  })
  check(): {
    status: 'ok';
    uptimeSeconds: number;
    timestamp: string;
  } {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime() * 1000) / 1000,
      timestamp: new Date().toISOString(),
    };
  }
}