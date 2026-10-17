import { CalculationService } from '../../src/services/calculation.service';

describe('CalculationService Business Rules & Threshold Boundaries', () => {
  const defaultThresholds = { hgbThreshold: 14.0, hctThreshold: 32.0 };

  test('Case 1: HGB 14.0, HCT 32.0 -> Both POSITIVE, BOTH POSITIVE = YES', () => {
    const result = CalculationService.evaluateSample(14.0, 32.0, defaultThresholds);
    expect(result.hgbStatus).toBe('POSITIVE');
    expect(result.hctStatus).toBe('POSITIVE');
    expect(result.bothPositive).toBe(true);
    expect(result.bothPositiveDisplay).toBe('YES');
  });

  test('Case 2: HGB 14.0, HCT 31.99 -> HGB POSITIVE, HCT NEGATIVE, BOTH POSITIVE = NO', () => {
    const result = CalculationService.evaluateSample(14.0, 31.99, defaultThresholds);
    expect(result.hgbStatus).toBe('POSITIVE');
    expect(result.hctStatus).toBe('NEGATIVE');
    expect(result.bothPositive).toBe(false);
    expect(result.bothPositiveDisplay).toBe('NO');
  });

  test('Case 3: HGB 13.99, HCT 32.0 -> HGB NEGATIVE, HCT POSITIVE, BOTH POSITIVE = NO', () => {
    const result = CalculationService.evaluateSample(13.99, 32.0, defaultThresholds);
    expect(result.hgbStatus).toBe('NEGATIVE');
    expect(result.hctStatus).toBe('POSITIVE');
    expect(result.bothPositive).toBe(false);
    expect(result.bothPositiveDisplay).toBe('NO');
  });

  test('Case 4: HGB 13.99, HCT 31.99 -> Both NEGATIVE, BOTH POSITIVE = NO', () => {
    const result = CalculationService.evaluateSample(13.99, 31.99, defaultThresholds);
    expect(result.hgbStatus).toBe('NEGATIVE');
    expect(result.hctStatus).toBe('NEGATIVE');
    expect(result.bothPositive).toBe(false);
    expect(result.bothPositiveDisplay).toBe('NO');
  });

  test('Case 5: HGB 15.3, HCT 34.4 -> Both POSITIVE, BOTH POSITIVE = YES', () => {
    const result = CalculationService.evaluateSample(15.3, 34.4, defaultThresholds);
    expect(result.hgbStatus).toBe('POSITIVE');
    expect(result.hctStatus).toBe('POSITIVE');
    expect(result.bothPositive).toBe(true);
    expect(result.bothPositiveDisplay).toBe('YES');
  });

  test('Case 6: Custom historical thresholds (e.g. HGB 15.0, HCT 35.0) are respected', () => {
    const customThresholds = { hgbThreshold: 15.0, hctThreshold: 35.0 };
    // 14.5 is below 15.0, 33.0 is below 35.0
    const result = CalculationService.evaluateSample(14.5, 33.0, customThresholds);
    expect(result.hgbStatus).toBe('NEGATIVE');
    expect(result.hctStatus).toBe('NEGATIVE');
    expect(result.bothPositive).toBe(false);

    // 15.0 and 35.0 are boundary positive
    const resultBoundary = CalculationService.evaluateSample(15.0, 35.0, customThresholds);
    expect(resultBoundary.hgbStatus).toBe('POSITIVE');
    expect(resultBoundary.hctStatus).toBe('POSITIVE');
    expect(resultBoundary.bothPositive).toBe(true);
  });

  test('Case 7: parseNumericValue correctly handles strings, numbers, blanks and invalid input', () => {
    expect(CalculationService.parseNumericValue(' 14.5 ')).toBe(14.5);
    expect(CalculationService.parseNumericValue('32')).toBe(32);
    expect(CalculationService.parseNumericValue(15.2)).toBe(15.2);
    expect(CalculationService.parseNumericValue('')).toBeNull();
    expect(CalculationService.parseNumericValue(null)).toBeNull();
    expect(CalculationService.parseNumericValue(undefined)).toBeNull();
    expect(CalculationService.parseNumericValue('INVALID')).toBeNull();
    expect(CalculationService.parseNumericValue('N/A')).toBeNull();
  });
});
