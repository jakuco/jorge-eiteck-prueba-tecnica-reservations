import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validateEnv } from './config/env.schema';
import { DatabaseModule } from './data/database.module';
import { HealthModule } from './presentation/health/health.module';
import { AuthModule } from './presentation/auth/auth.module';
import { ResourceModule } from './presentation/resource/resource.module';
import { ReservationModule } from './presentation/reservation/reservation.module';
import { AllExceptionsFilter } from './presentation/common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ResourceModule,
    ReservationModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}