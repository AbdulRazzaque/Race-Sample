import { BothPositiveStatus, CalculationResult, PositivityStatus, ThresholdConfig } from '@/types';
import { DEFAULT_HGB_THRESHOLD, DEFAULT_HCT_THRESHOLD } from '@/constants';

/**
 * Compare two decimal numbers safely using 4-decimal-place integer scaling
 * to avoid IEEE 754 floating-point inaccuracies around threshold boundaries.
 */
function safeDecimalGte(value: number, threshold: number): boolean {
  const scaledValue = Math.round(value * 10000);
  const scaledThreshold = Math.round(threshold * 10000);
  return scaledValue >= scaledThreshold;
}

export class CalculationService {
  /**
   * Evaluates HGB against the threshold (default: 14.0 g/dL)
   * Rule: HGB >= threshold => POSITIVE; HGB < threshold => NEGATIVE
   */
  public static calculateHgbStatus(
    hgb: number,
    threshold: number = DEFAULT_HGB_THRESHOLD
  ): PositivityStatus {
    if (isNaN(hgb) || !isFinite(hgb)) {
      throw new Error(`Invalid HGB measurement: ${hgb}`);
    }
    return safeDecimalGte(hgb, threshold) ? 'POSITIVE' : 'NEGATIVE';
  }

  /**
   * Evaluates HCT against the threshold (default: 32.0%)
   * Rule: HCT >= threshold => POSITIVE; HCT < threshold => NEGATIVE
   */
  public static calculateHctStatus(
    hct: number,
    threshold: number = DEFAULT_HCT_THRESHOLD
  ): PositivityStatus {
    if (isNaN(hct) || !isFinite(hct)) {
      throw new Error(`Invalid HCT measurement: ${hct}`);
    }
    return safeDecimalGte(hct, threshold) ? 'POSITIVE' : 'NEGATIVE';
  }

  /**
   * Evaluates BOTH POSITIVE status
   * Rule: BOTH POSITIVE = YES if and only if HGB >= HGB_Threshold AND HCT >= HCT_Threshold.
   * Otherwise BOTH POSITIVE = NO.
   */
  public static calculateBothPositive(
    hgbStatus: PositivityStatus,
    hctStatus: PositivityStatus
  ): { bothPositive: boolean; display: BothPositiveStatus } {
    const isBoth = hgbStatus === 'POSITIVE' && hctStatus === 'POSITIVE';
    return {
      bothPositive: isBoth,
      display: isBoth ? 'YES' : 'NO',
    };
  }

  /**
   * Evaluates a full sample measurement with custom or default thresholds
   */
  public static evaluateSample(
    hgb: number,
    hct: number,
    thresholds: ThresholdConfig = {
      hgbThreshold: DEFAULT_HGB_THRESHOLD,
      hctThreshold: DEFAULT_HCT_THRESHOLD,
    }
  ): CalculationResult {
    const hgbStatus = this.calculateHgbStatus(hgb, thresholds.hgbThreshold);
    const hctStatus = this.calculateHctStatus(hct, thresholds.hctThreshold);
    const { bothPositive, display } = this.calculateBothPositive(hgbStatus, hctStatus);

    return {
      hgbValue: Number(hgb.toFixed(2)),
      hgbStatus,
      hctValue: Number(hct.toFixed(2)),
      hctStatus,
      bothPositive,
      bothPositiveDisplay: display,
    };
  }

  /**
   * Parse a raw input value into a valid number or null
   */
  public static parseNumericValue(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    if (typeof raw === 'number') {
      return isNaN(raw) || !isFinite(raw) ? null : raw;
    }
    if (typeof raw === 'string') {
      const cleaned = raw.trim().replace(/,/g, '');
      if (cleaned === '') return null;
      const num = Number(cleaned);
      return isNaN(num) || !isFinite(num) ? null : num;
    }
    return null;
  }
}
