import { addMinutes, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { TimeBand, TimeSlot, SLOT_DURATION_MINUTES } from './types';

/**
 * 주어진 시각이 어느 시간대에 속하는지 판단
 * DAY: 08:00-22:00
 * NIGHT: 22:00-08:00
 */
export function getTimeBand(date: Date): TimeBand {
  const hours = date.getHours();
  return hours >= 8 && hours < 22 ? TimeBand.DAY : TimeBand.NIGHT;
}

/**
 * 시간대가 바뀌는 경계 시각 찾기
 * @param start 시작 시각
 * @param end 종료 시각
 * @returns 경계 시각 배열 (DAY→NIGHT: 22:00, NIGHT→DAY: 08:00)
 */
export function findTimeBandBoundaries(start: Date, end: Date): Date[] {
  const boundaries: Date[] = [];
  let current = new Date(start);

  while (isBefore(current, end)) {
    const nextBoundary = getNextBoundary(current);
    if (isBefore(nextBoundary, end)) {
      boundaries.push(nextBoundary);
    }
    current = nextBoundary;
  }

  return boundaries;
}

/**
 * 다음 시간대 경계 시각 계산
 * 현재 DAY → 22:00 반환
 * 현재 NIGHT → 08:00 반환
 */
function getNextBoundary(date: Date): Date {
  const hours = date.getHours();
  const boundary = new Date(date);
  boundary.setMinutes(0);
  boundary.setSeconds(0);
  boundary.setMilliseconds(0);

  if (hours >= 8 && hours < 22) {
    // DAY → NIGHT (22:00)
    boundary.setHours(22);
    if (isBefore(boundary, date) || boundary.getTime() === date.getTime()) {
      boundary.setDate(boundary.getDate() + 1);
    }
  } else {
    // NIGHT → DAY (08:00)
    boundary.setHours(8);
    if (isBefore(boundary, date) || boundary.getTime() === date.getTime()) {
      boundary.setDate(boundary.getDate() + 1);
    }
  }

  return boundary;
}

/**
 * 예약 시간을 30분 슬롯으로 분할
 * @param start 예약 시작 시각
 * @param end 예약 종료 시각
 * @param initialHeadcount 초기 인원수
 * @param headcountChanges 인원 변경 내역
 */
export function segmentReservation(
  start: Date,
  end: Date,
  initialHeadcount: number,
  headcountChanges?: Array<{ time: Date; newHeadcount: number }>
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let currentTime = new Date(start);
  let currentHeadcount = initialHeadcount;

  // 인원 변경 내역을 시간순 정렬
  const sortedChanges = headcountChanges
    ? [...headcountChanges].sort((a, b) => a.time.getTime() - b.time.getTime())
    : [];

  let changeIndex = 0;

  while (isBefore(currentTime, end)) {
    const slotEnd = addMinutes(currentTime, SLOT_DURATION_MINUTES);
    const actualEnd = isAfter(slotEnd, end) ? end : slotEnd;

    // 슬롯 시작 전에 인원 변경이 있는지 확인
    while (
      changeIndex < sortedChanges.length &&
      !isAfter(sortedChanges[changeIndex].time, currentTime) &&
      isBefore(sortedChanges[changeIndex].time, actualEnd)
    ) {
      currentHeadcount = sortedChanges[changeIndex].newHeadcount;
      changeIndex++;
    }

    slots.push({
      start: currentTime,
      end: actualEnd,
      band: getTimeBand(currentTime),
      headcount: currentHeadcount,
    });

    currentTime = actualEnd;
  }

  return slots;
}

/**
 * 슬롯 그룹화 (동일한 시간대 + 인원수)
 */
export function groupSlots(
  slots: TimeSlot[]
): Array<{ band: TimeBand; headcount: number; slotCount: number }> {
  const groups = new Map<string, { band: TimeBand; headcount: number; slotCount: number }>();

  for (const slot of slots) {
    const key = `${slot.band}-${slot.headcount}`;
    const existing = groups.get(key);

    if (existing) {
      existing.slotCount++;
    } else {
      groups.set(key, {
        band: slot.band,
        headcount: slot.headcount,
        slotCount: 1,
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * 총 예약 시간 계산 (분)
 */
export function calculateTotalMinutes(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}
