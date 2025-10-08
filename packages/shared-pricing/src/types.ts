import { z } from 'zod';

/**
 * 시간대 구분
 * DAY: 08:00-22:00
 * NIGHT: 22:00-08:00
 */
export enum TimeBand {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
}

/**
 * 할인 타입
 * PERCENTAGE: 비율 할인 (0-100%)
 * FIXED: 고정 금액 할인 (원)
 */
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

/**
 * 30분 시간 슬롯
 */
export interface TimeSlot {
  /** 시작 시각 (ISO 8601) */
  start: Date;
  /** 종료 시각 (ISO 8601) */
  end: Date;
  /** 시간대 (DAY/NIGHT) */
  band: TimeBand;
  /** 인원수 */
  headcount: number;
}

/**
 * 요금 규칙
 */
export interface PricingRule {
  /** 시간대 */
  band: TimeBand;
  /** 인원수 */
  headcount: number;
  /** 30분당 요금 (원) */
  pricePerSlot: number;
}

/**
 * 할인 정보
 */
export interface Discount {
  /** 할인 타입 */
  type: DiscountType;
  /** 할인 값 (PERCENTAGE: 0-100, FIXED: 금액) */
  value: number;
}

/**
 * 견적 요청 입력
 */
export interface QuoteInput {
  /** 예약 시작 시각 (ISO 8601) */
  startTime: Date;
  /** 예약 종료 시각 (ISO 8601) */
  endTime: Date;
  /** 초기 인원수 */
  initialHeadcount: number;
  /** 인원 변경 내역 (선택적) */
  headcountChanges?: Array<{
    /** 변경 시각 (ISO 8601) */
    time: Date;
    /** 변경 후 인원수 */
    newHeadcount: number;
  }>;
  /** 할인 정보 (선택적) */
  discount?: Discount;
  /** 채널별 요금 오버라이드 (선택적) */
  channelPricing?: PricingRule[];
}

/**
 * 요금 계산 결과 상세
 */
export interface PricingDetail {
  /** 시간대 */
  band: TimeBand;
  /** 슬롯 수 (30분 단위) */
  slotCount: number;
  /** 인원수 */
  headcount: number;
  /** 슬롯당 요금 (원) */
  pricePerSlot: number;
  /** 소계 (원) */
  subtotal: number;
}

/**
 * 견적 결과
 */
export interface QuoteResult {
  /** 예약 시작 시각 */
  startTime: Date;
  /** 예약 종료 시각 */
  endTime: Date;
  /** 총 시간 (분) */
  totalMinutes: number;
  /** 요금 계산 상세 */
  details: PricingDetail[];
  /** 할인 전 금액 (원) */
  subtotal: number;
  /** 할인 금액 (원) */
  discountAmount: number;
  /** 최종 금액 (원) */
  total: number;
  /** 적용된 할인 정보 */
  appliedDiscount?: Discount;
}

/**
 * 기본 요금표
 * 30분 슬롯 기준
 * - 시간당 요금: DAY 40,000원/시간 (3명 기준), NIGHT 25,000원/시간 (3명 기준)
 * - 30분당: DAY 20,000원, NIGHT 12,500원
 * - 추가 인원(4명 이상): +10,000원/명
 */
export const DEFAULT_PRICING: PricingRule[] = [
  // DAY (08:00-22:00) - 3명 기준 20,000원/30분 (40,000원/시간)
  { band: TimeBand.DAY, headcount: 1, pricePerSlot: 20000 },
  { band: TimeBand.DAY, headcount: 2, pricePerSlot: 20000 },
  { band: TimeBand.DAY, headcount: 3, pricePerSlot: 20000 },
  { band: TimeBand.DAY, headcount: 4, pricePerSlot: 20000 },
  { band: TimeBand.DAY, headcount: 5, pricePerSlot: 20000 },

  // NIGHT (22:00-08:00) - 3명 기준 12,500원/30분 (25,000원/시간)
  { band: TimeBand.NIGHT, headcount: 1, pricePerSlot: 12500 },
  { band: TimeBand.NIGHT, headcount: 2, pricePerSlot: 12500 },
  { band: TimeBand.NIGHT, headcount: 3, pricePerSlot: 12500 },
  { band: TimeBand.NIGHT, headcount: 4, pricePerSlot: 12500 },
  { band: TimeBand.NIGHT, headcount: 5, pricePerSlot: 12500 },
];

/**
 * 최소 예약 시간 (분)
 */
export const MIN_RESERVATION_MINUTES = 120;

/**
 * 슬롯 길이 (분)
 */
export const SLOT_DURATION_MINUTES = 30;

// Zod 스키마 정의
export const QuoteInputSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  initialHeadcount: z.number().int().min(1).max(10),
  headcountChanges: z
    .array(
      z.object({
        time: z.date(),
        newHeadcount: z.number().int().min(1).max(10),
      })
    )
    .optional(),
  discount: z
    .object({
      type: z.nativeEnum(DiscountType),
      value: z.number().min(0),
    })
    .optional(),
  channelPricing: z.array(z.any()).optional(),
});

export const DiscountSchema = z.object({
  type: z.nativeEnum(DiscountType),
  value: z.number().min(0),
});
