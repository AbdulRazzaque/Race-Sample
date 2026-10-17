import * as XLSX from 'xlsx';
import prisma from '@/lib/db/prisma';
import { CalculationService } from './calculation.service';
import { SettingsService } from './settings.service';
import {
  ImportPreviewResult,
  RowValidationError,
  ThresholdConfig,
  ValidatedRow,
} from '@/types';
import { Prisma } from '@prisma/client';

export interface ColumnMapping {
  sampleCode: string;
  hgb: string;
  hct: string;
  sn?: string;
  hgbStatus?: string;
  hctStatus?: string;
  bothPositive?: string;
}

export class ImportService {
  /**
   * Helper to normalize a header string for matching
   */
  private static normalizeHeader(str: string): string {
    return str
      .toLowerCase()
      .replace(/[\s_\-()\/\\%]/g, '')
      .trim();
  }

  /**
   * Detect column names automatically from row headers
   */
  public static detectColumns(headers: string[]): {
    sampleCode: string | null;
    hgb: string | null;
    hct: string | null;
    sn: string | null;
    hgbStatus: string | null;
    hctStatus: string | null;
    bothPositive: string | null;
  } {
    const result = {
      sampleCode: null as string | null,
      hgb: null as string | null,
      hct: null as string | null,
      sn: null as string | null,
      hgbStatus: null as string | null,
      hctStatus: null as string | null,
      bothPositive: null as string | null,
    };

    for (const h of headers) {
      const norm = this.normalizeHeader(h);

      // BOTH POSITIVE
      if (
        norm === 'bothpositive' ||
        norm === 'bothpos' ||
        norm === 'positiveboth' ||
        norm.includes('bothpositive') ||
        norm.includes('كلاهما')
      ) {
        if (!result.bothPositive) result.bothPositive = h;
        continue;
      }

      // HGB STATUS
      if (
        norm === 'hgbstatus' ||
        norm === 'hemoglobinstatus' ||
        norm.includes('hgbstatus') ||
        norm.includes('حالةالهيموجلوبين')
      ) {
        if (!result.hgbStatus) result.hgbStatus = h;
        continue;
      }

      // HCT STATUS
      if (
        norm === 'hctstatus' ||
        norm === 'hematocritstatus' ||
        norm.includes('hctstatus') ||
        norm.includes('حالةالهيماتوكريت')
      ) {
        if (!result.hctStatus) result.hctStatus = h;
        continue;
      }

      // SAMPLE CODE
      if (
        norm === 'samplecode' ||
        norm === 'sampleid' ||
        norm === 'sampleno' ||
        norm === 'barcode' ||
        norm === 'code' ||
        norm === 'sample' ||
        norm.includes('samplecode') ||
        norm.includes('كودالعينة') ||
        norm.includes('الرمز')
      ) {
        if (!result.sampleCode) result.sampleCode = h;
        continue;
      }

      // HGB (Value)
      if (
        norm === 'hgb' ||
        norm === 'hgbgdl' ||
        norm === 'hemoglobin' ||
        norm === 'hb' ||
        norm.startsWith('hgb') ||
        norm.includes('هيموجلوبين')
      ) {
        if (!result.hgb) result.hgb = h;
        continue;
      }

      // HCT (Value)
      if (
        norm === 'hct' ||
        norm === 'hct%' ||
        norm === 'hematocrit' ||
        norm === 'pcv' ||
        norm.startsWith('hct') ||
        norm.includes('هيماتوكريت')
      ) {
        if (!result.hct) result.hct = h;
        continue;
      }

      // SN
      if (
        norm === 'sn' ||
        norm === 'serial' ||
        norm === 'serialno' ||
        norm === 'no' ||
        norm === 'م'
      ) {
        if (!result.sn) result.sn = h;
        continue;
      }
    }

    return result;
  }

  /**
   * Parse workbook buffer and generate preview with calculation results
   */
  public static async parseAndPreview(
    buffer: Buffer,
    fileName: string,
    sheetNameOverride?: string,
    mappingOverride?: Partial<ColumnMapping>,
    customThresholds?: ThresholdConfig
  ): Promise<ImportPreviewResult> {
    // 1. Read workbook
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Workbook contains no worksheets.');
    }

    const availableWorksheets = workbook.SheetNames;
    const worksheetName =
      sheetNameOverride && availableWorksheets.includes(sheetNameOverride)
        ? sheetNameOverride
        : availableWorksheets[0];

    const worksheet = workbook.Sheets[worksheetName];
    if (!worksheet) {
      throw new Error(`Worksheet "${worksheetName}" not found.`);
    }

    // 2. Convert to raw 2D array of rows to locate headers properly
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawRows.length === 0) {
      throw new Error('Worksheet is completely empty.');
    }

    // Locate header row: scan first 10 rows for recognizable columns
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const candidateHeaders = (rawRows[r] || []).map((c: any) => String(c).trim());
      const detected = this.detectColumns(candidateHeaders);
      if (detected.sampleCode || (detected.hgb && detected.hct)) {
        headerRowIndex = r;
        headers = candidateHeaders;
        break;
      }
    }

    if (headers.length === 0) {
      // Default to row 0
      headers = (rawRows[0] || []).map((c: any) => String(c).trim());
    }

    // Filter out completely blank trailing header columns
    headers = headers.map((h, idx) => (h ? h : `Col_${idx + 1}`));

    // Detect mapping
    const autoDetected = this.detectColumns(headers);
    const finalMapping: ColumnMapping = {
      sampleCode: mappingOverride?.sampleCode || autoDetected.sampleCode || '',
      hgb: mappingOverride?.hgb || autoDetected.hgb || '',
      hct: mappingOverride?.hct || autoDetected.hct || '',
      sn: mappingOverride?.sn || autoDetected.sn || undefined,
      hgbStatus: mappingOverride?.hgbStatus || autoDetected.hgbStatus || undefined,
      hctStatus: mappingOverride?.hctStatus || autoDetected.hctStatus || undefined,
      bothPositive: mappingOverride?.bothPositive || autoDetected.bothPositive || undefined,
    };

    // Thresholds
    const activeThresholds =
      customThresholds || (await SettingsService.getThresholds());

    // 3. Parse data rows
    const dataRowArray = rawRows.slice(headerRowIndex + 1);
    const validRows: ValidatedRow[] = [];
    const errors: RowValidationError[] = [];
    const seenSampleCodes = new Set<string>();

    let totalParsed = 0;

    for (let i = 0; i < dataRowArray.length; i++) {
      const row = dataRowArray[i];
      const actualRowNumber = headerRowIndex + 2 + i; // 1-indexed Excel row

      // Check if row is completely empty
      const isAllBlank = row.every(
        (cell: any) => cell === '' || cell === null || cell === undefined
      );
      if (isAllBlank) {
        continue; // skip blank row cleanly
      }

      totalParsed++;

      // Map values
      const getVal = (colName?: string) => {
        if (!colName) return undefined;
        const colIdx = headers.indexOf(colName);
        if (colIdx === -1) return undefined;
        return row[colIdx];
      };

      const rawSampleCode = getVal(finalMapping.sampleCode);
      const rawHgb = getVal(finalMapping.hgb);
      const rawHct = getVal(finalMapping.hct);

      const sampleCodeStr = rawSampleCode !== undefined && rawSampleCode !== null
        ? String(rawSampleCode).trim()
        : '';

      // Validation 1: Sample Code required
      if (!sampleCodeStr) {
        errors.push({
          rowIndex: actualRowNumber,
          columnName: finalMapping.sampleCode || 'SAMPLE CODE',
          errorCode: 'MISSING_SAMPLE_CODE',
          errorMessage: 'Sample code is missing or empty',
          originalValue: String(rawSampleCode ?? ''),
        });
        continue;
      }

      // Validation 2: Duplicate Sample Code within current batch
      if (seenSampleCodes.has(sampleCodeStr)) {
        errors.push({
          rowIndex: actualRowNumber,
          columnName: finalMapping.sampleCode || 'SAMPLE CODE',
          sampleCode: sampleCodeStr,
          errorCode: 'DUPLICATE_SAMPLE_CODE',
          errorMessage: `Duplicate sample code "${sampleCodeStr}" within this import file`,
          originalValue: sampleCodeStr,
        });
        continue;
      }

      // Validation 3: HGB numeric value
      const parsedHgb = CalculationService.parseNumericValue(rawHgb);
      if (parsedHgb === null) {
        errors.push({
          rowIndex: actualRowNumber,
          columnName: finalMapping.hgb || 'HGB',
          sampleCode: sampleCodeStr,
          errorCode: 'INVALID_HGB',
          errorMessage: `HGB value is missing or non-numeric (got "${rawHgb}")`,
          originalValue: String(rawHgb ?? ''),
        });
        continue;
      }

      // Validation 4: HCT numeric value
      const parsedHct = CalculationService.parseNumericValue(rawHct);
      if (parsedHct === null) {
        errors.push({
          rowIndex: actualRowNumber,
          columnName: finalMapping.hct || 'HCT',
          sampleCode: sampleCodeStr,
          errorCode: 'INVALID_HCT',
          errorMessage: `HCT value is missing or non-numeric (got "${rawHct}")`,
          originalValue: String(rawHct ?? ''),
        });
        continue;
      }

      // All validations passed: calculate statuses using official server business rules
      seenSampleCodes.add(sampleCodeStr);

      const evaluated = CalculationService.evaluateSample(
        parsedHgb,
        parsedHct,
        activeThresholds
      );

      validRows.push({
        rowIndex: actualRowNumber,
        sampleCode: sampleCodeStr,
        hgbValue: evaluated.hgbValue,
        hgbStatus: evaluated.hgbStatus,
        hctValue: evaluated.hctValue,
        hctStatus: evaluated.hctStatus,
        bothPositive: evaluated.bothPositive,
        bothPositiveDisplay: evaluated.bothPositiveDisplay,
        originalValues: {
          hgbRaw: rawHgb,
          hctRaw: rawHct,
        },
      });
    }

    // Compute preview summaries
    const positiveHgbCount = validRows.filter((r) => r.hgbStatus === 'POSITIVE').length;
    const positiveHctCount = validRows.filter((r) => r.hctStatus === 'POSITIVE').length;
    const bothPositiveCount = validRows.filter((r) => r.bothPositive).length;
    const neitherPositiveCount = validRows.filter(
      (r) => r.hgbStatus === 'NEGATIVE' && r.hctStatus === 'NEGATIVE'
    ).length;

    const duplicateErrors = errors.filter((e) => e.errorCode === 'DUPLICATE_SAMPLE_CODE').length;

    return {
      fileName,
      detectedWorksheet: worksheetName,
      availableWorksheets,
      totalParsedRows: totalParsed,
      validRowCount: validRows.length,
      invalidRowCount: errors.length,
      duplicateRowCount: duplicateErrors,
      detectedColumns: autoDetected,
      headers,
      validRows,
      errors,
      summary: {
        totalSamples: validRows.length,
        positiveHgbCount,
        positiveHctCount,
        bothPositiveCount,
        neitherPositiveCount,
      },
      thresholdsUsed: activeThresholds,
    };
  }

  /**
   * Generates next sequential report number (e.g., RC-0001, RC-0002)
   */
  public static async generateNextReportNumber(): Promise<string> {
    const lastReport = await prisma.report.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { reportNumber: true },
    });

    if (!lastReport || !lastReport.reportNumber) {
      return 'RC-0001';
    }

    const match = lastReport.reportNumber.match(/RC-(\d+)/);
    if (match && match[1]) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `RC-${String(nextNum).padStart(4, '0')}`;
    }

    return `RC-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Confirms import and writes report + sample records within a database transaction
   */
  public static async confirmImport(params: {
    fileName: string;
    validRows: ValidatedRow[];
    errors: RowValidationError[];
    thresholds: ThresholdConfig;
    adminUserId?: string;
    reportTitle?: string;
    recipientName?: string;
    ageCategory?: string;
    sampleReceiptDate?: Date;
    reportNumber?: string;
  }) {
    const {
      fileName,
      validRows,
      errors,
      thresholds,
      adminUserId,
      reportTitle,
      recipientName,
      ageCategory,
      sampleReceiptDate,
      reportNumber: customReportNumber,
    } = params;

    if (validRows.length === 0) {
      throw new Error('Cannot commit import: zero valid rows to save.');
    }

    const appSettings = await SettingsService.getAllSettings();
    const finalReportNumber =
      customReportNumber || (await this.generateNextReportNumber());

    // Compute batch identifier from sample codes (e.g. "FL-25-0001-0085")
    const firstCode = validRows[0].sampleCode;
    const lastCode = validRows[validRows.length - 1].sampleCode;
    const batchIdentifier = `${firstCode} - ${lastCode}`;

    const positiveHgbCount = validRows.filter((r) => r.hgbStatus === 'POSITIVE').length;
    const positiveHctCount = validRows.filter((r) => r.hctStatus === 'POSITIVE').length;
    const bothPositiveCount = validRows.filter((r) => r.bothPositive).length;

    // Execute in a single Prisma transaction
    const savedReport = await prisma.$transaction(async (tx) => {
      // 1. Create Report
      const report = await tx.report.create({
        data: {
          reportNumber: finalReportNumber,
          title: reportTitle || appSettings.eventName || 'تحليل فحص صورة الدم (CBC)',
          organizationNameSnapshot: appSettings.orgName,
          recipientName: recipientName || appSettings.recipientName,
          sampleReceiptDate: sampleReceiptDate || new Date(),
          generatedAt: new Date(),
          originalFileName: fileName,
          ageCategory: ageCategory || appSettings.ageCategory || 'حقائق',
          batchIdentifier,
          totalSamples: validRows.length,
          positiveHgbCount,
          positiveHctCount,
          bothPositiveCount,
          hgbThreshold: new Prisma.Decimal(thresholds.hgbThreshold),
          hctThreshold: new Prisma.Decimal(thresholds.hctThreshold),
          status: 'ACTIVE',
          createdByAdminId: adminUserId || null,
        },
      });

      // 2. Batch insert samples with sequential SN
      const sampleData = validRows.map((r, idx) => ({
        reportId: report.id,
        sampleCode: r.sampleCode,
        rowNumber: idx + 1, // SN: 1, 2, 3...
        hgbValue: new Prisma.Decimal(r.hgbValue),
        hgbStatus: r.hgbStatus,
        hctValue: new Prisma.Decimal(r.hctValue),
        hctStatus: r.hctStatus,
        bothPositive: r.bothPositive,
      }));

      await tx.sample.createMany({
        data: sampleData,
      });

      // 3. Create ImportJob record
      const importJob = await tx.importJob.create({
        data: {
          reportId: report.id,
          originalFileName: fileName,
          status: 'COMPLETED',
          totalRows: validRows.length + errors.length,
          validRows: validRows.length,
          invalidRows: errors.length,
          importedRows: validRows.length,
          duplicateRows: errors.filter((e) => e.errorCode === 'DUPLICATE_SAMPLE_CODE').length,
          completedAt: new Date(),
        },
      });

      // 4. Record any ImportErrors
      if (errors.length > 0) {
        await tx.importError.createMany({
          data: errors.map((err) => ({
            importJobId: importJob.id,
            rowNumber: err.rowIndex,
            columnName: err.columnName || null,
            errorCode: err.errorCode,
            errorMessage: err.errorMessage,
            originalValue: err.originalValue ? String(err.originalValue) : null,
          })),
        });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          adminUserId: adminUserId || null,
          action: 'REPORT_IMPORTED',
          entityType: 'Report',
          entityId: report.id,
          details: JSON.stringify({
            reportNumber: report.reportNumber,
            importedRows: validRows.length,
            bothPositiveCount,
            fileName,
            thresholds,
          }),
        },
      });

      return report;
    });

    return {
      success: true,
      report: savedReport,
      summary: {
        reportNumber: savedReport.reportNumber,
        reportId: savedReport.id,
        importedCount: validRows.length,
        rejectedCount: errors.length,
        positiveHgbCount,
        positiveHctCount,
        bothPositiveCount,
      },
    };
  }
}
