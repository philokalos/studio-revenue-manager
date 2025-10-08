# 💰 요금 엔진 공통 유틸 스펙 (TypeScript)

바이브코딩에 바로 적용할 수 있도록 요금 엔진 공통 유틸(클라/함수 공용) 코드 스펙을 정리했습니다.
(TypeScript 기준, 클라이언트(React/Vite)와 Functions에서 동일 모듈 사용)

---

## 1) 패키지 구조 제안

```
/packages/shared-pricing/
  src/
    index.ts
    pricing.ts
    segmentation.ts
    discount.ts
    validation.ts
    types.ts
    utils-time.ts
  test/
    pricing.spec.ts
    fixtures.ts
  package.json
  tsconfig.json
```

* **빌드 타깃**: ESM + CJS (Functions/웹 동시 호환)
* **타임존**: Asia/Seoul 고정 (date-fns, date-fns-tz 사용 권장, 의존성 최소화 가능)

---

## 2) 핵심 도메인 규칙 (요약)

* 주간(08:00–20:00): 40,000원/시간
* 야간(20:00–08:00): 20,000원/시간
* 기본 3인 포함, 4인부터 1인당 5,000원/시간 추가
* 최소 예약 2시간
* 경계(08/20)에서 단가 변경, 跨일(예: 22–02)은 전 구간 야간 단가
* 인원 변경 발생 시 변경 시점부터 추가요금 반영
* 할인은 금액 또는 비율 중 택1 (동시 불가), 로그는 별도
* 채널 차등 요금(예: Hourplace/SpaceCloud)을 지원 (기본값 없으면 default 요금 사용)
* 시간 계산 단위: 30분 슬라이스 권장(정확/단순성 균형)

---

## 3) 타입 정의 (types.ts)

```typescript
export type Channel = "default" | "hourplace" | "spacecloud";

export interface PricingRule {
  channel: Channel;
  dayRate: number;   // KRW per hour
  nightRate: number; // KRW per hour
  extraPerPersonPerHour: number; // default 5000
}

export interface PeopleChange {
  at: string;   // ISO-8601 (KST), 변경 시각 포함
  people: number; // 변경 이후 적용 인원
}

export interface QuoteInput {
  startAt: string; // ISO-8601 (KST)
  endAt: string;   // ISO-8601 (KST)
  channel?: Channel; // default: "default"
  // 예약 동안 인원 변동이 없으면 omit; 있으면 시간순 정렬된 변경 타임라인
  peopleTimeline?: PeopleChange[];
  // 없으면 reservationPeople를 사용
  reservationPeople: number; // 시작 시점 인원
  discount?: { type: "amount" | "rate"; value: number } | null;
}

export interface QuoteSegment {
  from: string; // ISO
  to: string;   // ISO
  band: "DAY" | "NIGHT";
  unitHourly: number;     // 해당 구간의 시간대 단가
  hours: number;          // 0.5 단위
  people: number;         // 이 구간 적용 인원
  extraPeopleCount: number; // max(0, people-3)
  baseAmount: number;     // unitHourly * hours
  extraAmount: number;    // extraPeopleCount * extraPerPersonPerHour * hours
  subtotal: number;       // base+extra
}

export interface QuoteResult {
  segments: QuoteSegment[];
  baseAmount: number;         // 모든 DAY/NIGHT 합
  extraPeopleAmount: number;  // 모든 구간 extra 합
  preDiscountTotal: number;   // base + extra
  discountApplied?: { type: "amount" | "rate"; value: number; amount: number } | null;
  finalAmount: number;        // preDiscountTotal - discount
  meta: {
    channel: Channel;
    minimumHoursSatisfied: boolean; // false면 에러를 같이 반환
    sliceMinutes: 30;
    timezone: "Asia/Seoul";
    rulesetVersion: "v1";
  };
}

export class PricingError extends Error {
  code:
    | "INVALID_TIME_RANGE"
    | "MIN_DURATION_NOT_MET"
    | "DISCOUNT_CONFLICT"
    | "NEGATIVE_AMOUNT";
  constructor(code: PricingError["code"], message?: string);
}
```

---

## 4) 퍼블릭 API (index.ts / pricing.ts)

```typescript
/** 규칙 조회/기본값 */
export function getDefaultPricingRules(): PricingRule[];

/** 채널에 맞는 규칙 선택 (없으면 default) */
export function resolveRule(channel?: Channel, overrides?: Partial<PricingRule>): PricingRule;

/** 견적 계산 (핵심) */
export function computeQuote(input: QuoteInput, rule?: PricingRule): QuoteResult;

/** 유효성 검사만 수행 (throw on error) */
export function validateQuoteInput(input: QuoteInput): void;

/** 할인 금액만 별도로 재계산 (검증 포함) */
export function applyDiscount(preDiscountTotal: number, discount?: {type:"amount"|"rate"; value:number} | null): {
  amount: number; // 차감액
  applied: { type: "amount"|"rate"; value: number } | null;
  final: number;
};
```

---

## 5) 알고리즘 개요

### 5.1 시간 구간 분할 (segmentation.ts)

* 입력 구간 [startAt, endAt)을 30분 단위로 슬라이스
* 각 슬라이스 시작 시각이 08:00~19:59:59 → DAY, 그 외 → NIGHT
* 즉, [08:00, 20:00) = DAY, 나머지 = NIGHT
* 跨일(00:00 경과)도 동일 규칙. 22~02는 전부 NIGHT

### 5.2 인원 변동 적용

* peopleTimeline이 있으면 시간순 정렬 가정
* 각 슬라이스 시작 시각 ≥ change.at 인 최신 변경을 찾아 해당 인원 적용
* 없으면 reservationPeople 사용
* extraPeopleCount = max(0, people - 3)

### 5.3 금액 산식

* 슬라이스 시간 0.5h 기준
* baseAmount = (band == DAY ? dayRate : nightRate) * hours
* extraAmount = extraPerPersonPerHour * extraPeopleCount * hours
* 모든 슬라이스 합산 후 반올림 불필요(정수 유지). 소수점 생기지 않도록 hours를 0.5로만 사용

### 5.4 할인

* 금액/비율 중 택1 (둘 다 지정 시 DISCOUNT_CONFLICT)
* rate는 %로 해석 (예: 10 → 10%)
* amount는 원화 정수
* 최종 금액은 0 이상 보장(음수면 0으로 클램프)

### 5.5 검증

* endAt > startAt
* 최소 2시간 ((endAt - startAt) >= 2h)
* reservationPeople >= 1, peopleTimeline.people >= 1
* 금액/비율 동시 지정 금지

---

## 6) 예시 사용법

### 6.1 기본 견적

```typescript
const input: QuoteInput = {
  startAt: "2025-10-12T19:00:00+09:00",
  endAt:   "2025-10-12T21:00:00+09:00",
  reservationPeople: 4,   // +1 초과 인원
  channel: "default",
  discount: null,
};
const res = computeQuote(input);
// base: 19-20 DAY 40k + 20-21 NIGHT 20k = 60,000
// extra: (4-3)*5,000*2h = 10,000
// total = 70,000
```

### 6.2 跨일 + 인원 변경

```typescript
const input: QuoteInput = {
  startAt: "2025-10-12T22:00:00+09:00",
  endAt:   "2025-10-13T02:00:00+09:00",
  reservationPeople: 3,
  peopleTimeline: [{ at: "2025-10-13T00:30:00+09:00", people: 5 }],
  channel: "default",
};

const res = computeQuote(input);
// 22–02 전체 NIGHT(20k)
// 구간: 22:00-00:30(2.5h, 3명) + 00:30-02:00(1.5h, 5명)
// base: 4h * 20k = 80,000
// extra: 첫구간 0명, 둘째구간 (5-3)*5k*1.5h = 15,000
// total = 95,000
```

### 6.3 비율 할인(택1)

```typescript
const input: QuoteInput = {
  startAt: "2025-10-09T10:00:00+09:00",
  endAt:   "2025-10-09T14:00:00+09:00",
  reservationPeople: 5, // +2
  discount: { type: "rate", value: 10 },
};
const res = computeQuote(input);
// base: 4h * 40k = 160,000
// extra: 2 * 5k * 4h = 40,000
// pre = 200,000 → 10% = 20,000 → final = 180,000
```

---

## 7) 채널 요금 오버라이드

* DB의 pricingRules/{channel} 또는 클라 설정에서 로딩 → resolveRule(channel, overrides)

```typescript
const hourplace = resolveRule("hourplace", { dayRate: 38000, nightRate: 19000 });
computeQuote(input, hourplace);
```

---

## 8) 유효성 & 에러 처리 패턴

```typescript
try {
  validateQuoteInput(input);
  const res = computeQuote(input);
} catch (e) {
  if (e instanceof PricingError) {
    // e.code로 분기 처리
  } else {
    // 일반 예외
  }
}
```

---

## 9) 테스트 벡터 (test/fixtures.ts)

1. 경계 혼합: 19–21, people=4 → 70,000
2. 跨일: 22–02, people=3 → 80,000
3. 跨일+변동: 22–02, 00:30부터 5인 → 95,000
4. 비율 할인: 10–14, 5인, 10% → 180,000
5. 금액 할인: 10–14, 5인, 15,000 → 185,000
6. 최소시간 위반: 09–10 → MIN_DURATION_NOT_MET
7. 동시 할인: rate+amount → DISCOUNT_CONFLICT
8. 채널 오버라이드(Hourplace 38k/19k): 14–16, 4인 → 86,000

---

## 10) 성능 & 결정성

* 30분 슬라이스(최대 96슬라이스/예약) → O(N)
* 모든 금액은 정수(KRW)로 유지 (소수점 없음)
* 동일 입력은 항상 동일 결과 (Functions/클라 간 일관성)

---

## 11) Functions·클라 통합 가이드

* 공용 패키지를 npm 워크스페이스로 공유
* 클라: 미리보기 견적 = computeQuote()
* 서버(Functions): 실제 인보이스 생성 전 동일 함수로 재검증 후 저장
* 할인 적용/로그 남김은 서버에서 최종 확정
