import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { PositivityStatus } from '@/types';
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
   * Generates a styled Excel workbook for the Full Report (7 columns)
   */
  public static async generateFullReportExcel(data: ExportReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RACE SAMPLES';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('CBC Full Report', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      views: [{ state: 'frozen', ySplit: 8 }],
    });

    // Title & Metadata Rows
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${data.title || 'تحليل فحص صورة الدم (CBC)'} — FULL REPORT`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF173B65' }, // Primary Navy
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // Report Information Block
    sheet.addRow(['Report No:', data.reportNumber, '', 'Recipient:', data.recipientName, '', '']);
    sheet.addRow([
      'Receipt Date:',
      new Date(data.sampleReceiptDate).toLocaleDateString('en-GB'),
      '',
      'Age Category:',
      data.ageCategory || 'حقائق',
      '',
      '',
    ]);
    sheet.addRow([
      'Generated Date:',
      new Date(data.generatedAt).toLocaleString('en-GB'),
      '',
      'Batch Identifier:',
      data.batchIdentifier || 'N/A',
      '',
      '',
    ]);
    sheet.addRow([
      'HGB Threshold:',
      `>= ${data.hgbThreshold} g/dL`,
      '',
      'HCT Threshold:',
      `>= ${data.hctThreshold} %`,
      '',
      '',
    ]);
    sheet.addRow([
      'Total Samples:',
      data.totalSamples,
      '',
      'Both Positive Samples:',
      data.bothPositiveCount,
      '',
      '',
    ]);

    // Format metadata block
    for (let r = 2; r <= 6; r++) {
      const row = sheet.getRow(r);
      row.getCell(1).font = { bold: true, color: { argb: 'FF173B65' } };
      row.getCell(4).font = { bold: true, color: { argb: 'FF173B65' } };
      row.getCell(2).font = { color: { argb: 'FF1F2937' } };
      row.getCell(5).font = { color: { argb: 'FF1F2937' } };
      if (r === 6) {
        // Red color for both positive count
        row.getCell(5).font = { bold: true, color: { argb: 'FFE53935' } };
      }
    }

    // Blank spacer row
    sheet.addRow([]);

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

    // Populate Sample Data Rows
    data.samples.forEach((sample, idx) => {
      const row = sheet.addRow([
        idx + 1,
        sample.sampleCode,
        sample.hgbValue,
        sample.hgbStatus,
        sample.hctValue,
        sample.hctStatus,
        sample.bothPositive ? 'YES' : '',
      ]);

      row.height = 20;

      // Base border & alignment
      row.eachCell((cell, colNum) => {
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

      // HGB Status color
      const hgbStatusCell = row.getCell(4);
      if (sample.hgbStatus === 'POSITIVE') {
        hgbStatusCell.font = { bold: true, color: { argb: 'FFE53935' } };
      } else {
        hgbStatusCell.font = { color: { argb: 'FF285783' } };
      }

      // HCT Status color
      const hctStatusCell = row.getCell(6);
      if (sample.hctStatus === 'POSITIVE') {
        hctStatusCell.font = { bold: true, color: { argb: 'FFE53935' } };
      } else {
        hctStatusCell.font = { color: { argb: 'FF285783' } };
      }

      // Both Positive color
      const bothCell = row.getCell(7);
      if (sample.bothPositive) {
        bothCell.font = { bold: true, color: { argb: 'FFE53935' } };
      }
    });

    // Auto-fit column widths
    sheet.columns = [
      { width: 8 },  // SN
      { width: 18 }, // SAMPLE CODE
      { width: 14 }, // HGB (g/dL)
      { width: 16 }, // HGB STATUS
      { width: 12 }, // HCT
      { width: 16 }, // HCT STATUS
      { width: 18 }, // BOTH POSITIVE
    ];

    sheet.autoFilter = 'A8:G8';

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

    // Positive samples only, sorted by sampleCode ascending
    const positiveSamples = data.samples
      .filter((s) => s.bothPositive)
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
      const row = sheet.addRow([
        idx + 1, // SN sequentially recalculated from 1
        sample.sampleCode,
        sample.hgbValue,
        sample.hctValue,
      ]);

      row.height = 20;

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          bottom: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          left: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          right: { style: 'thin', color: { argb: 'FFD9E0E8' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Measurements rendered in red text as shown in reference image 2!
      row.getCell(3).font = { bold: true, color: { argb: 'FFE53935' } };
      row.getCell(4).font = { bold: true, color: { argb: 'FFE53935' } };
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
   * Generates a genuine server-side PDF for Full Report or Positive-Only Report
   */
  public static async generateReportPdf(
    data: ExportReportData,
    type: 'full' | 'positive'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const isPositiveOnly = type === 'positive';
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

        const samplesToRender = isPositiveOnly
          ? data.samples
            .filter((s) => s.bothPositive)
            .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode))
          : data.samples;

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
          const metaBoxHeight = 85;
          doc
            .roundedRect(leftMargin, currentY, metaBoxWidth, metaBoxHeight, 8)
            .lineWidth(1)
            .strokeColor('#173B65')
            .stroke();

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
            { label: 'Positive Count:', val: String(data.bothPositiveCount), isRed: true },
          ];

          let metaY = currentY + 5;
          metaRows.forEach((item) => {
            doc.font('AppFont-Bold').fontSize(8).fillColor('#173B65');
            doc.text(item.label, leftMargin + 8, metaY);

            doc.font('AppFont-Bold').fontSize(8);
            doc.fillColor(item.isRed ? '#E53935' : '#1F2937');
            doc.text(item.val, leftMargin + 95, metaY);
            metaY += 13;
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
          const colWidths = isPositiveOnly
            ? [45, 210, 140, 140] // SN, SAMPLE CODE, HGB, HCT
            : [35, 120, 75, 80, 65, 80, 80]; // Full 7 columns

          const colHeaders = isPositiveOnly
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

            if (isPositiveOnly) {
              // Col 1: SN
              doc.font('AppFont').fontSize(8).fillColor('#1F2937');
              doc.text(String(globalIndex), cellX, rowY + 3.5, { width: colWidths[0], align: 'center' });
              cellX += colWidths[0];

              // Col 2: SAMPLE CODE
              doc.text(sample.sampleCode, cellX, rowY + 3.5, { width: colWidths[1], align: 'center' });
              cellX += colWidths[1];

              // Col 3: HGB (g/dL) in RED bold
              doc.font('AppFont-Bold').fontSize(8).fillColor('#E53935');
              doc.text(sample.hgbValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[2], align: 'center' });
              cellX += colWidths[2];

              // Col 4: HCT (%) in RED bold
              doc.text(sample.hctValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[3], align: 'center' });
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

              // Col 4: HGB STATUS (Red for POSITIVE, Slate for NEGATIVE)
              doc.font('AppFont-Bold').fontSize(8);
              doc.fillColor(sample.hgbStatus === 'POSITIVE' ? '#E53935' : '#285783');
              doc.text(sample.hgbStatus, cellX, rowY + 3.5, { width: colWidths[3], align: 'center' });
              cellX += colWidths[3];

              // Col 5: HCT
              doc.font('AppFont').fontSize(8).fillColor('#1F2937');
              doc.text(sample.hctValue.toFixed(1), cellX, rowY + 3.5, { width: colWidths[4], align: 'center' });
              cellX += colWidths[4];

              // Col 6: HCT STATUS (Red for POSITIVE, Slate for NEGATIVE)
              doc.font('AppFont-Bold').fontSize(8);
              doc.fillColor(sample.hctStatus === 'POSITIVE' ? '#E53935' : '#285783');
              doc.text(sample.hctStatus, cellX, rowY + 3.5, { width: colWidths[5], align: 'center' });
              cellX += colWidths[5];

              // Col 7: BOTH POSITIVE (YES in Red, or blank)
              if (sample.bothPositive) {
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
            doc.image(workspaceStamp, rightMargin - 75, footerY - 35, { width: 75, height: 35 });
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
