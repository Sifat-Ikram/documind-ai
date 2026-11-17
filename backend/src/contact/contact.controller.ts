import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { contactSchema, type ContactDto } from './contact.schemas';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post()
  submit(@Body(new ZodValidationPipe(contactSchema)) body: ContactDto) {
    return this.contact.submit(body);
  }
}
