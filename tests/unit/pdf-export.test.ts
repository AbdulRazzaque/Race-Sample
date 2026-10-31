import { formatArabicForPdf, hasArabicCharacters, getPdfFontPaths } from '../../src/lib/pdf/arabic-helper';
import { ExportService, ExportReportData } from '../../src/services/export.service';
import fs from 'fs';

describe('PDF Export & Arabic Unicode Text Handling', () => {
  describe('arabic-helper utility', () => {
    test('detects Arabic characters accurately', () => {
      expect(hasArabicCharacters('CBC BLOOD TEST ANALYSIS REPORT — TOTAL RESULTS')).toBe(false);
      expect(hasArabicCharacters('النتائج الإجمالية — TOTAL RESULTS')).toBe(true);
      expect(hasArabicCharacters('الساده/ اللجنة المنظمة لسباق الهجن')).toBe(true);
      expect(hasArabicCharacters('Haqayeq (حقائق)')).toBe(true);
      expect(hasArabicCharacters('')).toBe(false);
      expect(hasArabicCharacters(null)).toBe(false);
    });

    test('preserves pure English text unchanged', () => {
      const input = 'CBC BLOOD TEST ANALYSIS REPORT — TOTAL RESULTS';
      expect(formatArabicForPdf(input)).toBe(input);
    });

    test('properly shapes and reorders Arabic text', () => {
      const result = formatArabicForPdf('المهرجان الصيفي');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // Contains shaped Presentation Forms glyphs (FE80..FEFC)
      expect(/[\uFB50-\uFEFC]/.test(result)).toBe(true);
    });

    test('handles parenthesized mixed text correctly', () => {
      const result = formatArabicForPdf('Haqayeq (حقائق)');
      expect(result).toContain('Haqayeq (');
      expect(result).toContain(')');
      expect(/[\uFB50-\uFEFC]/.test(result)).toBe(true);
    });

    test('resolves valid TrueType font paths that exist on disk', () => {
      const { regularFontPath, boldFontPath } = getPdfFontPaths();
      expect(fs.existsSync(regularFontPath)).toBe(true);
      expect(fs.existsSync(boldFontPath)).toBe(true);
    });
  });

  describe('ExportService.generateReportPdf', () => {
    const mockReportData: ExportReportData = {
      reportNumber: 'RC-TEST-01',
      title: 'تحليل فحص صورة الدم (CBC)',
      recipientName: 'الساده/ اللجنة المنظمة لسباق الهجن',
      sampleReceiptDate: new Date('2026-10-17T07:00:00Z'),
      generatedAt: new Date('2026-10-17T09:00:00Z'),
      ageCategory: 'حقائق',
      batchIdentifier: 'FL-25-0001 - FL-25-0010',
      totalSamples: 2,
      bothPositiveCount: 1,
      hgbThreshold: 14.0,
      hctThreshold: 32.0,
      samples: [
        {
          sampleCode: 'FL-25-0001',
          hgbValue: 14.5,
          hgbStatus: 'POSITIVE',
          hctValue: 33.0,
          hctStatus: 'POSITIVE',
          bothPositive: true,
        },
        {
          sampleCode: 'FL-25-0002',
          hgbValue: 12.0,
          hgbStatus: 'NEGATIVE',
          hctValue: 28.0,
          hctStatus: 'NEGATIVE',
          bothPositive: false,
        },
      ],
    };

    test('generates valid Full Report PDF buffer with embedded Unicode font', async () => {
      const buffer = await ExportService.generateReportPdf(mockReportData, 'full');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Must be a valid PDF file (starts with %PDF-)
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    });

    test('generates valid Positive-Only Report PDF buffer', async () => {
      const buffer = await ExportService.generateReportPdf(mockReportData, 'positive');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    });

    test('generates valid Negative-Only Report PDF buffer', async () => {
      const buffer = await ExportService.generateReportPdf(mockReportData, 'negative');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    });

    test('generates valid Negative-Only Excel report buffer', async () => {
      const buffer = await ExportService.generateNegativeReportExcel(mockReportData);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
    });

    describe('Dataset RC-0005: 9 samples with F2619 edge case', () => {
      const nineSamplesData: ExportReportData = {
        reportNumber: 'RC-0005',
        title: 'تحليل فحص صورة الدم (CBC)',
        recipientName: 'الساده/ اللجنة المنظمة لسباق الهجن',
        sampleReceiptDate: new Date('2026-10-20T07:00:00Z'),
        generatedAt: new Date('2026-10-20T14:22:33Z'),
        ageCategory: 'حقائق',
        batchIdentifier: 'F2618 - F2626',
        totalSamples: 9,
        bothPositiveCount: 5,
        hgbThreshold: 14.0,
        hctThreshold: 32.0,
        samples: [
          { sampleCode: 'F2618', hgbValue: 14.3, hgbStatus: 'POSITIVE', hctValue: 32.0, hctStatus: 'POSITIVE', bothPositive: true },
          { sampleCode: 'F2619', hgbValue: 14.0, hgbStatus: 'POSITIVE', hctValue: 31.4, hctStatus: 'NEGATIVE', bothPositive: false },
          { sampleCode: 'F2620', hgbValue: 13.3, hgbStatus: 'NEGATIVE', hctValue: 30.5, hctStatus: 'NEGATIVE', bothPositive: false },
          { sampleCode: 'F2621', hgbValue: 13.5, hgbStatus: 'NEGATIVE', hctValue: 30.6, hctStatus: 'NEGATIVE', bothPositive: false },
          { sampleCode: 'F2622', hgbValue: 14.5, hgbStatus: 'POSITIVE', hctValue: 33.6, hctStatus: 'POSITIVE', bothPositive: true },
          { sampleCode: 'F2623', hgbValue: 14.6, hgbStatus: 'POSITIVE', hctValue: 33.3, hctStatus: 'POSITIVE', bothPositive: true },
          { sampleCode: 'F2624', hgbValue: 17.6, hgbStatus: 'POSITIVE', hctValue: 39.6, hctStatus: 'POSITIVE', bothPositive: true },
          { sampleCode: 'F2625', hgbValue: 12.6, hgbStatus: 'NEGATIVE', hctValue: 28.0, hctStatus: 'NEGATIVE', bothPositive: false },
          { sampleCode: 'F2626', hgbValue: 14.6, hgbStatus: 'POSITIVE', hctValue: 32.1, hctStatus: 'POSITIVE', bothPositive: true },
        ],
      };

      test('Positive PDF excludes F2619 (because HCT=31.4 < 32.0) and Negative PDF includes it', async () => {
        const PDFDocument = require('pdfkit');
        const textSpy = jest.spyOn(PDFDocument.prototype, 'text');

        // 1. Positive PDF
        const positivePdf = await ExportService.generateReportPdf(nineSamplesData, 'positive');
        expect(Buffer.isBuffer(positivePdf)).toBe(true);
        expect(positivePdf.subarray(0, 5).toString()).toBe('%PDF-');

        const positiveCalls = textSpy.mock.calls.map((c) => String(c[0]));
        expect(positiveCalls).toContain('F2618');
        expect(positiveCalls).toContain('F2622');
        expect(positiveCalls).toContain('F2623');
        expect(positiveCalls).toContain('F2624');
        expect(positiveCalls).toContain('F2626');
        expect(positiveCalls).not.toContain('F2619'); // Excluded because HCT 31.4 < 32.0!

        textSpy.mockClear();

        // 2. Negative PDF
        const negativePdf = await ExportService.generateReportPdf(nineSamplesData, 'negative');
        expect(Buffer.isBuffer(negativePdf)).toBe(true);
        expect(negativePdf.subarray(0, 5).toString()).toBe('%PDF-');

        const negativeCalls = textSpy.mock.calls.map((c) => String(c[0]));
        expect(negativeCalls).toContain('F2619'); // Included in Negative because HCT 31.4 < 32.0!
        expect(negativeCalls).toContain('F2620');
        expect(negativeCalls).toContain('F2621');
        expect(negativeCalls).toContain('F2625');
        expect(negativeCalls).not.toContain('F2618');

        textSpy.mockClear();

        // 3. Full PDF
        const fullPdf = await ExportService.generateReportPdf(nineSamplesData, 'full');
        expect(Buffer.isBuffer(fullPdf)).toBe(true);
        expect(fullPdf.subarray(0, 5).toString()).toBe('%PDF-');

        const fullCalls = textSpy.mock.calls.map((c) => String(c[0]));
        expect(fullCalls).toContain('F2618');
        expect(fullCalls).toContain('F2619');
        expect(fullCalls).toContain('F2626');

        textSpy.mockRestore();
      });

      test('Positive Excel contains 6 samples with column-wise filtering (including F2619 with HGB=14.0 and blank HCT)', async () => {
        const buffer = await ExportService.generatePositiveReportExcel(nineSamplesData);
        const ExcelJS = require('exceljs');
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const sheet = wb.getWorksheet('Positive Samples');
        expect(sheet).toBeDefined();

        const rowCount = sheet.rowCount - 8;
        expect(rowCount).toBe(6);

        const sampleCodes: string[] = [];
        for (let i = 1; i <= rowCount; i++) {
          sampleCodes.push(sheet.getRow(8 + i).getCell(2).value);
        }
        expect(sampleCodes).toEqual(['F2618', 'F2619', 'F2622', 'F2623', 'F2624', 'F2626']);
        expect(sampleCodes).toContain('F2619');

        // Verify F2619 has HGB = 14.0 and empty HCT
        const rowF2619 = sheet.getRow(10);
        expect(rowF2619.getCell(2).value).toBe('F2619');
        expect(rowF2619.getCell(3).value).toBe(14.0);
        expect(rowF2619.getCell(4).value).toBe('');
      });

      test('Negative Excel contains 4 samples with column-wise filtering (including F2619 with blank HGB and HCT=31.4)', async () => {
        const buffer = await ExportService.generateNegativeReportExcel(nineSamplesData);
        const ExcelJS = require('exceljs');
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const sheet = wb.getWorksheet('Negative Samples');
        expect(sheet).toBeDefined();

        const rowCount = sheet.rowCount - 8;
        expect(rowCount).toBe(4);

        const sampleCodes: string[] = [];
        for (let i = 1; i <= rowCount; i++) {
          sampleCodes.push(sheet.getRow(8 + i).getCell(2).value);
        }
        expect(sampleCodes).toEqual(['F2619', 'F2620', 'F2621', 'F2625']);
        expect(sampleCodes).toContain('F2619');

        // Verify F2619 has empty HGB and HCT = 31.4
        const rowF2619 = sheet.getRow(9);
        expect(rowF2619.getCell(2).value).toBe('F2619');
        expect(rowF2619.getCell(3).value).toBe('');
        expect(rowF2619.getCell(4).value).toBe(31.4);
      });
    });
  });
});
