import prisma from '@/lib/db/prisma';
import { CalculationService } from './calculation.service';
import { PositivityStatus } from '@/types';
import { Prisma } from '@prisma/client';

export interface SampleQueryFilters {
  reportId?: string;
  search?: string;
  hgbStatus?: string;
  hctStatus?: string;
  bothPositive?: string; // 'YES', 'NO', or 'all'
  page?: number;
  pageSize?: number;
  sortBy?: 'sampleCode' | 'rowNumber' | 'hgbValue' | 'hctValue' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class SampleService {
  /**
   * Search and filter samples with server-side pagination
   */
  public static async getSamples(filters: SampleQueryFilters) {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SampleWhereInput = {};

    if (filters.reportId && filters.reportId !== 'all') {
      where.reportId = filters.reportId;
    }

    if (filters.search && filters.search.trim()) {
      where.sampleCode = {
        contains: filters.search.trim(),
      };
    }

    if (filters.hgbStatus && (filters.hgbStatus === 'POSITIVE' || filters.hgbStatus === 'NEGATIVE')) {
      where.hgbStatus = filters.hgbStatus;
    }

    if (filters.hctStatus && (filters.hctStatus === 'POSITIVE' || filters.hctStatus === 'NEGATIVE')) {
      where.hctStatus = filters.hctStatus;
    }

    if (filters.bothPositive === 'YES' || filters.bothPositive === 'true') {
      where.bothPositive = true;
    } else if (filters.bothPositive === 'NO' || filters.bothPositive === 'false') {
      where.bothPositive = false;
    }

    const sortBy = filters.sortBy || 'rowNumber';
    const sortOrder = filters.sortOrder || 'asc';

    const [totalCount, samples] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          report: {
            select: {
              reportNumber: true,
              title: true,
              sampleReceiptDate: true,
              hgbThreshold: true,
              hctThreshold: true,
            },
          },
        },
      }),
    ]);

    return {
      samples: samples.map((s) => ({
        id: s.id,
        reportId: s.reportId,
        reportNumber: s.report.reportNumber,
        sampleCode: s.sampleCode,
        rowNumber: s.rowNumber,
        hgbValue: Number(s.hgbValue),
        hgbStatus: s.hgbStatus as PositivityStatus,
        hctValue: Number(s.hctValue),
        hctStatus: s.hctStatus as PositivityStatus,
        bothPositive: s.bothPositive,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Get all samples matching filters without pagination limit (useful for server-side exports)
   */
  public static async getAllMatchingSamples(filters: Omit<SampleQueryFilters, 'page' | 'pageSize'>) {
    const where: Prisma.SampleWhereInput = {};

    if (filters.reportId && filters.reportId !== 'all') {
      where.reportId = filters.reportId;
    }

    if (filters.search && filters.search.trim()) {
      where.sampleCode = {
        contains: filters.search.trim(),
      };
    }

    if (filters.hgbStatus && (filters.hgbStatus === 'POSITIVE' || filters.hgbStatus === 'NEGATIVE')) {
      where.hgbStatus = filters.hgbStatus;
    }

    if (filters.hctStatus && (filters.hctStatus === 'POSITIVE' || filters.hctStatus === 'NEGATIVE')) {
      where.hctStatus = filters.hctStatus;
    }

    if (filters.bothPositive === 'YES' || filters.bothPositive === 'true') {
      where.bothPositive = true;
    } else if (filters.bothPositive === 'NO' || filters.bothPositive === 'false') {
      where.bothPositive = false;
    }

    const sortBy = filters.sortBy || 'rowNumber';
    const sortOrder = filters.sortOrder || 'asc';

    const samples = await prisma.sample.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        report: {
          select: {
            reportNumber: true,
            title: true,
            hgbThreshold: true,
            hctThreshold: true,
          },
        },
      },
    });

    return samples.map((s, index) => ({
      id: s.id,
      reportId: s.reportId,
      reportNumber: s.report.reportNumber,
      sampleCode: s.sampleCode,
      rowNumber: s.rowNumber,
      sequentialIndex: index + 1, // recalculated sequential index for filtered exports
      hgbValue: Number(s.hgbValue),
      hgbStatus: s.hgbStatus as PositivityStatus,
      hctValue: Number(s.hctValue),
      hctStatus: s.hctStatus as PositivityStatus,
      bothPositive: s.bothPositive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  /**
   * Get positive samples only (BOTH POSITIVE = YES)
   * Sorted by sampleCode ascending by default, with sequentially recalculated SN
   */
  public static async getPositiveSamples(filters: {
    reportId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SampleWhereInput = {
      bothPositive: true,
    };

    if (filters.reportId && filters.reportId !== 'all') {
      where.reportId = filters.reportId;
    }

    if (filters.search && filters.search.trim()) {
      where.sampleCode = {
        contains: filters.search.trim(),
      };
    }

    const [totalCount, samples] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          sampleCode: 'asc', // Required: sorted ascending by sample code
        },
        include: {
          report: {
            select: {
              reportNumber: true,
              title: true,
            },
          },
        },
      }),
    ]);

    // Recalculate SN sequentially from 1 for the filtered output
    const items = samples.map((s, idx) => ({
      id: s.id,
      reportId: s.reportId,
      reportNumber: s.report.reportNumber,
      sampleCode: s.sampleCode,
      sn: skip + idx + 1, // Sequential SN starting from 1
      hgbValue: Number(s.hgbValue),
      hgbStatus: s.hgbStatus as PositivityStatus,
      hctValue: Number(s.hctValue),
      hctStatus: s.hctStatus as PositivityStatus,
      bothPositive: true,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return {
      samples: items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Update sample details with recalculation according to the report's stored thresholds
   */
  public static async updateSample(
    sampleId: string,
    data: { sampleCode?: string; hgbValue?: number; hctValue?: number },
    adminUserId?: string
  ) {
    const existing = await prisma.sample.findUnique({
      where: { id: sampleId },
      include: { report: true },
    });

    if (!existing) {
      throw new Error('Sample not found');
    }

    const newHgb = data.hgbValue !== undefined ? data.hgbValue : Number(existing.hgbValue);
    const newHct = data.hctValue !== undefined ? data.hctValue : Number(existing.hctValue);
    const newCode = data.sampleCode !== undefined ? data.sampleCode.trim() : existing.sampleCode;

    // Preserve historical thresholds
    const thresholds = {
      hgbThreshold: Number(existing.report.hgbThreshold),
      hctThreshold: Number(existing.report.hctThreshold),
    };

    const evaluated = CalculationService.evaluateSample(newHgb, newHct, thresholds);

    // Update inside transaction and recompute report statistics
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.sample.update({
        where: { id: sampleId },
        data: {
          sampleCode: newCode,
          hgbValue: new Prisma.Decimal(evaluated.hgbValue),
          hgbStatus: evaluated.hgbStatus,
          hctValue: new Prisma.Decimal(evaluated.hctValue),
          hctStatus: evaluated.hctStatus,
          bothPositive: evaluated.bothPositive,
        },
      });

      // Recalculate parent report stats
      const [allSamples] = await Promise.all([
        tx.sample.findMany({
          where: { reportId: existing.reportId },
          select: { hgbStatus: true, hctStatus: true, bothPositive: true },
        }),
      ]);

      const positiveHgbCount = allSamples.filter((x) => x.hgbStatus === 'POSITIVE').length;
      const positiveHctCount = allSamples.filter((x) => x.hctStatus === 'POSITIVE').length;
      const bothPositiveCount = allSamples.filter((x) => x.bothPositive).length;

      await tx.report.update({
        where: { id: existing.reportId },
        data: {
          positiveHgbCount,
          positiveHctCount,
          bothPositiveCount,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          adminUserId: adminUserId || null,
          action: 'SAMPLE_UPDATED',
          entityType: 'Sample',
          entityId: sampleId,
          details: JSON.stringify({
            previous: {
              sampleCode: existing.sampleCode,
              hgbValue: Number(existing.hgbValue),
              hctValue: Number(existing.hctValue),
              bothPositive: existing.bothPositive,
            },
            updated: {
              sampleCode: newCode,
              hgbValue: evaluated.hgbValue,
              hctValue: evaluated.hctValue,
              bothPositive: evaluated.bothPositive,
            },
          }),
        },
      });

      return s;
    });

    return updated;
  }

  /**
   * Delete sample with confirmation and update report aggregate counts
   */
  public static async deleteSample(sampleId: string, adminUserId?: string) {
    const existing = await prisma.sample.findUnique({
      where: { id: sampleId },
    });

    if (!existing) {
      throw new Error('Sample not found');
    }

    const reportId = existing.reportId;

    await prisma.$transaction(async (tx) => {
      await tx.sample.delete({
        where: { id: sampleId },
      });

      // Recalculate parent report stats
      const remaining = await tx.sample.findMany({
        where: { reportId },
        select: { hgbStatus: true, hctStatus: true, bothPositive: true },
      });

      const positiveHgbCount = remaining.filter((x) => x.hgbStatus === 'POSITIVE').length;
      const positiveHctCount = remaining.filter((x) => x.hctStatus === 'POSITIVE').length;
      const bothPositiveCount = remaining.filter((x) => x.bothPositive).length;

      await tx.report.update({
        where: { id: reportId },
        data: {
          totalSamples: remaining.length,
          positiveHgbCount,
          positiveHctCount,
          bothPositiveCount,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          adminUserId: adminUserId || null,
          action: 'SAMPLE_DELETED',
          entityType: 'Sample',
          entityId: sampleId,
          details: JSON.stringify({
            sampleCode: existing.sampleCode,
            reportId: existing.reportId,
          }),
        },
      });
    });

    return { success: true };
  }
}
