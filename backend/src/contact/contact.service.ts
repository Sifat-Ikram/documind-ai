import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ContactDto } from './contact.schemas';

const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 30;

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: ContactDto) {
    // A filled hidden field means a bot: answer "ok" and save nothing.
    if (dto.website) return { ok: true };

    const recent = await this.prisma.contactMessage.count({
      where: { createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
    });
    if (recent >= MAX_PER_HOUR) {
      throw new HttpException(
        'Too many messages right now. Please try again later.',
        429,
      );
    }

    // the same message sent twice within 10 minutes is saved once
    const duplicate = await this.prisma.contactMessage.findFirst({
      where: {
        email: dto.email,
        message: dto.message,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (duplicate) return { ok: true };

    await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
      },
    });
    return { ok: true };
  }
}
