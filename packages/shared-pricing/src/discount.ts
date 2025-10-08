import { Discount, DiscountType } from './types';

/**
 * 할인 적용
 * @param subtotal 할인 전 금액
 * @param discount 할인 정보
 * @returns { discountAmount, total }
 */
export function applyDiscount(
  subtotal: number,
  discount?: Discount
): { discountAmount: number; total: number } {
  if (!discount) {
    return { discountAmount: 0, total: subtotal };
  }

  let discountAmount = 0;

  if (discount.type === DiscountType.PERCENTAGE) {
    // 비율 할인 (0-100%)
    if (discount.value < 0 || discount.value > 100) {
      throw new Error('Percentage discount must be between 0 and 100');
    }
    discountAmount = Math.floor((subtotal * discount.value) / 100);
  } else if (discount.type === DiscountType.FIXED) {
    // 고정 금액 할인
    if (discount.value < 0) {
      throw new Error('Fixed discount amount must be non-negative');
    }
    discountAmount = Math.min(discount.value, subtotal);
  }

  const total = subtotal - discountAmount;

  return {
    discountAmount: Math.floor(discountAmount),
    total: Math.floor(total),
  };
}

/**
 * 할인 검증
 */
export function validateDiscount(discount: Discount): void {
  if (discount.type === DiscountType.PERCENTAGE) {
    if (discount.value < 0 || discount.value > 100) {
      throw new Error('Percentage discount must be between 0 and 100');
    }
  } else if (discount.type === DiscountType.FIXED) {
    if (discount.value < 0) {
      throw new Error('Fixed discount amount must be non-negative');
    }
  } else {
    throw new Error(`Invalid discount type: ${discount.type}`);
  }
}
