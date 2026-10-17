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
  });
});
