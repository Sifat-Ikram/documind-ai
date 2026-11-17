import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  convertSchema,
  converterSignatureSchema,
  type ConvertDto,
  type ConverterSignatureDto,
} from './converter.schemas';
import { ConverterService } from './converter.service';

const CONVERT_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('converter')
export class ConverterController {
  constructor(private readonly converter: ConverterService) {}

  @Get('formats')
  formats() {
    return this.converter.formats();
  }

  @HttpCode(200)
  @Post('upload-signature')
  uploadSignature(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(converterSignatureSchema))
    body: ConverterSignatureDto,
  ) {
    return this.converter.createUploadSignature(user.id, body);
  }

  @Throttle(CONVERT_THROTTLE)
  @HttpCode(200)
  @Post('convert')
  convert(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(convertSchema)) body: ConvertDto,
  ) {
    return this.converter.convert(user.id, body);
  }

  @Get('jobs')
  jobs(@CurrentUser() user: AuthUser) {
    return this.converter.list(user.id);
  }

  @Delete('jobs/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.converter.remove(user.id, id);
  }
}
