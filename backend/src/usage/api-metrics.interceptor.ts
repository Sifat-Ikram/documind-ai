import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import type { AuthUser } from '../auth/auth.types';
import { UsageService } from './usage.service';

/** Records one row per API request so the admin panel can chart latency and errors. */
@Injectable()
export class ApiMetricsInterceptor implements NestInterceptor {
  constructor(private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthUser }>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();
    let recorded = false;

    const record = () => {
      if (recorded) return;
      recorded = true;
      const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
      void this.usage.recordRequest({
        method: req.method,
        path,
        status: res.statusCode || 500,
        durationMs: Date.now() - startedAt,
        userId: req.user?.id ?? null,
      });
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
