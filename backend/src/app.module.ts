import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { AnalysesModule } from './analyses/analyses.module';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoriesModule } from './categories/categories.module';
import { TrashModule } from './trash/trash.module';
import { CronModule } from './cron/cron.module';
import { PreferencesModule } from './preferences/preferences.module';
import { TagsModule } from './tags/tags.module';
import { CollectionsModule } from './collections/collections.module';
import { BulkModule } from './bulk/bulk.module';
import { AccessModule } from './access/access.module';
import { SharingModule } from './sharing/sharing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    DocumentsModule,
    AiModule,
    AnalysesModule,
    ChatModule,
    DashboardModule,
    CategoriesModule,
    TrashModule,
    CronModule,
    PreferencesModule,
    TagsModule,
    CollectionsModule,
    BulkModule,
    AccessModule,
    SharingModule
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
