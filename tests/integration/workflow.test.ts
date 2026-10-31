import fs from 'fs';
import path from 'path';
import { ImportService } from '../../src/services/import.service';
import { ExportService } from '../../src/services/export.service';
import { AuthService } from '../../src/services/auth.service';
import { SessionService } from '../../src/lib/auth/session';
import prisma from '../../src/lib/db/prisma';

describe('End-to-End Core Workflow Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. Excel parsing, column autodetection, and preview calculation', async () => {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample_race.xlsx');
    const buffer = fs.readFileSync(fixturePath);

    const preview = await ImportService.parseAndPreview(
      buffer,
      'sample_race.xlsx',
      undefined,
      undefined,
      { hgbThreshold: 14.0, hctThreshold: 32.0 }
    );

    expect(preview.totalParsedRows).toBe(8);
    expect(preview.validRowCount).toBe(8);
    expect(preview.invalidRowCount).toBe(0);
    expect(preview.summary.bothPositiveCount).toBe(4);
    expect(preview.summary.positiveHgbCount).toBe(5); // 14.8, 14.0, 14.0, 15.5, 14.3
    expect(preview.summary.positiveHctCount).toBe(5); // 32.8, 32.0, 32.0, 36.2, 33.1

    // Verify boundary rows
    const row4 = preview.validRows.find((r) => r.sampleCode === 'FL-25-0104');
    expect(row4?.hgbStatus).toBe('NEGATIVE');
    expect(row4?.hctStatus).toBe('POSITIVE');
    expect(row4?.bothPositive).toBe(false);

    const row5 = preview.validRows.find((r) => r.sampleCode === 'FL-25-0105');
    expect(row5?.hgbStatus).toBe('POSITIVE');
    expect(row5?.hctStatus).toBe('NEGATIVE');
    expect(row5?.bothPositive).toBe(false);
  });

  test('2. Excel export generation (Full and Positive)', async () => {
    const mockReportData = {
      reportNumber: 'RC-TEST-01',
      title: 'تحليل فحص صورة الدم (CBC)',
      recipientName: 'اللجنة المنظمة لسباق الهجن',
      sampleReceiptDate: new Date(),
      generatedAt: new Date(),
      ageCategory: 'حقائق',
      batchIdentifier: 'FL-25-0101 - FL-25-0108',
      totalSamples: 8,
      bothPositiveCount: 4,
      hgbThreshold: 14.0,
      hctThreshold: 32.0,
      samples: [
        {
          sampleCode: 'FL-25-0101',
          hgbValue: 14.8,
          hgbStatus: 'POSITIVE' as const,
          hctValue: 32.8,
          hctStatus: 'POSITIVE' as const,
          bothPositive: true,
        },
        {
          sampleCode: 'FL-25-0102',
          hgbValue: 13.3,
          hgbStatus: 'NEGATIVE' as const,
          hctValue: 29.0,
          hctStatus: 'NEGATIVE' as const,
          bothPositive: false,
        },
      ],
    };

    const fullExcelBuffer = await ExportService.generateFullReportExcel(mockReportData as any);
    expect(fullExcelBuffer).toBeInstanceOf(Buffer);
    expect(fullExcelBuffer.length).toBeGreaterThan(1000);

    const posExcelBuffer = await ExportService.generatePositiveReportExcel(mockReportData as any);
    expect(posExcelBuffer).toBeInstanceOf(Buffer);
    expect(posExcelBuffer.length).toBeGreaterThan(1000);
  });

  test('3. Server-side PDF export generation', async () => {
    const mockReportData = {
      reportNumber: 'RC-TEST-02',
      title: 'تحليل فحص صورة الدم (CBC)',
      recipientName: 'اللجنة المنظمة لسباق الهجن',
      sampleReceiptDate: new Date(),
      generatedAt: new Date(),
      ageCategory: 'حقائق',
      batchIdentifier: 'FL-25-0001 - FL-25-0026',
      totalSamples: 2,
      bothPositiveCount: 1,
      hgbThreshold: 14.0,
      hctThreshold: 32.0,
      samples: [
        {
          sampleCode: 'FL-25-0001',
          hgbValue: 14.8,
          hgbStatus: 'POSITIVE' as const,
          hctValue: 32.8,
          hctStatus: 'POSITIVE' as const,
          bothPositive: true,
        },
        {
          sampleCode: 'FL-25-0002',
          hgbValue: 13.3,
          hgbStatus: 'NEGATIVE' as const,
          hctValue: 29.0,
          hctStatus: 'NEGATIVE' as const,
          bothPositive: false,
        },
      ],
    };

    const pdfBuffer = await ExportService.generateReportPdf(mockReportData as any, 'full');
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF magic bytes: %PDF-
    expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');

    const posPdfBuffer = await ExportService.generateReportPdf(mockReportData as any, 'positive');
    expect(posPdfBuffer).toBeInstanceOf(Buffer);
    expect(posPdfBuffer.length).toBeGreaterThan(1000);
    expect(posPdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  test('4. Admin authentication and JWT session token generation', async () => {
    const authResult = await AuthService.authenticateAdmin('admin', 'Admin@RaceSamples2026');
    expect(authResult.success).toBe(true);
    expect(authResult.token).toBeDefined();

    if (authResult.token) {
      const session = await SessionService.verifyToken(authResult.token);
      expect(session).not.toBeNull();
      expect(session?.username).toBe('admin');
    }

    const badResult = await AuthService.authenticateAdmin('admin', 'WrongPassword123!');
    expect(badResult.success).toBe(false);
  });

  test('5. Analyzer CSV parsing with 250+ columns, header autodetection, and preview calculation', async () => {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'analyzer_sample.csv');
    const buffer = fs.readFileSync(fixturePath);

    const preview = await ImportService.parseAndPreview(
      buffer,
      'analyzer_sample.csv',
      undefined,
      undefined,
      { hgbThreshold: 14.0, hctThreshold: 32.0 }
    );

    // Verify autodetection
    expect(preview.detectedColumns.sampleCode).toBe('Sample No.');
    expect(preview.detectedColumns.hgb).toBe('HGB(g/dL)');
    expect(preview.detectedColumns.hct).toBe('HCT(%)');

    // Verify counts
    expect(preview.totalParsedRows).toBe(9);
    expect(preview.validRowCount).toBe(9);
    expect(preview.invalidRowCount).toBe(0);
    expect(preview.summary.bothPositiveCount).toBe(5); // F2618, F2622, F2623, F2624, F2626
    expect(preview.summary.positiveHgbCount).toBe(6);  // F2618, F2619, F2622, F2623, F2624, F2626
    expect(preview.summary.positiveHctCount).toBe(5);  // F2618, F2622, F2623, F2624, F2626

    // Verify accurate decimal preservation and status
    const f2618 = preview.validRows.find((r) => r.sampleCode === 'F2618');
    expect(f2618).toBeDefined();
    expect(f2618?.hgbValue).toBe(14.3);
    expect(f2618?.hctValue).toBe(32);
    expect(f2618?.hgbStatus).toBe('POSITIVE');
    expect(f2618?.hctStatus).toBe('POSITIVE');
    expect(f2618?.bothPositive).toBe(true);

    const f2619 = preview.validRows.find((r) => r.sampleCode === 'F2619');
    expect(f2619).toBeDefined();
    expect(f2619?.hgbValue).toBe(14);
    expect(f2619?.hctValue).toBe(31.4);
    expect(f2619?.hgbStatus).toBe('POSITIVE');
    expect(f2619?.hctStatus).toBe('NEGATIVE');
    expect(f2619?.bothPositive).toBe(false);

    const f2620 = preview.validRows.find((r) => r.sampleCode === 'F2620');
    expect(f2620).toBeDefined();
    expect(f2620?.hgbValue).toBe(13.3);
    expect(f2620?.hctValue).toBe(30.5);
    expect(f2620?.hgbStatus).toBe('NEGATIVE');
    expect(f2620?.hctStatus).toBe('NEGATIVE');
    expect(f2620?.bothPositive).toBe(false);
  });

  test('6. Validation throws error if a required column is missing', async () => {
    const invalidCsv = 'Notice row,,,,,\nNickname,Date,Sample No.,WBC,HGB(g/dL)\nSysmex,18/10,F100,12.5,14.5\n';
    const buffer = Buffer.from(invalidCsv);

    await expect(
      ImportService.parseAndPreview(buffer, 'missing_hct.csv')
    ).rejects.toThrow(/Required column\(s\) missing from file:.*HCT\(%\)/);
  });

  test('7. Validation throws error on duplicate column mappings', async () => {
    const csvContent = 'Notice,,,,,\nSample No.,HGB(g/dL),HCT(%)\nF100,14.5,32.0\n';
    const buffer = Buffer.from(csvContent);

    await expect(
      ImportService.parseAndPreview(
        buffer,
        'duplicate_map.csv',
        undefined,
        { sampleCode: 'Sample No.', hgb: 'Sample No.', hct: 'HCT(%)' }
      )
    ).rejects.toThrow(/Duplicate column mapping/);
  });

  test('8. Valid .xls file parsing and preview', async () => {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample_race.xls');
    const buffer = fs.readFileSync(fixturePath);

    const preview = await ImportService.parseAndPreview(
      buffer,
      'sample_race.xls',
      undefined,
      undefined,
      { hgbThreshold: 14.0, hctThreshold: 32.0 }
    );

    expect(preview.validRowCount).toBe(2);
    expect(preview.validRows[0].sampleCode).toBe('F3001');
    expect(preview.validRows[0].hgbValue).toBe(14.5);
    expect(preview.validRows[0].hctValue).toBe(33.2);
    expect(preview.validRows[0].bothPositive).toBe(true);
  });

  test('9. Validation throws error on completely empty file or malformed CSV', async () => {
    const emptyBuf = Buffer.from('');
    await expect(
      ImportService.parseAndPreview(emptyBuf, 'empty.csv')
    ).rejects.toThrow(/completely empty/i);

    const malformedCsv = 'Sample No.,HGB(g/dL),HCT(%)\n"unclosed quote,14.5,32.0\n';
    await expect(
      ImportService.parseAndPreview(Buffer.from(malformedCsv), 'malformed.csv')
    ).rejects.toThrow(/CSV Parsing error/i);
  });
});
