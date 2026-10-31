import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { PositivityStatus } from '@/types';
import { CalculationService } from './calculation.service';
import { formatArabicForPdf, getPdfFontPaths } from '@/lib/pdf/arabic-helper';

export interface ExportReportData {
  reportNumber: string;
  title: string;
  recipientName: string;
  sampleReceiptDate: string | Date;
  generatedAt: string | Date;
  ageCategory?: string | null;
  batchIdentifier?: string | null;
  totalSamples: number;
  bothPositiveCount: number;
  hgbThreshold: number;
  hctThreshold: number;
  samples: {
    rowNumber?: number;
    sampleCode: string;
    hgbValue: number;
    hgbStatus: PositivityStatus;
    hctValue: number;
    hctStatus: PositivityStatus;
    bothPositive: boolean;
  }[];
}

export class ExportService {
  /**
   * Helper method to add a formatted report worksheet with header metadata and sample table.
   */
  private static addReportWorksheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    sheetTitle: string,
    data: ExportReportData,
    samples: ExportReportData['samples']
  ): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      views: [{ state: 'frozen', ySplit: 8 }],
    });

    // Row 1: Title & Metadata Row (Merged A1:G1)
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = sheetTitle;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF173B65' }, // Primary Navy
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // Report Information Block (Rows 2 to 6)
    let receiptDateStr = 'N/A';
    if (data.sampleReceiptDate) {
      const d = new Date(data.sampleReceiptDate);
      receiptDateStr = isNaN(d.getTime()) ? String(data.sampleReceiptDate) : d.toLocaleDateString('en-GB');
    }

    let generatedDateStr = 'N/A';
    if (data.generatedAt) {
      const d = new Date(data.generatedAt);
      generatedDateStr = isNaN(d.getTime()) ? String(data.generatedAt) : d.toLocaleString('en-GB');
    }

    sheet.addRow(['Report No:', data.reportNumber, '', 'Recipient:', data.recipientName, '', '']);
    sheet.addRow([
      'Receipt Date:',
      receiptDateStr,
      '',
      'Age Category:',
      data.ageCategory || 'حقائق',
      '',
      '',
    ]);
    sheet.addRow([
      'Generated Date:',
      generatedDateStr,
      '',
      'Batch Identifier:',
      data.batchIdentifier || 'N/A',
      '',
      '',
    ]);
    const hgbThresh = typeof data.hgbThreshold === 'number' && !isNaN(data.hgbThreshold) ? data.hgbThreshold : 14.0;
    const hctThresh = typeof data.hctThreshold === 'number' && !isNaN(data.hctThreshold) ? data.hctThreshold : 32.0;

    sheet.addRow([
      'HGB Threshold:',
      `>= ${hgbThresh} g/dL`,
      '',
      'HCT Threshold:',
      `>= ${hctThresh} %`,
      '',
      '',
    ]);

    const endRow = 8 + samples.length;
    const displayedCellVal =
      samples.length === 0
        ? 0
        : {
          formula: `SUBTOTAL(103,B9:B${endRow})`,
          result: samples.length,
        };

    sheet.addRow([
      'Total Samples:',
      data.totalSamples,
      '',
      'Both Positive Samples:',
      data.bothPositiveCount,
      'Displayed Samples:',
      displayedCellVal,
    ]);

    // Format metadata block
    for (let r = 2; r <= 6; r++) {
      const row = sheet.getRow(r);
      row.height = 20;
      row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF173B65' } };
      row.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF173B65' } };
      row.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF1F2937' } };
      row.getCell(5).font = { name: 'Arial', size: 10, color: { argb: 'FF1F2937' } };
      row.getCell(1).alignment = { vertical: 'middle' };
      row.getCell(2).alignment = { vertical: 'middle' };
      row.getCell(4).alignment = { vertical: 'middle' };
      row.getCell(5).alignment = { vertical: 'middle' };

      if (r === 6) {
        // Red color for both positive count
        row.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
        // Displayed samples count styling
        row.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF173B65' } };
        row.getCell(7).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F2937' } };
        row.getCell(6).alignment = { vertical: 'middle' };
        row.getCell(7).alignment = { vertical: 'middle' };
      }
    }

    // Blank spacer row (Row 7)
    const spacerRow = sheet.addRow([]);
    spacerRow.height = 12;

    // Table Header Row (Row 8)
    const headerRow = sheet.getRow(8);
    headerRow.values = [
      'SN',
      'SAMPLE CODE',
      'HGB (g/dL)',
      'HGB STATUS',
      'HCT',
      'HCT STATUS',
      'BOTH POSITIVE',
    ];
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF173B65' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    const hgbThreshStr = Number(hgbThresh).toFixed(1);
    const hctThreshStr = Number(hctThresh).toFixed(1);
    const isPosSheet = sheetName === 'Positive Samples';
    const isNegSheet = sheetName === 'Negative Samples';
    const isFullSheet = !isPosSheet && !isNegSheet;

    // Populate Sample Data Rows (Row 9+)
    samples.forEach((sample, idx) => {
      const rowNum = 9 + idx;
      const hgbNum = Number(sample.hgbValue);
      const hctNum = Number(sample.hctValue);

      // Status calculations using unrounded underlying numeric values
      const isHgbPos = CalculationService.calculateHgbStatus(hgbNum, hgbThresh) === 'POSITIVE';
      const isHctPos = CalculationService.calculateHctStatus(hctNum, hctThresh) === 'POSITIVE';
      const isBothPos = isHgbPos && isHctPos;

      const cellHgbVal: any = hgbNum;
      const cellHgbStatus: any = {
        formula: `IF(C${rowNum}>=${hgbThreshStr},"POSITIVE","NEGATIVE")`,
        result: isHgbPos ? 'POSITIVE' : 'NEGATIVE',
      };
      const cellHctVal: any = hctNum;
      const cellHctStatus: any = {
        formula: `IF(E${rowNum}>=${hctThreshStr},"POSITIVE","NEGATIVE")`,
        result: isHctPos ? 'POSITIVE' : 'NEGATIVE',
      };
      const cellBothVal: any = {
        formula: `IF(AND(D${rowNum}="POSITIVE",F${rowNum}="POSITIVE"),"YES","")`,
        result: isBothPos ? 'YES' : '',
      };

      const row = sheet.addRow([
        idx + 1,
        sample.sampleCode,
        cellHgbVal,
        cellHgbStatus,
        cellHctVal,
        cellHctStatus,
        cellBothVal,
      ]);

      row.height = 20;

      // Base border & alignment
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1F2937' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          bottom: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          left: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          right: { style: 'thin', color: { argb: 'FFD9E0E8' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Zebra striping
        if (idx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        }
      });

      // Number formatting
      row.getCell(1).numFmt = '0';
      if (typeof cellHgbVal === 'number') row.getCell(3).numFmt = '0.0';
      if (typeof cellHctVal === 'number') row.getCell(5).numFmt = '0.0';

      // Value color for positive sheet
      if (isPosSheet) {
        if (isHgbPos && typeof cellHgbVal === 'number') {
          row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
        }
        if (isHctPos && typeof cellHctVal === 'number') {
          row.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
        }
      }

      // HGB Status color
      const hgbStatusCell = row.getCell(4);
      if (isHgbPos && cellHgbStatus) {
        hgbStatusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
      } else if (cellHgbStatus) {
        hgbStatusCell.font = { name: 'Arial', size: 10, color: { argb: 'FF285783' } };
      }

      // HCT Status color
      const hctStatusCell = row.getCell(6);
      if (isHctPos && cellHctStatus) {
        hctStatusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
      } else if (cellHctStatus) {
        hctStatusCell.font = { name: 'Arial', size: 10, color: { argb: 'FF285783' } };
      }

      // Both Positive color
      const bothCell = row.getCell(7);
      if (isBothPos && cellBothVal) {
        bothCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
      } else if (cellBothVal) {
        bothCell.font = { name: 'Arial', size: 10, color: { argb: 'FF285783' } };
      }
    });

    // Column widths
    sheet.columns = [
      { width: 8 },  // SN
      { width: 20 }, // SAMPLE CODE
      { width: 15 }, // HGB (g/dL)
      { width: 16 }, // HGB STATUS
      { width: 14 }, // HCT
      { width: 18 }, // HCT STATUS
      { width: 20 }, // BOTH POSITIVE / Displayed Samples
    ];

    sheet.autoFilter = 'A8:G8';
    return sheet;
  }

  /**
   * Generates a styled Excel workbook containing exactly three worksheets:
   * 1. Full Report: all samples belonging to the selected report
   * 2. Positive Samples: only samples where BOTH POSITIVE = YES
   * 3. Negative Samples: samples where BOTH POSITIVE is not YES (including single parameter positive)
   */
  public static async generateFullReportExcel(data: ExportReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RACE SAMPLES';
    workbook.created = new Date();

    const rawTitle = data.title || 'تحليل فحص صورة الدم (CBC)';
    const baseTitle =
      rawTitle
        .replace(
          /\s*—\s*(FULL REPORT|POSITIVE SAMPLES|NEGATIVE SAMPLES|POSITIVE RESULTS|TOTAL RESULTS).*$/i,
          ''
        )
        .trim() || 'تحليل فحص صورة الدم (CBC)';

    const hgbThresh = typeof data.hgbThreshold === 'number' && !isNaN(data.hgbThreshold) ? data.hgbThreshold : 14.0;
    const hctThresh = typeof data.hctThreshold === 'number' && !isNaN(data.hctThreshold) ? data.hctThreshold : 32.0;

    // Evaluates sample statuses consistently from unrounded numeric values and report thresholds
    const evaluateSample = (s: ExportReportData['samples'][number]) => {
      const hgbNum = Number(s.hgbValue);
      const hctNum = Number(s.hctValue);
      const isHgbPos = CalculationService.calculateHgbStatus(hgbNum, hgbThresh) === 'POSITIVE';
      const isHctPos = CalculationService.calculateHctStatus(hctNum, hctThresh) === 'POSITIVE';
      const isBothPos = isHgbPos && isHctPos;
      return {
        ...s,
        hgbValue: hgbNum,
        hgbStatus: (isHgbPos ? 'POSITIVE' : 'NEGATIVE') as PositivityStatus,
        hctValue: hctNum,
        hctStatus: (isHctPos ? 'POSITIVE' : 'NEGATIVE') as PositivityStatus,
        bothPositive: isBothPos,
        isHgbPos,
        isHctPos,
      };
    };

    const allSamples = (data.samples || []).map(evaluateSample);
    const positiveSamples = allSamples.filter((s) => s.bothPositive);
    const negativeSamples = allSamples.filter((s) => !s.bothPositive);

    const reportData: ExportReportData = {
      ...data,
      totalSamples: data.totalSamples ?? allSamples.length,
      bothPositiveCount: allSamples.filter((s) => s.bothPositive).length,
      hgbThreshold: hgbThresh,
      hctThreshold: hctThresh,
      samples: allSamples,
    };

    // 1. Full Report Worksheet
    ExportService.addReportWorksheet(
      workbook,
      'Full Report',
      `${baseTitle} — FULL REPORT`,
      reportData,
      allSamples
    );

    // 2. Positive Samples Worksheet
    ExportService.addReportWorksheet(
      workbook,
      'Positive Samples',
      `${baseTitle} — POSITIVE SAMPLES`,
      reportData,
      positiveSamples
    );

    // 3. Negative Samples Worksheet
    ExportService.addReportWorksheet(
      workbook,
      'Negative Samples',
      `${baseTitle} — NEGATIVE SAMPLES`,
      reportData,
      negativeSamples
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates a styled Excel workbook for Positive Samples Only (4 columns)
   */
  public static async generatePositiveReportExcel(data: ExportReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RACE SAMPLES';

    const sheet = workbook.addWorksheet('Positive Samples', {
      pageSetup: { paperSize: 9, orientation: 'portrait' },
      views: [{ state: 'frozen', ySplit: 8 }],
    });

    const hgbThresh = typeof data.hgbThreshold === 'number' && !isNaN(data.hgbThreshold) ? data.hgbThreshold : 14.0;
    const hctThresh = typeof data.hctThreshold === 'number' && !isNaN(data.hctThreshold) ? data.hctThreshold : 32.0;

    // Positive samples (at least one parameter >= threshold), sorted by sampleCode ascending
    const positiveSamples = (data.samples || [])
      .map((s) => {
        const hgbNum = Number(s.hgbValue);
        const hctNum = Number(s.hctValue);
        const isHgbPos = CalculationService.calculateHgbStatus(hgbNum, hgbThresh) === 'POSITIVE';
        const isHctPos = CalculationService.calculateHctStatus(hctNum, hctThresh) === 'POSITIVE';
        return {
          ...s,
          hgbValue: hgbNum,
          hctValue: hctNum,
          hgbStatus: (isHgbPos ? 'POSITIVE' : 'NEGATIVE') as PositivityStatus,
          hctStatus: (isHctPos ? 'POSITIVE' : 'NEGATIVE') as PositivityStatus,
          bothPositive: isHgbPos && isHctPos,
          isHgbPos,
          isHctPos,
        };
      })
      .filter((s) => s.isHgbPos || s.isHctPos)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));

    // Header title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'المطايا الإيجابية — POSITIVE SAMPLES REPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE53935' }, // Red header for positive report
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // Metadata block
    sheet.addRow(['Report No:', data.reportNumber, 'Recipient:', data.recipientName]);
    sheet.addRow([
      'Receipt Date:',
      new Date(data.sampleReceiptDate).toLocaleDateString('en-GB'),
      'Batch Identifier:',
      data.batchIdentifier || 'N/A',
    ]);
    sheet.addRow([
      'Age Category:',
      data.ageCategory || 'حقائق',
      'Both Positive Count:',
      positiveSamples.length,
    ]);
    sheet.addRow([
      'HGB Threshold:',
      `>= ${data.hgbThreshold} g/dL`,
      'HCT Threshold:',
      `>= ${data.hctThreshold} %`,
    ]);

    for (let r = 2; r <= 5; r++) {
      const row = sheet.getRow(r);
      row.getCell(1).font = { bold: true, color: { argb: 'FF173B65' } };
      row.getCell(3).font = { bold: true, color: { argb: 'FF173B65' } };
      if (r === 4) {
        row.getCell(4).font = { bold: true, color: { argb: 'FFE53935' } };
      }
    }

    sheet.addRow([]);
    sheet.addRow([]);

    // Table Header (Row 8)
    const headerRow = sheet.getRow(8);
    headerRow.values = ['SN', 'SAMPLE CODE', 'HGB (g/dL)', 'HCT (%)'];
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF173B65' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Populate rows
    positiveSamples.forEach((sample, idx) => {
      const cellHgbVal = sample.isHgbPos ? sample.hgbValue : '';
      const cellHctVal = sample.isHctPos ? sample.hctValue : '';

      const row = sheet.addRow([
        idx + 1, // SN sequentially recalculated from 1
        sample.sampleCode,
        cellHgbVal,
        cellHctVal,
      ]);

      row.height = 20;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          bottom: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          left: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          right: { style: 'thin', color: { argb: 'FFD9E0E8' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Measurements rendered in red text for positive values
      if (sample.isHgbPos) {
        row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
        row.getCell(3).numFmt = '0.0';
      }
      if (sample.isHctPos) {
        row.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE53935' } };
        row.getCell(4).numFmt = '0.0';
      }
    });

    sheet.columns = [
      { width: 10 }, // SN
      { width: 22 }, // SAMPLE CODE
      { width: 16 }, // HGB
      { width: 16 }, // HCT
    ];

    sheet.autoFilter = 'A8:D8';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates a styled Excel workbook for Negative Samples Only (4 columns)
   */
  public static async generateNegativeReportExcel(data: ExportReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RACE SAMPLES';

    const sheet = workbook.addWorksheet('Negative Samples', {
      pageSetup: { paperSize: 9, orientation: 'portrait' },
      views: [{ state: 'frozen', ySplit: 8 }],
    });

    const hgbThresh = typeof data.hgbThreshold === 'number' && !isNaN(data.hgbThreshold) ? data.hgbThreshold : 14.0;
    const hctThresh = typeof data.hctThreshold === 'number' && !isNaN(data.hctThreshold) ? data.hctThreshold : 32.0;

    // Negative samples only (at least one parameter < threshold), sorted by sampleCode ascending
    const negativeSamples = (data.samples || [])
      .map((s) => {
        const hgbNum = Number(s.hgbValue);
        const hctNum = Number(s.hctValue);
        const isHgbPos = CalculationService.calculateHgbStatus(hgbNum, hgbThresh) === 'POSITIVE';
        const isHctPos = CalculationService.calculateHctStatus(hctNum, hctThresh) === 'POSITIVE';
        return {
          ...s,
          hgbValue: hgbNum,
          hctValue: hctNum,
          hgbStatus: (isHgbPos ? 'POSITIVE' : 'NEGATIVE') as PositivityStatus,
          hctStatus: (isHctPos ? 'POSITIVE' : 'NEGATIVE') as PositivityStatus,
          bothPositive: isHgbPos && isHctPos,
          isHgbPos,
          isHctPos,
        };
      })
      .filter((s) => !s.isHgbPos || !s.isHctPos)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));

    // Header title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'المطايا السلبية — NEGATIVE SAMPLES REPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF173B65' },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // Metadata block
    sheet.addRow(['Report No:', data.reportNumber, 'Recipient:', data.recipientName]);
    sheet.addRow([
      'Receipt Date:',
      new Date(data.sampleReceiptDate).toLocaleDateString('en-GB'),
      'Batch Identifier:',
      data.batchIdentifier || 'N/A',
    ]);
    sheet.addRow([
      'Age Category:',
      data.ageCategory || 'حقائق',
      'Negative Samples Count:',
      negativeSamples.length,
    ]);
    sheet.addRow([
      'HGB Threshold:',
      `>= ${data.hgbThreshold} g/dL`,
      'HCT Threshold:',
      `>= ${data.hctThreshold} %`,
    ]);

    for (let r = 2; r <= 5; r++) {
      const row = sheet.getRow(r);
      row.getCell(1).font = { bold: true, color: { argb: 'FF173B65' } };
      row.getCell(3).font = { bold: true, color: { argb: 'FF173B65' } };
      if (r === 4) {
        row.getCell(4).font = { bold: true, color: { argb: 'FF173B65' } };
      }
    }

    sheet.addRow([]);
    sheet.addRow([]);

    // Table Header (Row 8)
    const headerRow = sheet.getRow(8);
    headerRow.values = ['SN', 'SAMPLE CODE', 'HGB (g/dL)', 'HCT (%)'];
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF173B65' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Populate rows
    negativeSamples.forEach((sample, idx) => {
      const cellHgbVal = !sample.isHgbPos ? sample.hgbValue : '';
      const cellHctVal = !sample.isHctPos ? sample.hctValue : '';

      const row = sheet.addRow([
        idx + 1, // SN sequentially recalculated from 1
        sample.sampleCode,
        cellHgbVal,
        cellHctVal,
      ]);

      row.height = 20;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          bottom: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          left: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          right: { style: 'thin', color: { argb: 'FFD9E0E8' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      if (!sample.isHgbPos) {
        row.getCell(3).font = { name: 'Arial', size: 10, color: { argb: 'FF1F2937' } };
        row.getCell(3).numFmt = '0.0';
      }
      if (!sample.isHctPos) {
        row.getCell(4).font = { name: 'Arial', size: 10, color: { argb: 'FF1F2937' } };
        row.getCell(4).numFmt = '0.0';
      }
    });

    sheet.columns = [
      { width: 10 }, // SN
      { width: 22 }, // SAMPLE CODE
      { width: 16 }, // HGB
      { width: 16 }, // HCT
    ];

    sheet.autoFilter = 'A8:D8';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates a genuine server-side PDF for Full Report, Positive-Only, or Negative-Only Report
   */
  public static async generateReportPdf(
    data: ExportReportData,
    type: 'full' | 'positive' | 'negative' = 'full'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const isPositiveOnly = type === 'positive';
        const isNegativeOnly = type === 'negative';
        const isFourCol = isPositiveOnly || isNegativeOnly;

        const doc = new PDFDocument({
          size: 'A4',
          margin: 30,
          bufferPages: true,
          autoFirstPage: true,
        });

        // Register TrueType fonts that support Unicode and Arabic
        const { regularFontPath, boldFontPath } = getPdfFontPaths();
        doc.registerFont('AppFont', regularFontPath);
        doc.registerFont('AppFont-Bold', boldFontPath);

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const pageWidth = 595.28; // A4 width in pt
        const leftMargin = 30;
        const rightMargin = pageWidth - 30;
        const printableWidth = rightMargin - leftMargin;

        const hgbThresh = typeof data.hgbThreshold === 'number' && !isNaN(data.hgbThreshold) ? data.hgbThreshold : 14.0;
        const hctThresh = typeof data.hctThreshold === 'number' && !isNaN(data.hctThreshold) ? data.hctThreshold : 32.0;

        const isBothPositive = (s: any) => {
          const hgb = Number(s.hgbValue);
          const hct = Number(s.hctValue);
          const isHgbPos = CalculationService.calculateHgbStatus(hgb, hgbThresh) === 'POSITIVE';
          const isHctPos = CalculationService.calculateHctStatus(hct, hctThresh) === 'POSITIVE';
          return isHgbPos && isHctPos;
        };

        const samplesToRender = isPositiveOnly
          ? (data.samples || [])
            .filter((s) => isBothPositive(s))
            .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode))
          : isNegativeOnly
            ? (data.samples || [])
              .filter((s) => !isBothPositive(s))
              .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode))
            : (data.samples || []);

        // Path to reference logos
        const resolveAsset = (fileName: string): string => {
          const candidatePaths = [
            path.join(process.cwd(), 'reference-assets', fileName),
            path.join(process.cwd(), 'public', 'images', fileName),
            path.join(__dirname, '..', '..', '..', 'reference-assets', fileName),
            path.join(__dirname, '..', '..', '..', 'public', 'images', fileName),
          ];

          const resourcesPath = (process as any).resourcesPath;
          if (resourcesPath) {
            candidatePaths.push(
              path.join(resourcesPath, 'standalone', 'reference-assets', fileName),
              path.join(resourcesPath, 'standalone', 'public', 'images', fileName)
            );
          }

          for (const p of candidatePaths) {
            if (fs.existsSync(p)) return p;
          }

          return path.join(process.cwd(), 'reference-assets', fileName);
        };
        const workspaceLogo = resolveAsset('FIRST LAB.png');
        const workspaceCommittee = resolveAsset('COMMITTEE LOGO.jpg');
        const workspaceStamp = resolveAsset('stamp.jpeg');

        const rowsPerPage = 26; // Match reference image 1 (shows 26 rows per page)
        const totalPages = Math.max(1, Math.ceil(samplesToRender.length / rowsPerPage));

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (pageNum > 1) {
            doc.addPage();
          }

          let currentY = 22;

          // 1. TOP HEADER (Logos & Center Title)
          if (fs.existsSync(workspaceLogo)) {
            doc.image(workspaceLogo, leftMargin, currentY, { width: 125, height: 55 });
          }

          if (fs.existsSync(workspaceCommittee)) {
            doc.image(workspaceCommittee, rightMargin - 62, currentY - 2, { width: 62, height: 62 });
          }

          // Center Title
          doc
            .font('AppFont-Bold')
            .fontSize(15)
            .fillColor('#173B65')
            .text('CBC BLOOD TEST ANALYSIS REPORT', leftMargin, currentY + 6, {
              align: 'center',
              width: printableWidth,
            });

          doc
            .font('AppFont-Bold')
            .fontSize(12)
            .fillColor('#E53935')
            .text(formatArabicForPdf(data.title || 'Camel Racing Festival'), leftMargin, currentY + 26, {
              align: 'center',
              width: printableWidth,
            });

          currentY += 68;

          // 2. METADATA INFO BOX (Rounded Border Table matching reference image)
          const metaBoxWidth = 240;
          const metaBoxHeight = 110;
          doc
            .roundedRect(leftMargin, currentY, metaBoxWidth, metaBoxHeight, 8)
            .lineWidth(1)
            .strokeColor('#173B65')
            .stroke();

          const positiveCount =
            data.samples && data.samples.length > 0
              ? data.samples.filter((s) => isBothPositive(s)).length
              : (data.bothPositiveCount || 0);

          const negativeCount =
            data.samples && data.samples.length > 0
              ? data.samples.filter((s) => !isBothPositive(s)).length
              : Math.max(0, (data.totalSamples || 0) - positiveCount);

          // Internal grid in Metadata Box
          const metaRows = [
            { label: 'Report No:', val: data.reportNumber, isRed: false },
            {
              label: 'Sample Receipt:',
              val: new Date(data.sampleReceiptDate).toLocaleDateString('en-GB') + ' 7:00 AM',
              isRed: false,
            },
            {
              label: 'Issue Date/Time:',
              val: new Date(data.generatedAt).toLocaleString('en-GB'),
              isRed: false,
            },
            {
              label: 'Category / Age:',
              val: formatArabicForPdf(data.ageCategory || 'Haqayeq (حقائق)'),
              isRed: false,
            },
            { label: 'Batch Identifier:', val: data.batchIdentifier || 'FL-25-0001-0085', isRed: false },
            { label: 'Total Samples:', val: String(data.totalSamples), isRed: false },
            { label: 'Positive Count:', val: String(positiveCount), isRed: true },
            { label: 'Negative Count:', val: String(negativeCount), isRed: false },
          ];

          let metaY = currentY + 5;
          metaRows.forEach((item) => {
            doc.font('AppFont-Bold').fontSize(8).fillColor('#173B65');
            doc.text(item.label, leftMargin + 8, metaY);

            doc.font('AppFont-Bold').fontSize(8);
            doc.fillColor(item.isRed ? '#E53935' : '#1F2937');
            doc.text(item.val, leftMargin + 95, metaY);
            metaY += 12.5;
          });

          // Recipient on the right
          const recipientX = leftMargin + metaBoxWidth + 15;
          const recipientWidth = printableWidth - metaBoxWidth - 15;
          doc
            .font('AppFont-Bold')
            .fontSize(10)
            .fillColor('#173B65')
            .text('Recipient:', recipientX, currentY + 12, {
              width: recipientWidth,
              align: 'left',
            });

          doc
            .font('AppFont-Bold')
            .fontSize(10)
            .fillColor('#1F2937')
            .text(
              formatArabicForPdf(data.recipientName || 'الساده/ اللجنة المنظمة لسباق الهجن'),
              recipientX,
              currentY + 28,
              {
                width: recipientWidth,
                align: 'left',
              }
            );

          currentY += metaBoxHeight + 10;

          // 3. THRESHOLD EXPLANATION BANNER (Bordered box with proper padding & height)
          const bannerHeight = 44;
          doc
            .roundedRect(leftMargin, currentY, printableWidth, bannerHeight, 5)
            .lineWidth(1)
            .strokeColor('#173B65')
            .fillAndStroke('#F8FAFC', '#173B65');

          doc
            .font('AppFont')
            .fontSize(7.5)
            .fillColor('#334155')
            .text(
              'Samples are considered POSITIVE under Camel Racing Committee regulations when BOTH Hemoglobin (HGB) and Hematocrit (HCT) reach or exceed the defined limits: ',
              leftMargin + 8,
              currentY + 6,
              { width: printableWidth - 16, lineGap: 1.5 }
            );

          const hgbStr = Number(data.hgbThreshold).toFixed(1);
          const hctStr = Number(data.hctThreshold).toFixed(1);
          doc
            .font('AppFont-Bold')
            .fontSize(8.5)
            .fillColor('#DC2626')
            .text(
              `Criteria: (HGB >= ${hgbStr} g/dL, HCT >= ${hctStr}%)`,
              leftMargin + 8,
              currentY + 26,
              { width: printableWidth - 16, underline: true }
            );

          currentY += bannerHeight + 12;

          // 4. SECTION TITLE
          if (isPositiveOnly) {
            doc
              .font('AppFont-Bold')
              .fontSize(13)
              .fillColor('#E53935')
              .text('POSITIVE SAMPLES REPORT — POSITIVE RESULTS', leftMargin, currentY, {
                align: 'center',
                width: printableWidth,
                underline: true,
              });
          } else if (isNegativeOnly) {
            doc
              .font('AppFont-Bold')
              .fontSize(13)
              .fillColor('#173B65')
              .text('NEGATIVE SAMPLES REPORT — NEGATIVE RESULTS', leftMargin, currentY, {
                align: 'center',
                width: printableWidth,
                underline: true,
              });
          } else {
            doc
              .font('AppFont-Bold')
              .fontSize(13)
              .fillColor('#173B65')
              .text('CBC BLOOD TEST ANALYSIS REPORT — TOTAL RESULTS', leftMargin, currentY, {
                align: 'center',
                width: printableWidth,
                underline: true,
              });
          }

          currentY += 18;

          // 5. TABLE HEADER
          const colWidths = isFourCol
            ? [45, 210, 140, 140] // SN, SAMPLE CODE, HGB, HCT
            : [35, 120, 75, 80, 65, 80, 80]; // Full 7 columns

          const colHeaders = isFourCol
            ? ['SN', 'SAMPLE CODE', 'HGB (g/dL)', 'HCT (%)']
            : ['SN', 'SAMPLE CODE', 'HGB (g/dL)', 'HGB STATUS', 'HCT', 'HCT STATUS', 'BOTH POSITIVE'];

          // Draw dark navy header row
          const headerHeight = 20;
          doc.rect(leftMargin, currentY, printableWidth, headerHeight).fill('#173B65');

          let headerX = leftMargin;
          doc.font('AppFont-Bold').fontSize(8).fillColor('#FFFFFF');
          colHeaders.forEach((title, idx) => {
            const w = colWidths[idx];
            doc.text(title, headerX, currentY + 5, { width: w, align: 'center' });
            headerX += w;
          });

          currentY += headerHeight;

          // 6. TABLE DATA ROWS FOR THIS PAGE
          const startIndex = (pageNum - 1) * rowsPerPage;
          const pageSamples = samplesToRender.slice(startIndex, startIndex + rowsPerPage);
          const rowHeight = 15;

          pageSamples.forEach((sample, rIdx) => {
            const globalIndex = startIndex + rIdx + 1;
            const rowY = currentY;

            // Zebra background
            if (rIdx % 2 === 1) {
              doc.rect(leftMargin, rowY, printableWidth, rowHeight).fill('#F8FAFC');
            }

            // Cell borders
            doc
              .rect(leftMargin, rowY, printableWidth, rowHeight)
              .lineWidth(0.5)
              .strokeColor('#D9E0E8')
              .stroke();

            let cellX = leftMargin;

            if (isFourCol) {
              // Col 1: SN
              doc.font('AppFont').fontSize(8).fillColor('#1F2937');
              doc.text(String(globalIndex), cellX, rowY + 3.5, { width: colWidths[0], align: 'center' });
              cellX += colWidths[0];

              // Col 2: SAMPLE CODE
              doc.text(sample.sampleCode, cellX, rowY + 3.5, { width: colWidths[1], align: 'center' });
              cellX += colWidths[1];

              if (isPositiveOnly) {
                // Col 3: HGB (g/dL) in RED bold
                doc.font('AppFont-Bold').fontSize(8).fillColor('#E53935');
                doc.text(sample.hgbValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[2], align: 'center' });
                cellX += colWidths[2];

                // Col 4: HCT (%) in RED bold
                doc.text(sample.hctValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[3], align: 'center' });
              } else {
                // Negative report: normal font, slate/dark color
                doc.font('AppFont').fontSize(8).fillColor('#1F2937');
                doc.text(sample.hgbValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[2], align: 'center' });
                cellX += colWidths[2];

                doc.text(sample.hctValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[3], align: 'center' });
              }
            } else {
              // Col 1: SN
              doc.font('AppFont').fontSize(8).fillColor('#1F2937');
              doc.text(String(globalIndex), cellX, rowY + 3.5, { width: colWidths[0], align: 'center' });
              cellX += colWidths[0];

              // Col 2: SAMPLE CODE
              doc.text(sample.sampleCode, cellX, rowY + 3.5, { width: colWidths[1], align: 'center' });
              cellX += colWidths[1];

              // Col 3: HGB (g/dL)
              doc.text(sample.hgbValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[2], align: 'center' });
              cellX += colWidths[2];

              const sampleHgb = Number(sample.hgbValue);
              const sampleHct = Number(sample.hctValue);
              const isHgbPos = CalculationService.calculateHgbStatus(sampleHgb, hgbThresh) === 'POSITIVE';
              const isHctPos = CalculationService.calculateHctStatus(sampleHct, hctThresh) === 'POSITIVE';
              const isBothPos = isHgbPos && isHctPos;

              // Col 4: HGB STATUS (Red for POSITIVE, Slate for NEGATIVE)
              doc.font('AppFont-Bold').fontSize(8);
              doc.fillColor(isHgbPos ? '#E53935' : '#285783');
              doc.text(isHgbPos ? 'POSITIVE' : 'NEGATIVE', cellX, rowY + 3.5, { width: colWidths[3], align: 'center' });
              cellX += colWidths[3];

              // Col 5: HCT
              doc.font('AppFont').fontSize(8).fillColor('#1F2937');
              doc.text(sampleHct.toFixed(1), cellX, rowY + 3.5, { width: colWidths[4], align: 'center' });
              cellX += colWidths[4];

              // Col 6: HCT STATUS (Red for POSITIVE, Slate for NEGATIVE)
              doc.font('AppFont-Bold').fontSize(8);
              doc.fillColor(isHctPos ? '#E53935' : '#285783');
              doc.text(isHctPos ? 'POSITIVE' : 'NEGATIVE', cellX, rowY + 3.5, { width: colWidths[5], align: 'center' });
              cellX += colWidths[5];

              // Col 7: BOTH POSITIVE (YES in Red, or blank)
              if (isBothPos) {
                doc.fillColor('#E53935');
                doc.text('YES', cellX, rowY + 3.5, { width: colWidths[6], align: 'center' });
              }
            }

            currentY += rowHeight;
          });

          // 7. FOOTER: Page number & Stamp
          const footerY = 800;
          doc
            .font('AppFont')
            .fontSize(9)
            .fillColor('#1F2937')
            .text(`Page ${pageNum} of ${totalPages}`, leftMargin, footerY, { align: 'left' });

          // Validated stamp on bottom-right of last page if present
          if (pageNum === totalPages && fs.existsSync(workspaceStamp)) {
            doc.image(workspaceStamp, rightMargin - 75, footerY - 45, { fit: [75, 45], align: 'right' });
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
