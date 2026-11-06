import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    let status = 500;
    let body: Record<string, unknown> = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      body =
        typeof response === 'string'
          ? { message: response }
          : (response as Record<string, unknown>);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = 409;
        body = { message: 'Resource already exists' };
      } else if (exception.code === 'P2025') {
        status = 404;
        body = { message: 'Resource not found' };
      } else {
        this.logger.error(exception);
      }
    } else {
      this.logger.error(exception);
    }

    res.status(status).json({ ...body, statusCode: status });
  }
}
