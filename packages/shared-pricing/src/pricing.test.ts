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

  // ====================
  // Track 3: Edge Cases - Midnight Crossing
  // ====================

  describe('Midnight Crossing Tests', () => {
    it('23:00-01:00 (익일) 야간 요금 적용', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T23:00:00+09:00'),
        endTime: new Date('2024-01-16T01:00:00+09:00'),
        initialHeadcount: 4,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(120);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].band).toBe('NIGHT');
    });

    it('23:30-00:30 (익일) 30분 단위 정산', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T23:30:00+09:00'),
        endTime: new Date('2024-01-16T00:30:00+09:00'),
        initialHeadcount: 3,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(60);
    });

    it('23:45-02:15 (익일) 다양한 시간대', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T23:45:00+09:00'),
        endTime: new Date('2024-01-16T02:15:00+09:00'),
        initialHeadcount: 2,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(150);
    });
  });

  // ====================
  // Track 3: Multi-Day Reservations
  // ====================

  describe('Multi-Day Reservation Tests', () => {
    it('24시간 예약 (10:00 → 익일 10:00)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-16T10:00:00+09:00'),
        initialHeadcount: 3,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(1440); // 24 hours
      expect(result.details.length).toBeGreaterThan(1);
    });

    it('48시간 예약 (주말 대여)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-17T10:00:00+09:00'),
        initialHeadcount: 5,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(2880); // 48 hours
    });

    it('주간→야간→주간 연속 예약', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T15:00:00+09:00'),
        endTime: new Date('2024-01-16T12:00:00+09:00'),
        initialHeadcount: 4,
      };

      const result = computeQuote(input);

      expect(result.details.length).toBeGreaterThan(2);
      // Should have DAY, NIGHT, DAY segments
    });
  });

  // ====================
  // Track 3: Headcount Changes
  // ====================

  describe('Complex Headcount Changes', () => {
    it('3단계 인원 변경 (2→4→6→3)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T18:00:00+09:00'),
        initialHeadcount: 2,
        headcountChanges: [
          { time: new Date('2024-01-15T12:00:00+09:00'), newHeadcount: 4 },
          { time: new Date('2024-01-15T14:00:00+09:00'), newHeadcount: 6 },
          { time: new Date('2024-01-15T16:00:00+09:00'), newHeadcount: 3 },
        ],
      };

      const result = computeQuote(input);

      expect(result.details.length).toBeGreaterThan(3);
    });

    it('자정 넘어서 인원 변경', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T22:00:00+09:00'),
        endTime: new Date('2024-01-16T04:00:00+09:00'),
        initialHeadcount: 3,
        headcountChanges: [
          { time: new Date('2024-01-16T00:00:00+09:00'), newHeadcount: 5 },
          { time: new Date('2024-01-16T02:00:00+09:00'), newHeadcount: 2 },
        ],
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(360);
    });

    it('인원 증가 후 감소', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T16:00:00+09:00'),
        initialHeadcount: 3,
        headcountChanges: [
          { time: new Date('2024-01-15T12:00:00+09:00'), newHeadcount: 7 },
          { time: new Date('2024-01-15T14:00:00+09:00'), newHeadcount: 2 },
        ],
      };

      const result = computeQuote(input);

      expect(result.details.length).toBeGreaterThan(2);
    });
  });

  // ====================
  // Track 3: Discount Edge Cases
  // ====================

  describe('Discount Edge Cases', () => {
    it('100% 할인 (무료)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 3,
        discount: {
          type: DiscountType.PERCENTAGE,
          value: 100,
        },
      };

      const result = computeQuote(input);

      expect(result.total).toBe(0);
      expect(result.discountAmount).toBe(result.subtotal);
    });

    it('고정 할인이 총액보다 큰 경우', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 2,
        discount: {
          type: DiscountType.FIXED,
          value: 999999,
        },
      };

      const result = computeQuote(input);

      // Should cap at subtotal (no negative prices)
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('0% 할인 (할인 없음)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 3,
        discount: {
          type: DiscountType.PERCENTAGE,
          value: 0,
        },
      };

      const result = computeQuote(input);

      expect(result.discountAmount).toBe(0);
      expect(result.total).toBe(result.subtotal);
    });

    it('소수점 할인율 (7.5%)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T15:00:00+09:00'),
        initialHeadcount: 5,
        discount: {
          type: DiscountType.PERCENTAGE,
          value: 7.5,
        },
      };

      const result = computeQuote(input);

      expect(Number.isInteger(result.total)).toBe(true);
      expect(Number.isInteger(result.discountAmount)).toBe(true);
    });
  });

  // ====================
  // Track 3: Time Band Transitions
  // ====================

  describe('Time Band Transition Tests', () => {
    it('19:59-20:01 (1분 DAY, 1분 NIGHT)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T19:59:00+09:00'),
        endTime: new Date('2024-01-15T20:01:00+09:00'),
        initialHeadcount: 3,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(2);
    });

    it('19:30-20:30 (DAY-NIGHT 경계)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T19:30:00+09:00'),
        endTime: new Date('2024-01-15T20:30:00+09:00'),
        initialHeadcount: 4,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(60);
      expect(result.details.length).toBeGreaterThanOrEqual(1);
    });

    it('10:00-20:00 (전체 DAY)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T20:00:00+09:00'),
        initialHeadcount: 5,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(600); // 10 hours
      expect(result.details[0].band).toBe('DAY');
    });

    it('20:00-06:00 (전체 NIGHT)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T20:00:00+09:00'),
        endTime: new Date('2024-01-16T06:00:00+09:00'),
        initialHeadcount: 3,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(600); // 10 hours
      expect(result.details[0].band).toBe('NIGHT');
    });
  });

  // ====================
  // Track 3: Minimum/Maximum Validation
  // ====================

  describe('Boundary Validation Tests', () => {
    it('정확히 2시간 예약 (최소 시간)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 2,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(120);
      expect(() => computeQuote(input)).not.toThrow();
    });

    it('1시간 59분 예약 (최소 미달)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T11:59:00+09:00'),
        initialHeadcount: 2,
      };

      expect(() => computeQuote(input)).toThrow();
    });

    it('최소 인원 (1명)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 1,
      };

      const result = computeQuote(input);

      expect(result.subtotal).toBeGreaterThan(0);
    });

    it('최대 인원 (10명)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 10,
      };

      const result = computeQuote(input);

      expect(result.subtotal).toBeGreaterThan(0);
    });

    it('음수 인원 → 에러', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: -1,
      };

      expect(() => computeQuote(input)).toThrow();
    });

    it('0명 → 에러', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T12:00:00+09:00'),
        initialHeadcount: 0,
      };

      expect(() => computeQuote(input)).toThrow();
    });
  });

  // ====================
  // Track 3: Real-World Scenarios
  // ====================

  describe('Real-World Scenario Tests', () => {
    it('촬영 예약: 오전 9시-오후 6시 (9시간)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T09:00:00+09:00'),
        endTime: new Date('2024-01-15T18:00:00+09:00'),
        initialHeadcount: 6,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(540);
    });

    it('야간 촬영: 저녁 8시-새벽 4시 (8시간)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T20:00:00+09:00'),
        endTime: new Date('2024-01-16T04:00:00+09:00'),
        initialHeadcount: 4,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(480);
      expect(result.details[0].band).toBe('NIGHT');
    });

    it('주말 장기 대여: 금요일 저녁-일요일 저녁', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-19T18:00:00+09:00'),
        endTime: new Date('2024-01-21T18:00:00+09:00'),
        initialHeadcount: 5,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(2880); // 48 hours
    });

    it('단기 미팅: 정확히 2시간', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T14:00:00+09:00'),
        endTime: new Date('2024-01-15T16:00:00+09:00'),
        initialHeadcount: 3,
      };

      const result = computeQuote(input);

      expect(result.totalMinutes).toBe(120);
    });

    it('VIP 할인: 30% 할인 적용', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T18:00:00+09:00'),
        initialHeadcount: 8,
        discount: {
          type: DiscountType.PERCENTAGE,
          value: 30,
        },
      };

      const result = computeQuote(input);

      expect(result.discountAmount).toBe(Math.floor(result.subtotal * 0.3));
    });
  });

  // ====================
  // Track 3: Data Consistency
  // ====================

  describe('Data Consistency Tests', () => {
    it('동일한 입력 → 동일한 출력 (멱등성)', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T15:00:00+09:00'),
        initialHeadcount: 4,
      };

      const result1 = computeQuote(input);
      const result2 = computeQuote(input);

      expect(result1.total).toBe(result2.total);
      expect(result1.subtotal).toBe(result2.subtotal);
      expect(result1.discountAmount).toBe(result2.discountAmount);
    });

    it('details 합계 = subtotal', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T18:00:00+09:00'),
        endTime: new Date('2024-01-16T02:00:00+09:00'),
        initialHeadcount: 5,
        headcountChanges: [
          { time: new Date('2024-01-15T22:00:00+09:00'), newHeadcount: 3 },
        ],
      };

      const result = computeQuote(input);

      const detailsSum = result.details.reduce((sum, d) => sum + d.amount, 0);
      expect(detailsSum).toBe(result.subtotal);
    });

    it('총 시간 = details 시간 합계', () => {
      const input: QuoteInput = {
        startTime: new Date('2024-01-15T10:00:00+09:00'),
        endTime: new Date('2024-01-15T16:00:00+09:00'),
        initialHeadcount: 4,
      };

      const result = computeQuote(input);

      const detailsMinutes = result.details.reduce((sum, d) => sum + d.minutes, 0);
      expect(detailsMinutes).toBe(result.totalMinutes);
    });
  });
});
