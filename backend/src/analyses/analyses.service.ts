import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DetectionResult, TaskTypeValue } from '../ai/ai.types';
import { TaskDetectorService } from '../ai/task-detector.service';
import { type TaskSection, WorkflowsService } from '../ai/workflows.service';
import type { Env } from '../config/env';
import { DocumentsService } from '../documents/documents.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AnalyzeDto, ListAnalysesQuery } from './analyses.schemas';

const TRANSLATE_MAX_CHARS = 5000;

const analysisListSelect = {
  id: true,
  documentId: true,
  originalInstruction: true,
  detectedTasks: true,
  targetLanguage: true,
  usedFallback: true,
  createdAt: true,
  document: { select: { id: true, originalName: true } },
} as const;

@Injectable()
export class AnalysesService {
  private readonly maxChars: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly detector: TaskDetectorService,
    private readonly workflows: WorkflowsService,
    config: ConfigService<Env, true>,
  ) {
    this.maxChars = config.get('AI_MAX_DOCUMENT_CHARS', { infer: true });
  }

  async detectTask(userId: string, documentId: string, instruction: string) {
    await this.documents.getForAnalysis(userId, documentId);
    return this.detector.detect(instruction);
  }

  async analyze(userId: string, documentId: string, dto: AnalyzeDto) {
    const doc = await this.documents.getForAnalysis(userId, documentId);

    const detection: DetectionResult = dto.tasks?.length
      ? {
          tasks: [...new Set(dto.tasks)],
          targetLanguage: dto.targetLanguage ?? null,
          confidence: 1,
          usedFallback: dto.usedFallback ?? false,
        }
      : await this.detector.detect(dto.instruction);

    const notes: string[] = [];
    if (detection.usedFallback) {
      notes.push(
        "I wasn't sure what you wanted, so I treated your instruction as a question about the document.",
      );
    }
    if (doc.extractedText.length > this.maxChars) {
      notes.push(
        `This document is long, so only the first ${this.maxChars.toLocaleString('en-US')} characters were analyzed.`,
      );
    }
    if (
      detection.tasks.includes('TRANSLATE') &&
      doc.extractedText.length > TRANSLATE_MAX_CHARS
    ) {
      notes.push(
        `Only the first ${TRANSLATE_MAX_CHARS.toLocaleString('en-US')} characters were translated.`,
      );
    }

    const settled = await Promise.allSettled(
      detection.tasks.map((task) =>
        this.workflows.run({
          task,
          instruction: dto.instruction,
          documentName: doc.originalName,
          text: doc.extractedText.slice(0, this.limitFor(task)),
          targetLanguage: detection.targetLanguage,
        }),
      ),
    );

    if (settled.every((s) => s.status === 'rejected')) {
      // সব task ব্যর্থ: প্রথম error টাই ইউজারকে দেখানো হবে
      throw (settled[0] as PromiseRejectedResult).reason;
    }

    const sections: TaskSection[] = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : {
            task: detection.tasks[i],
            title: this.workflows.titleFor(detection.tasks[i]),
            error: 'Could not generate this section. Please try again.',
          },
    );

    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        documentId,
        originalInstruction: dto.instruction,
        detectedTasks: detection.tasks,
        targetLanguage: detection.targetLanguage,
        usedFallback: detection.usedFallback,
        result: { sections, notes } as unknown as Prisma.InputJsonValue,
      },
      select: { ...analysisListSelect, result: true },
    });

    return { analysis };
  }

  async list(userId: string, q: ListAnalysesQuery) {
    const where = {
      userId,
      ...(q.documentId ? { documentId: q.documentId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.analysis.findMany({
        where,
        select: analysisListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.analysis.count({ where }),
    ]);
    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async getOne(userId: string, id: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id, userId },
      select: { ...analysisListSelect, result: true },
    });
    if (!analysis) throw new NotFoundException('Analysis not found');
    return { analysis };
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.analysis.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Analysis not found');
    return { message: 'Analysis deleted' };
  }

  private limitFor(task: TaskTypeValue): number {
    return task === 'TRANSLATE'
      ? Math.min(this.maxChars, TRANSLATE_MAX_CHARS)
      : this.maxChars;
  }
}
