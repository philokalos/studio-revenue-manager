import { isAfter, isBefore, differenceInMinutes } from 'date-fns';
import { QuoteInput, MIN_RESERVATION_MINUTES, QuoteInputSchema } from './types';
import { validateDiscount } from './discount';

/**
 * 견적 요청 입력 검증
 */
export function validateQuoteInput(input: QuoteInput): void {
  // 1. Zod 스키마 검증
  const result = QuoteInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid input: ${result.error.message}`);
  }

  // 2. 시간 검증
  if (!isBefore(input.startTime, input.endTime)) {
    throw new Error('Start time must be before end time');
  }

  // 3. 최소 예약 시간 검증 (2시간)
  const duration = differenceInMinutes(input.endTime, input.startTime);
  if (duration < MIN_RESERVATION_MINUTES) {
    throw new Error(
      `Minimum reservation time is ${MIN_RESERVATION_MINUTES} minutes (${MIN_RESERVATION_MINUTES / 60} hours)`
    );
  }

  // 4. 인원 변경 검증
  if (input.headcountChanges) {
    for (const change of input.headcountChanges) {
      // 변경 시각이 예약 시간 내에 있는지
      if (
        !isAfter(change.time, input.startTime) ||
        !isBefore(change.time, input.endTime)
      ) {
        throw new Error('Headcount change time must be within reservation time');
      }

      // 인원수 유효성
      if (change.newHeadcount < 1 || change.newHeadcount > 10) {
        throw new Error('Headcount must be between 1 and 10');
      }
    }

    // 중복 시각 검증
    const times = input.headcountChanges.map((c) => c.time.getTime());
    const uniqueTimes = new Set(times);
    if (times.length !== uniqueTimes.size) {
      throw new Error('Duplicate headcount change times are not allowed');
    }
  }

  // 5. 할인 검증
  if (input.discount) {
    validateDiscount(input.discount);
  }

  // 6. 초기 인원수 검증
  if (input.initialHeadcount < 1 || input.initialHeadcount > 10) {
    throw new Error('Initial headcount must be between 1 and 10');
  }
}
