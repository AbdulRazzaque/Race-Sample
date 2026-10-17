import prisma from '@/lib/db/prisma';
import { DashboardStats, ReportSummary } from '@/types';
import { Prisma } from '@prisma/client';

export class ReportService {
  /**
   * Get paginated reports with search and status filtering
   */
  public static async getReports(params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'createdAt' | 'reportNumber' | 'totalSamples' | 'bothPositiveCount';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 15));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ReportWhereInput = {};

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { reportNumber: { contains: q } },
        { title: { contains: q } },
        { recipientName: { contains: q } },
        { originalFileName: { contains: q } },
      ];
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    const [totalCount, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          adminUser: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    const items: ReportSummary[] = reports.map((r) => {
      const total = r.totalSamples;
      const neither = Math.max(0, total - r.positiveHgbCount - r.positiveHctCount + r.bothPositiveCount);

      return {
        id: r.id,
        reportNumber: r.reportNumber,
        title: r.title,
        recipientName: r.recipientName,
        sampleReceiptDate: r.sampleReceiptDate.toISOString(),
        generatedAt: r.generatedAt.toISOString(),
        originalFileName: r.originalFileName,
        ageCategory: r.ageCategory,
        batchIdentifier: r.batchIdentifier,
        totalSamples: r.totalSamples,
        positiveHgbCount: r.positiveHgbCount,
        positiveHctCount: r.positiveHctCount,
        bothPositiveCount: r.bothPositiveCount,
        neitherPositiveCount: neither,
        hgbThreshold: Number(r.hgbThreshold),
        hctThreshold: Number(r.hctThreshold),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      reports: items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Get full report by ID with its samples
   */
  public static async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        adminUser: {
          select: {
            username: true,
          },
        },
        samples: {
          orderBy: {
            rowNumber: 'asc',
          },
        },
      },
    });

    if (!report) return null;

    return {
      ...report,
      hgbThreshold: Number(report.hgbThreshold),
      hctThreshold: Number(report.hctThreshold),
      samples: report.samples.map((s) => ({
        id: s.id,
        reportId: s.reportId,
        sampleCode: s.sampleCode,
        rowNumber: s.rowNumber,
        hgbValue: Number(s.hgbValue),
        hgbStatus: s.hgbStatus,
        hctValue: Number(s.hctValue),
        hctStatus: s.hctStatus,
        bothPositive: s.bothPositive,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Archive or unarchive a report
   */
  public static async toggleArchiveReport(id: string, adminUserId?: string) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new Error('Report not found');

    const nextStatus = report.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    const archivedAt = nextStatus === 'ARCHIVED' ? new Date() : null;

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: nextStatus,
        archivedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminUserId: adminUserId || null,
        action: nextStatus === 'ARCHIVED' ? 'REPORT_ARCHIVED' : 'REPORT_RESTORED',
        entityType: 'Report',
        entityId: id,
        details: JSON.stringify({ reportNumber: report.reportNumber }),
      },
    });

    return updated;
  }

  /**
   * Compute comprehensive dashboard metrics directly from real database records
   */
  public static async getDashboardMetrics(): Promise<DashboardStats> {
    const [
      totalSamples,
      totalReports,
      positiveHgb,
      positiveHct,
      bothPositive,
      neitherPositive,
      recentReportsData,
      recentActivityData,
    ] = await Promise.all([
      prisma.sample.count(),
      prisma.report.count({ where: { status: 'ACTIVE' } }),
      prisma.sample.count({ where: { hgbStatus: 'POSITIVE' } }),
      prisma.sample.count({ where: { hctStatus: 'POSITIVE' } }),
      prisma.sample.count({ where: { bothPositive: true } }),
      prisma.sample.count({
        where: {
          hgbStatus: 'NEGATIVE',
          hctStatus: 'NEGATIVE',
        },
      }),
      prisma.report.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: { select: { username: true } },
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: { select: { username: true } },
        },
      }),
    ]);

    const recentReports: ReportSummary[] = recentReportsData.map((r) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      title: r.title,
      recipientName: r.recipientName,
      sampleReceiptDate: r.sampleReceiptDate.toISOString(),
      generatedAt: r.generatedAt.toISOString(),
      originalFileName: r.originalFileName,
      ageCategory: r.ageCategory,
      batchIdentifier: r.batchIdentifier,
      totalSamples: r.totalSamples,
      positiveHgbCount: r.positiveHgbCount,
      positiveHctCount: r.positiveHctCount,
      bothPositiveCount: r.bothPositiveCount,
      neitherPositiveCount: Math.max(
        0,
        r.totalSamples - r.positiveHgbCount - r.positiveHctCount + r.bothPositiveCount
      ),
      hgbThreshold: Number(r.hgbThreshold),
      hctThreshold: Number(r.hctThreshold),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    const recentActivity = recentActivityData.map((act) => ({
      id: act.id,
      action: act.action,
      details: act.details,
      createdAt: act.createdAt.toISOString(),
      username: act.adminUser?.username || 'System',
    }));

    return {
      totalSamples,
      positiveHgb,
      positiveHct,
      bothPositive,
      neitherPositive,
      totalReports,
      recentReports,
      recentActivity,
    };
  }
}
