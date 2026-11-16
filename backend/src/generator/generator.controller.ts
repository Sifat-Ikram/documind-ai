import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ActorService } from './actor.service';
import { ExportService } from './export.service';
import { TIME_BUDGET_MS } from './generator.constants';
import {
  continueSchema,
  exportSchema,
  generateSchema,
  historyQuerySchema,
  saveHistorySchema,
  updateHistorySchema,
  type ContinueDto,
  type ExportDto,
  type GenerateDto,
  type HistoryQuery,
  type SaveHistoryDto,
  type UpdateHistoryDto,
} from './generator.schemas';
import { GeneratorService, type GenEvent } from './generator.service';
import { HistoryService } from './history.service';
import { GenerationLimitsService } from './limits.service';

const GENERATE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const EXPORT_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@Controller('generate')
export class GeneratorController {
  constructor(
    private readonly actors: ActorService,
    private readonly limits: GenerationLimitsService,
    private readonly generator: GeneratorService,
    private readonly exporter: ExportService,
    private readonly history: HistoryService,
  ) {}

  // ---- public (guests and logged-in users) ----

  @Public()
  @Get('status')
  async status(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const actor = await this.actors.resolve(req, res);
    return this.limits.status(actor);
  }

  @Public()
  @Throttle(GENERATE_THROTTLE)
  @Post('stream')
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new ZodValidationPipe(generateSchema)) body: GenerateDto,
  ): Promise<void> {
    const actor = await this.actors.resolve(req, res);
    if (!this.limits.allowedLengths(actor).includes(body.length)) {
      throw new ForbiddenException(
        'Long documents are available after you log in',
      );
    }
    const reservationId = await this.limits.reserve(actor);
    await this.sse(res, (signal) =>
      this.generator.generate(actor, body, reservationId, signal),
    );
  }

  @Public()
  @Throttle(GENERATE_THROTTLE)
  @Post('continue')
  async continueWriting(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new ZodValidationPipe(continueSchema)) body: ContinueDto,
  ): Promise<void> {
    const actor = await this.actors.resolve(req, res);
    const reservationId = await this.limits.reserve(actor);
    await this.sse(res, (signal) =>
      this.generator.continueWriting(actor, body, reservationId, signal),
    );
  }

  @Public()
  @Throttle(EXPORT_THROTTLE)
  @HttpCode(200)
  @Post('export')
  async export(
    @Res() res: Response,
    @Body(new ZodValidationPipe(exportSchema)) body: ExportDto,
  ): Promise<void> {
    const file = await this.exporter.export(body);
    const ascii = file.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    res.status(200);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.setHeader('Content-Length', String(file.buffer.length));
    res.send(file.buffer);
  }

  // ---- history (login required) ----

  @Get('history')
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ) {
    return this.history.list(user.id, query);
  }

  @Get('history/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.history.get(user.id, id);
  }

  @Patch('history/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateHistorySchema)) body: UpdateHistoryDto,
  ) {
    return this.history.update(user.id, id, body);
  }

  @Delete('history/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.history.remove(user.id, id);
  }

  @HttpCode(200)
  @Post('history/:id/save')
  save(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveHistorySchema)) body: SaveHistoryDto,
  ) {
    return this.history.save(user.id, id, body);
  }

  // ---- streaming helper ----

  private async sse(
    res: Response,
    run: (signal: AbortSignal) => AsyncGenerator<GenEvent>,
  ): Promise<void> {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // stops when the browser leaves or presses Stop, or when the time budget is used up
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) abort.abort();
    });
    const signal = AbortSignal.any([
      abort.signal,
      AbortSignal.timeout(TIME_BUDGET_MS),
    ]);

    const send = (event: GenEvent) => {
      if (!res.writableEnded && !res.destroyed)
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of run(signal)) send(event);
    } catch {
      send({
        type: 'error',
        message: 'Something went wrong while writing the document.',
      });
    }
    if (!res.writableEnded) res.end();
  }
}
