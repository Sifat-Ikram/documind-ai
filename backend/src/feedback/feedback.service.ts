import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFeedbackDto } from './feedback.schemas';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: dto.type,
        subject: dto.subject,
        message: dto.message,
        rating: dto.rating ?? null,
      },
      select: { id: true, status: true, createdAt: true },
    });
    return { feedback };
  }
}
