import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminContactController, AdminFeedbackController } from './admin-feedback.controller';
import { AdminDocumentsController } from './admin-documents.controller';
import { AdminDocumentsService } from './admin-documents.service';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminGuard } from './admin.guard';
import { AdminMonitoringService } from './admin-monitoring.service';
import { AdminOverviewService } from './admin-overview.service';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, SessionsModule, CloudinaryModule],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminDocumentsController,
    AdminFeedbackController,
    AdminContactController,
    AdminSettingsController,
  ],
  providers: [
    AdminGuard,
    AdminOverviewService,
    AdminAnalyticsService,
    AdminMonitoringService,
    AdminUsersService,
    AdminDocumentsService,
    AdminFeedbackService,
    AdminSettingsService,
  ],
})
export class AdminModule {}
