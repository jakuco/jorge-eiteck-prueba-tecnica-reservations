import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.schema';
import { DatabaseModule } from './data/database.module';
import { HealthModule } from './presentation/health/health.module';
import { AuthModule } from './presentation/auth/auth.module';
import { ResourceModule } from './presentation/resource/resource.module';
import { ReservationModule } from './presentation/reservation/reservation.module';
import { UserModule } from './presentation/user/user.module';
import { RoleModule } from './presentation/role/role.module';
import { AllExceptionsFilter } from './presentation/common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            'body.password',
            '*.token',
          ],
          remove: true,
        },
        autoLogging: true,
      },
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ResourceModule,
    ReservationModule,
    UserModule,
    RoleModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}