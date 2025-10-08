import {
  QuoteInput,
  QuoteResult,
  PricingRule,
  PricingDetail,
  DEFAULT_PRICING,
  TimeBand,
} from './types';
import { segmentReservation, groupSlots, calculateTotalMinutes } from './segmentation';
import { applyDiscount } from './discount';
import { validateQuoteInput } from './validation';

/**
 * 요금 계산 메인 함수
 */
export function computeQuote(input: QuoteInput): QuoteResult {
  // 1. 입력 검증
  validateQuoteInput(input);

  // 2. 요금표 결정 (채널별 오버라이드 또는 기본값)
  const pricingRules = input.channelPricing || DEFAULT_PRICING;

  // 3. 시간 슬롯 분할
  const slots = segmentReservation(
    input.startTime,
    input.endTime,
    input.initialHeadcount,
    input.headcountChanges
  );

  // 4. 슬롯 그룹화 (동일한 시간대 + 인원수)
  const groups = groupSlots(slots);

  // 5. 요금 계산
  const details: PricingDetail[] = groups.map((group) => {
    const rule = findPricingRule(pricingRules, group.band, group.headcount);
    const subtotal = rule.pricePerSlot * group.slotCount;

    return {
      band: group.band,
      slotCount: group.slotCount,
      headcount: group.headcount,
      pricePerSlot: rule.pricePerSlot,
      subtotal,
    };
  });

  // 6. 소계 계산
  const subtotal = details.reduce((sum, detail) => sum + detail.subtotal, 0);

  // 7. 할인 적용
  const { discountAmount, total } = applyDiscount(subtotal, input.discount);

  // 8. 총 시간 계산
  const totalMinutes = calculateTotalMinutes(input.startTime, input.endTime);

  return {
    startTime: input.startTime,
    endTime: input.endTime,
    totalMinutes,
    details,
    subtotal,
    discountAmount,
    total,
    appliedDiscount: input.discount,
  };
}

/**
 * 요금표에서 해당하는 규칙 찾기
 */
function findPricingRule(
  rules: PricingRule[],
  band: TimeBand,
  headcount: number
): PricingRule {
  const rule = rules.find((r) => r.band === band && r.headcount === headcount);

  if (!rule) {
    throw new Error(
      `Pricing rule not found for band=${band}, headcount=${headcount}`
    );
  }

  return rule;
}
