export type PositivityStatus = 'POSITIVE' | 'NEGATIVE';
export type BothPositiveStatus = 'YES' | 'NO';

export interface ThresholdConfig {
  hgbThreshold: number; // default: 14.0
  hctThreshold: number; // default: 32.0
}

export interface CalculationResult {
  hgbValue: number;
  hgbStatus: PositivityStatus;
  hctValue: number;
  hctStatus: PositivityStatus;
  bothPositive: boolean;
  bothPositiveDisplay: BothPositiveStatus;
}

export interface ParsedRowData {
  rowIndex: number;
  sampleCode: string;
  hgbRaw: string | number;
  hctRaw: string | number;
  existingSn?: number | string;
  existingHgbStatus?: string;
  existingHctStatus?: string;
  existingBothPositive?: string;
}

export interface ValidatedRow extends CalculationResult {
  rowIndex: number;
  sampleCode: string;
  originalValues: {
    hgbRaw: string | number;
    hctRaw: string | number;
  };
}

export interface RowValidationError {
  rowIndex: number;
  columnName?: string;
  sampleCode?: string;
  errorCode: string;
  errorMessage: string;
  originalValue?: string;
}

export interface ImportPreviewResult {
  fileName: string;
  detectedWorksheet: string;
  availableWorksheets: string[];
  totalParsedRows: number;
  validRowCount: number;
  invalidRowCount: number;
  duplicateRowCount: number;
  detectedColumns: {
    sampleCode: string | null;
    hgb: string | null;
    hct: string | null;
    sn: string | null;
    hgbStatus: string | null;
    hctStatus: string | null;
    bothPositive: string | null;
  };
  headers: string[];
  validRows: ValidatedRow[];
  errors: RowValidationError[];
  summary: {
    totalSamples: number;
    positiveHgbCount: number;
    positiveHctCount: number;
    bothPositiveCount: number;
    neitherPositiveCount: number;
  };
  thresholdsUsed: ThresholdConfig;
}

export interface ReportSummary {
  id: string;
  reportNumber: string;
  title: string;
  recipientName: string;
  sampleReceiptDate: string;
  generatedAt: string;
  originalFileName: string;
  ageCategory: string | null;
  batchIdentifier: string | null;
  totalSamples: number;
  positiveHgbCount: number;
  positiveHctCount: number;
  bothPositiveCount: number;
  neitherPositiveCount: number;
  hgbThreshold: number;
  hctThreshold: number;
  status: string;
  createdAt: string;
}

export interface SampleItem {
  id: string;
  reportId: string;
  sampleCode: string;
  rowNumber: number;
  hgbValue: number;
  hgbStatus: PositivityStatus;
  hctValue: number;
  hctStatus: PositivityStatus;
  bothPositive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSamples: number;
  positiveHgb: number;
  positiveHct: number;
  bothPositive: number;
  neitherPositive: number;
  totalReports: number;
  recentReports: ReportSummary[];
  recentActivity: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    username: string | null;
  }[];
}
