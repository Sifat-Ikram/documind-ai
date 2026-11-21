import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminGuard } from './admin.guard';
import {
  listContactQuerySchema,
  listFeedbackQuerySchema,
  updateFeedbackStatusSchema,
  type ListContactQuery,
  type ListFeedbackQuery,
  type UpdateFeedbackStatusDto,
} from './admin.schemas';

@Controller('admin/feedback')
@UseGuards(AdminGuard)
export class AdminFeedbackController {
  constructor(private readonly feedback: AdminFeedbackService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listFeedbackQuerySchema)) q: ListFeedbackQuery) {
    return this.feedback.list(q);
  }

  @Get('stats')
  stats() {
    return this.feedback.stats();
  }

  @Patch(':id/status')
  status(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFeedbackStatusSchema))
    body: UpdateFeedbackStatusDto,
  ) {
    return this.feedback.updateStatus(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feedback.remove(id);
  }
}

@Controller('admin/contact-messages')
@UseGuards(AdminGuard)
export class AdminContactController {
  constructor(private readonly feedback: AdminFeedbackService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listContactQuerySchema)) q: ListContactQuery) {
    return this.feedback.contactMessages(q);
  }

  @Patch(':id/read')
  read(@Param('id') id: string) {
    return this.feedback.markContactRead(id, true);
  }

  @Patch(':id/unread')
  unread(@Param('id') id: string) {
    return this.feedback.markContactRead(id, false);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feedback.removeContact(id);
  }
}
