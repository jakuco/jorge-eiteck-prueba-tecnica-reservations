import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.schema';
import { DatabaseModule } from './data/database.module';
import { HealthModule } from './presentation/health/health.module';
import { AuthModule } from './presentation/auth/auth.module';
import { ResourceModule } from './presentation/resource/resource.module';
import { ReservationModule } from './presentation/reservation/reservation.module';

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
})
export class AppModule {}