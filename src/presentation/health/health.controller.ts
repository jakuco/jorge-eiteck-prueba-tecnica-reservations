import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DATABASE, type DB } from '@data/database.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  @Get()
  @ApiOperation({ summary: 'Health check del servicio y de la base de datos' })
  @ApiOkResponse({
    description: 'El servicio y la DB están operativos',
    schema: {
      example: {
        status: 'ok',
        uptimeSeconds: 12.345,
        timestamp: '2026-10-06T17:30:00.000Z',
        db: 'ok',
      },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'La DB no responde' })
  async check(): Promise<{
    status: 'ok';
    uptimeSeconds: number;
    timestamp: string;
    db: 'ok' | 'error';
  }> {
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime() * 1000) / 1000,
      timestamp: new Date().toISOString(),
      db: dbStatus,
    };
  }
}