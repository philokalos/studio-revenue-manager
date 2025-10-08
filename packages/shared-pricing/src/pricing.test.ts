import { describe, it, expect } from 'vitest';
import { computeQuote } from './pricing';
import { QuoteInput, DiscountType } from './types';

describe('Pricing Engine - computeQuote', () => {
  /**
   * R1: 19:00-21:00 4인 예약 = 70,000원
   * - 19:00-20:00 (2슬롯): DAY 4인 9,000원 × 2 = 18,000원
   * - 20:00-21:00 (2슬롯): NIGHT 4인 14,000원 × 2 = 28,000원
   * - 총합: 18,000 + 28,000 = 46,000원
   */
  it('R1: 19:00-21:00 4인 = 46,000원 (시간대 경계)', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T19:00:00+09:00'),
      endTime: new Date('2024-01-15T21:00:00+09:00'),
      initialHeadcount: 4,
    };

    const result = computeQuote(input);

    expect(result.totalMinutes).toBe(120);
    expect(result.subtotal).toBe(46000);
    expect(result.total).toBe(46000);
    expect(result.details).toHaveLength(2);
  });

  /**
   * R2: 22:00-02:00 (익일) 3인 예약 = 96,000원
   * - 22:00-02:00 (8슬롯): NIGHT 3인 12,000원 × 8 = 96,000원
   */
  it('R2: 22:00-02:00 3인 = 96,000원 (야간 전체)', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T22:00:00+09:00'),
      endTime: new Date('2024-01-16T02:00:00+09:00'),
      initialHeadcount: 3,
    };

    const result = computeQuote(input);

    expect(result.totalMinutes).toBe(240);
    expect(result.subtotal).toBe(96000);
    expect(result.total).toBe(96000);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].band).toBe('NIGHT');
  });

  /**
   * R3: 10:00-12:00 2인 예약 = 28,000원
   * - 10:00-12:00 (4슬롯): DAY 2인 7,000원 × 4 = 28,000원
   */
  it('R3: 10:00-12:00 2인 = 28,000원 (주간 전체)', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T12:00:00+09:00'),
      initialHeadcount: 2,
    };

    const result = computeQuote(input);

    expect(result.totalMinutes).toBe(120);
    expect(result.subtotal).toBe(28000);
    expect(result.total).toBe(28000);
  });

  /**
   * R4: 10:00-15:00 인원 변경 예약
   * - 10:00-12:00 (4슬롯): DAY 3인 8,000원 × 4 = 32,000원
   * - 12:00-15:00 (6슬롯): DAY 5인 10,000원 × 6 = 60,000원
   * - 총합: 92,000원
   */
  it('R4: 10:00-15:00 인원 변경 (3→5인) = 92,000원', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T15:00:00+09:00'),
      initialHeadcount: 3,
      headcountChanges: [
        {
          time: new Date('2024-01-15T12:00:00+09:00'),
          newHeadcount: 5,
        },
      ],
    };

    const result = computeQuote(input);

    expect(result.totalMinutes).toBe(300);
    expect(result.subtotal).toBe(92000);
    expect(result.total).toBe(92000);
    expect(result.details).toHaveLength(2);
  });

  /**
   * D1: 비율 할인 10%
   * - 10:00-15:00 5인: 10,000원 × 10슬롯 = 100,000원
   * - 10% 할인: 10,000원
   * - 최종: 90,000원
   */
  it('D1: 비율 할인 10% = 90,000원', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T15:00:00+09:00'),
      initialHeadcount: 5,
      discount: {
        type: DiscountType.PERCENTAGE,
        value: 10,
      },
    };

    const result = computeQuote(input);

    expect(result.subtotal).toBe(100000);
    expect(result.discountAmount).toBe(10000);
    expect(result.total).toBe(90000);
  });

  /**
   * D2: 고정 금액 할인 15,000원
   * - 10:00-15:00 5인: 10,000원 × 10슬롯 = 100,000원
   * - 15,000원 할인
   * - 최종: 85,000원
   */
  it('D2: 고정 금액 할인 15,000원 = 85,000원', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T15:00:00+09:00'),
      initialHeadcount: 5,
      discount: {
        type: DiscountType.FIXED,
        value: 15000,
      },
    };

    const result = computeQuote(input);

    expect(result.subtotal).toBe(100000);
    expect(result.discountAmount).toBe(15000);
    expect(result.total).toBe(85000);
  });

  /**
   * E1: 최소 예약 시간 위반 (2시간 미만)
   */
  it('E1: 최소 예약 시간 위반 → 에러', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T11:00:00+09:00'),
      initialHeadcount: 2,
    };

    expect(() => computeQuote(input)).toThrow('Minimum reservation time');
  });

  /**
   * E2: 종료 시각이 시작 시각보다 이전
   */
  it('E2: 시작/종료 시각 역전 → 에러', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T15:00:00+09:00'),
      endTime: new Date('2024-01-15T10:00:00+09:00'),
      initialHeadcount: 2,
    };

    expect(() => computeQuote(input)).toThrow('Start time must be before end time');
  });

  /**
   * E3: 인원수 범위 초과
   */
  it('E3: 인원수 범위 초과 → 에러', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T12:00:00+09:00'),
      initialHeadcount: 11,
    };

    expect(() => computeQuote(input)).toThrow();
  });

  /**
   * E4: 할인율 범위 초과 (>100%)
   */
  it('E4: 할인율 범위 초과 → 에러', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T12:00:00+09:00'),
      initialHeadcount: 2,
      discount: {
        type: DiscountType.PERCENTAGE,
        value: 150,
      },
    };

    expect(() => computeQuote(input)).toThrow('Percentage discount must be between 0 and 100');
  });

  /**
   * 정수 계산 검증 (소수점 없음)
   */
  it('정수 계산 검증 (소수점 없음)', () => {
    const input: QuoteInput = {
      startTime: new Date('2024-01-15T10:00:00+09:00'),
      endTime: new Date('2024-01-15T12:00:00+09:00'),
      initialHeadcount: 2,
      discount: {
        type: DiscountType.PERCENTAGE,
        value: 33.33,
      },
    };

    const result = computeQuote(input);

    expect(Number.isInteger(result.subtotal)).toBe(true);
    expect(Number.isInteger(result.discountAmount)).toBe(true);
    expect(Number.isInteger(result.total)).toBe(true);
  });
});
