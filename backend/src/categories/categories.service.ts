import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const CATEGORY_SEED = [
  { slug: 'contract', name: 'Contract', icon: 'FiEdit3' },
  { slug: 'report', name: 'Report', icon: 'FiBarChart2' },
  { slug: 'invoice', name: 'Invoice', icon: 'FiDollarSign' },
  { slug: 'resume', name: 'Resume', icon: 'FiUser' },
  { slug: 'letter', name: 'Letter', icon: 'FiMail' },
  { slug: 'meeting-notes', name: 'Meeting notes', icon: 'FiUsers' },
  { slug: 'proposal', name: 'Proposal', icon: 'FiBriefcase' },
  { slug: 'study-material', name: 'Study material', icon: 'FiBookOpen' },
  { slug: 'other', name: 'Other', icon: 'FiFile' },
] as const;

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.category.count();
      if (count >= CATEGORY_SEED.length) return;
      for (const [index, c] of CATEGORY_SEED.entries()) {
        await this.prisma.category.upsert({
          where: { slug: c.slug },
          create: { ...c, sortOrder: index },
          update: { name: c.name, icon: c.icon, sortOrder: index },
        });
      }
    } catch (err) {
      this.logger.warn(`Could not seed categories: ${String(err)}`);
    }
  }

  async list() {
    const items = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, icon: true },
    });
    return { items };
  }
}
