import ExcelJS from 'exceljs';
import { ExportService, ExportReportData } from '../../src/services/export.service';
import { ReportService } from '../../src/services/report.service';
import prisma from '../../src/lib/db/prisma';

const cellVal = (cell: ExcelJS.Cell) => {
  if (cell.result !== undefined) return cell.result;
  if (typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
    return (cell.value as any).result !== undefined ? (cell.value as any).result : '';
  }
  return cell.value;
};

describe('Excel Export — 3 Worksheets Functionality', () => {
  const mixedReportData: ExportReportData = {
    reportNumber: 'RC-0005',
    title: 'تحليل فحص صورة الدم (CBC)',
    recipientName: 'الساده/ اللجنة المنظمة لسباق الهجن',
    sampleReceiptDate: new Date('2026-10-17T07:00:00Z'),
    generatedAt: new Date('2026-10-17T09:00:00Z'),
    ageCategory: 'حقائق',
    batchIdentifier: 'FL-25-0001 - FL-25-0009',
    totalSamples: 9,
    bothPositiveCount: 5,
    hgbThreshold: 14.0,
    hctThreshold: 32.0,
    samples: [
      { sampleCode: 'F2618', hgbValue: 14.3, hgbStatus: 'POSITIVE', hctValue: 32.0, hctStatus: 'POSITIVE', bothPositive: true },
      { sampleCode: 'F2619', hgbValue: 14.0, hgbStatus: 'POSITIVE', hctValue: 31.4, hctStatus: 'NEGATIVE', bothPositive: false }, // HGB Positive!
      { sampleCode: 'F2620', hgbValue: 13.3, hgbStatus: 'NEGATIVE', hctValue: 30.5, hctStatus: 'NEGATIVE', bothPositive: false },
      { sampleCode: 'F2621', hgbValue: 13.5, hgbStatus: 'NEGATIVE', hctValue: 30.6, hctStatus: 'NEGATIVE', bothPositive: false },
      { sampleCode: 'F2622', hgbValue: 14.5, hgbStatus: 'POSITIVE', hctValue: 33.6, hctStatus: 'POSITIVE', bothPositive: true },
      { sampleCode: 'F2623', hgbValue: 14.6, hgbStatus: 'POSITIVE', hctValue: 33.3, hctStatus: 'POSITIVE', bothPositive: true },
      { sampleCode: 'F2624', hgbValue: 17.6, hgbStatus: 'POSITIVE', hctValue: 39.6, hctStatus: 'POSITIVE', bothPositive: true },
      { sampleCode: 'F2625', hgbValue: 12.6, hgbStatus: 'NEGATIVE', hctValue: 28.0, hctStatus: 'NEGATIVE', bothPositive: false },
      { sampleCode: 'F2626', hgbValue: 14.6, hgbStatus: 'POSITIVE', hctValue: 32.1, hctStatus: 'POSITIVE', bothPositive: true },
    ],
  };

  test('generates ONE Excel workbook containing exactly three worksheets', async () => {
    const buffer = await ExportService.generateFullReportExcel(mixedReportData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.length).toBe(3);
    const sheetNames = workbook.worksheets.map((w) => w.name);
    expect(sheetNames).toEqual(['Full Report', 'Positive Samples', 'Negative Samples']);
  });

  describe('Worksheet 1: Full Report', () => {
    let workbook: ExcelJS.Workbook;
    let sheet: ExcelJS.Worksheet;

    beforeAll(async () => {
      const buffer = await ExportService.generateFullReportExcel(mixedReportData);
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      sheet = workbook.getWorksheet('Full Report')!;
    });

    test('has correct title and header metadata', () => {
      expect(sheet).toBeDefined();
      expect(sheet.getCell('A1').value).toBe('تحليل فحص صورة الدم (CBC) — FULL REPORT');

      // Row 2: Report No & Recipient
      expect(sheet.getCell('A2').value).toBe('Report No:');
      expect(sheet.getCell('B2').value).toBe('RC-0005');
      expect(sheet.getCell('D2').value).toBe('Recipient:');
      expect(sheet.getCell('E2').value).toBe('الساده/ اللجنة المنظمة لسباق الهجن');

      // Row 3: Receipt Date & Age Category
      expect(sheet.getCell('A3').value).toBe('Receipt Date:');
      expect(sheet.getCell('B3').value).toBe('17/10/2026');
      expect(sheet.getCell('D3').value).toBe('Age Category:');
      expect(sheet.getCell('E3').value).toBe('حقائق');

      // Row 4: Generated Date & Batch Identifier
      expect(sheet.getCell('A4').value).toBe('Generated Date:');
      expect(sheet.getCell('D4').value).toBe('Batch Identifier:');
      expect(sheet.getCell('E4').value).toBe('FL-25-0001 - FL-25-0009');

      // Row 5: Thresholds
      expect(sheet.getCell('A5').value).toBe('HGB Threshold:');
      expect(sheet.getCell('B5').value).toBe('>= 14 g/dL');
      expect(sheet.getCell('D5').value).toBe('HCT Threshold:');
      expect(sheet.getCell('E5').value).toBe('>= 32 %');

      // Row 6: Sample Counts
      expect(sheet.getCell('A6').value).toBe('Total Samples:');
      expect(sheet.getCell('B6').value).toBe(9);
      expect(sheet.getCell('D6').value).toBe('Both Positive Samples:');
      expect(sheet.getCell('E6').value).toBe(5);
      expect(sheet.getCell('F6').value).toBe('Displayed Samples:');
      expect(cellVal(sheet.getCell('G6'))).toBe(9);
      expect(sheet.getCell('G6').formula).toBe('SUBTOTAL(103,B9:B17)');
    });

    test('has table column headers on Row 8', () => {
      const headerValues = (sheet.getRow(8).values as string[]).slice(1);
      expect(headerValues).toEqual([
        'SN',
        'SAMPLE CODE',
        'HGB (g/dL)',
        'HGB STATUS',
        'HCT',
        'HCT STATUS',
        'BOTH POSITIVE',
      ]);
    });

    test('includes every sample belonging to the report with sequential SN from 1 and live formulas', () => {
      const dataRowCount = sheet.rowCount - 8;
      expect(dataRowCount).toBe(9);

      for (let i = 0; i < 9; i++) {
        const row = sheet.getRow(9 + i);
        const rNum = 9 + i;
        expect(row.getCell(1).value).toBe(i + 1); // Sequential SN
        expect(row.getCell(2).value).toBe(mixedReportData.samples[i].sampleCode);
        expect(row.getCell(3).value).toBe(mixedReportData.samples[i].hgbValue);
        expect(row.getCell(4).formula).toBe(`IF(C${rNum}>=14.0,"POSITIVE","NEGATIVE")`);
        expect(cellVal(row.getCell(4))).toBe(mixedReportData.samples[i].hgbStatus);
        expect(row.getCell(5).value).toBe(mixedReportData.samples[i].hctValue);
        expect(row.getCell(6).formula).toBe(`IF(E${rNum}>=32.0,"POSITIVE","NEGATIVE")`);
        expect(cellVal(row.getCell(6))).toBe(mixedReportData.samples[i].hctStatus);
        expect(row.getCell(7).formula).toBe(`IF(AND(D${rNum}="POSITIVE",F${rNum}="POSITIVE"),"YES","")`);
        expect(cellVal(row.getCell(7))).toBe(mixedReportData.samples[i].bothPositive ? 'YES' : '');
      }
    });

    test('has frozen view at row 8 and autoFilter', () => {
      expect(sheet.views?.[0]?.ySplit).toBe(8);
      expect(sheet.autoFilter).toBe('A8:G8');
    });
  });

  describe('Worksheet 2: Positive Samples', () => {
    let workbook: ExcelJS.Workbook;
    let sheet: ExcelJS.Worksheet;

    beforeAll(async () => {
      const buffer = await ExportService.generateFullReportExcel(mixedReportData);
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      sheet = workbook.getWorksheet('Positive Samples')!;
    });

    test('uses same report header structure and title', () => {
      expect(sheet.getCell('A1').value).toBe('تحليل فحص صورة الدم (CBC) — POSITIVE SAMPLES');
      expect(sheet.getCell('B2').value).toBe('RC-0005');
      expect(sheet.getCell('E2').value).toBe('الساده/ اللجنة المنظمة لسباق الهجن');
      expect(sheet.getCell('B6').value).toBe(9); // Preserves report total
      expect(sheet.getCell('E6').value).toBe(5); // Preserves both positive summary
      expect(cellVal(sheet.getCell('G6'))).toBe(5); // Displays 5 samples where BOTH parameters are positive
      expect(sheet.getCell('G6').formula).toBe('SUBTOTAL(103,B9:B13)');
    });

    test('includes ONLY samples where BOTH HGB and HCT are POSITIVE (F2619 excluded)', () => {
      const dataRowCount = sheet.rowCount - 8;
      expect(dataRowCount).toBe(5);

      const expectedCodes = ['F2618', 'F2622', 'F2623', 'F2624', 'F2626'];
      for (let i = 0; i < 5; i++) {
        const row = sheet.getRow(9 + i);
        expect(row.getCell(1).value).toBe(i + 1); // Sequential SN from 1
        expect(row.getCell(2).value).toBe(expectedCodes[i]);
      }

      // F2618 has both positive
      const rowF2618 = sheet.getRow(9);
      expect(rowF2618.getCell(2).value).toBe('F2618');
      expect(rowF2618.getCell(3).value).toBe(14.3);
      expect(cellVal(rowF2618.getCell(4))).toBe('POSITIVE');
      expect(rowF2618.getCell(5).value).toBe(32.0);
      expect(cellVal(rowF2618.getCell(6))).toBe('POSITIVE');
      expect(cellVal(rowF2618.getCell(7))).toBe('YES');
    });

    test('has table column headers matching Full Report', () => {
      const headerValues = (sheet.getRow(8).values as string[]).slice(1);
      expect(headerValues).toEqual([
        'SN',
        'SAMPLE CODE',
        'HGB (g/dL)',
        'HGB STATUS',
        'HCT',
        'HCT STATUS',
        'BOTH POSITIVE',
      ]);
    });
  });

  describe('Worksheet 3: Negative Samples', () => {
    let workbook: ExcelJS.Workbook;
    let sheet: ExcelJS.Worksheet;

    beforeAll(async () => {
      const buffer = await ExportService.generateFullReportExcel(mixedReportData);
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      sheet = workbook.getWorksheet('Negative Samples')!;
    });

    test('uses same report header structure and title', () => {
      expect(sheet.getCell('A1').value).toBe('تحليل فحص صورة الدم (CBC) — NEGATIVE SAMPLES');
      expect(sheet.getCell('B2').value).toBe('RC-0005');
      expect(sheet.getCell('B6').value).toBe(9); // Preserves report total
      expect(sheet.getCell('E6').value).toBe(5); // Preserves both positive summary
      expect(cellVal(sheet.getCell('G6'))).toBe(4); // 4 samples where at least one condition fails
      expect(sheet.getCell('G6').formula).toBe('SUBTOTAL(103,B9:B12)');
    });

    test('includes all samples where at least one condition is NEGATIVE (including F2619 with HGB=14.0, HCT=31.4)', () => {
      const dataRowCount = sheet.rowCount - 8;
      expect(dataRowCount).toBe(4);

      const expectedCodes = ['F2619', 'F2620', 'F2621', 'F2625'];
      for (let i = 0; i < 4; i++) {
        const row = sheet.getRow(9 + i);
        expect(row.getCell(1).value).toBe(i + 1);
        expect(row.getCell(2).value).toBe(expectedCodes[i]);
        expect(cellVal(row.getCell(7))).toBe('');
      }

      // Verify F2619 in Negative Samples has HGB = 14.0 (POSITIVE) and HCT = 31.4 (NEGATIVE) and BOTH POSITIVE is blank
      const rowF2619 = sheet.getRow(9);
      expect(rowF2619.getCell(2).value).toBe('F2619');
      expect(rowF2619.getCell(3).value).toBe(14.0);
      expect(cellVal(rowF2619.getCell(4))).toBe('POSITIVE');
      expect(rowF2619.getCell(5).value).toBe(31.4);
      expect(cellVal(rowF2619.getCell(6))).toBe('NEGATIVE');
      expect(cellVal(rowF2619.getCell(7))).toBe('');

      // Verify F2620 (both negative)
      const rowF2620 = sheet.getRow(10);
      expect(rowF2620.getCell(2).value).toBe('F2620');
      expect(rowF2620.getCell(3).value).toBe(13.3);
      expect(cellVal(rowF2620.getCell(4))).toBe('NEGATIVE');
      expect(rowF2620.getCell(5).value).toBe(30.5);
      expect(cellVal(rowF2620.getCell(6))).toBe('NEGATIVE');
      expect(cellVal(rowF2620.getCell(7))).toBe('');
    });

    test('has table column headers matching Full Report', () => {
      const headerValues = (sheet.getRow(8).values as string[]).slice(1);
      expect(headerValues).toEqual([
        'SN',
        'SAMPLE CODE',
        'HGB (g/dL)',
        'HGB STATUS',
        'HCT',
        'HCT STATUS',
        'BOTH POSITIVE',
      ]);
    });
  });

  describe('Edge Cases Handling', () => {
    test('handles 0 positive samples gracefully', async () => {
      const allNegData: ExportReportData = {
        ...mixedReportData,
        totalSamples: 2,
        bothPositiveCount: 0,
        samples: [
          { sampleCode: 'NEG1', hgbValue: 12.0, hgbStatus: 'NEGATIVE', hctValue: 28.0, hctStatus: 'NEGATIVE', bothPositive: false },
          { sampleCode: 'NEG2', hgbValue: 11.5, hgbStatus: 'NEGATIVE', hctValue: 27.0, hctStatus: 'NEGATIVE', bothPositive: false },
        ],
      };

      const buffer = await ExportService.generateFullReportExcel(allNegData);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const posSheet = workbook.getWorksheet('Positive Samples')!;
      expect(posSheet.rowCount).toBe(8); // Only header, 0 data rows
      expect(cellVal(posSheet.getCell('G6'))).toBe(0);

      const negSheet = workbook.getWorksheet('Negative Samples')!;
      expect(negSheet.rowCount - 8).toBe(2);
      expect(cellVal(negSheet.getCell('G6'))).toBe(2);
      expect(negSheet.getCell('G6').formula).toBe('SUBTOTAL(103,B9:B10)');
    });

    test('handles 0 negative samples gracefully', async () => {
      const allPosData: ExportReportData = {
        ...mixedReportData,
        totalSamples: 2,
        bothPositiveCount: 2,
        samples: [
          { sampleCode: 'POS1', hgbValue: 15.0, hgbStatus: 'POSITIVE', hctValue: 33.0, hctStatus: 'POSITIVE', bothPositive: true },
          { sampleCode: 'POS2', hgbValue: 15.5, hgbStatus: 'POSITIVE', hctValue: 34.0, hctStatus: 'POSITIVE', bothPositive: true },
        ],
      };

      const buffer = await ExportService.generateFullReportExcel(allPosData);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const posSheet = workbook.getWorksheet('Positive Samples')!;
      expect(posSheet.rowCount - 8).toBe(2);
      expect(cellVal(posSheet.getCell('G6'))).toBe(2);
      expect(posSheet.getCell('G6').formula).toBe('SUBTOTAL(103,B9:B10)');

      const negSheet = workbook.getWorksheet('Negative Samples')!;
      expect(negSheet.rowCount).toBe(8); // Only header, 0 data rows
      expect(cellVal(negSheet.getCell('G6'))).toBe(0);
    });

    test('handles empty report with 0 samples', async () => {
      const emptyData: ExportReportData = {
        ...mixedReportData,
        totalSamples: 0,
        bothPositiveCount: 0,
        samples: [],
      };

      const buffer = await ExportService.generateFullReportExcel(emptyData);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      expect(workbook.worksheets.length).toBe(3);
      expect(workbook.getWorksheet('Full Report')!.rowCount).toBe(8);
      expect(workbook.getWorksheet('Positive Samples')!.rowCount).toBe(8);
      expect(workbook.getWorksheet('Negative Samples')!.rowCount).toBe(8);
      expect(cellVal(workbook.getWorksheet('Full Report')!.getCell('G6'))).toBe(0);
      expect(cellVal(workbook.getWorksheet('Positive Samples')!.getCell('G6'))).toBe(0);
      expect(cellVal(workbook.getWorksheet('Negative Samples')!.getCell('G6'))).toBe(0);
    });
  });

  describe('Database Reports Export Validation', () => {
    afterAll(async () => {
      await prisma.$disconnect();
    });

    test('validates 3-sheet export for all reports in database (e.g. RC-0001 to RC-0005)', async () => {
      const reports = await prisma.report.findMany();
      expect(reports.length).toBeGreaterThan(0);

      for (const r of reports) {
        const fullReport = await ReportService.getReportById(r.id);
        expect(fullReport).not.toBeNull();
        if (!fullReport) continue;

        const buffer = await ExportService.generateFullReportExcel(fullReport as any);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const sheetNames = wb.worksheets.map((w) => w.name);
        expect(sheetNames).toEqual(['Full Report', 'Positive Samples', 'Negative Samples']);

        const fullSheet = wb.getWorksheet('Full Report')!;
        const posSheet = wb.getWorksheet('Positive Samples')!;
        const negSheet = wb.getWorksheet('Negative Samples')!;

        const fullRows = fullSheet.rowCount - 8;
        const posRows = posSheet.rowCount - 8;
        const negRows = negSheet.rowCount - 8;

        expect(fullRows).toBe(r.totalSamples);
        // Verify sequential SN numbering and column-wise positivity criteria
        for (let i = 1; i <= posRows; i++) {
          const row = posSheet.getRow(8 + i);
          expect(row.getCell(1).value).toBe(i);
          const isBothPositive = cellVal(row.getCell(4)) === 'POSITIVE' && cellVal(row.getCell(6)) === 'POSITIVE';
          expect(isBothPositive).toBe(true);
          expect(cellVal(row.getCell(7))).toBe('YES');
        }
        for (let i = 1; i <= negRows; i++) {
          const row = negSheet.getRow(8 + i);
          expect(row.getCell(1).value).toBe(i);
          const hasNegativeParam = cellVal(row.getCell(4)) === 'NEGATIVE' || cellVal(row.getCell(6)) === 'NEGATIVE';
          expect(hasNegativeParam).toBe(true);
          expect(cellVal(row.getCell(7))).toBe('');
        }
      }
    });
  });
});
