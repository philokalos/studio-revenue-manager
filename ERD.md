# 🗺 ERD: Studio Morph 매출·수익 관리 서비스 (Firebase/Firestore)

본 문서는 MVP Lite PRD와 **TRD(Firebase 전면)**를 기반으로 한 Firestore 중심의 ERD(엔터티/관계) 설계 문서입니다.

Firestore는 문서지향 DB이므로, 컬렉션/문서/서브컬렉션 단위로 관계를 표현합니다. 정규화는 최소화하고, 조회 패턴에 맞춘 읽기 최적화를 우선합니다.

---

## 1) 하이레벨 엔터티 맵

```
reservations ──1───< invoices ──0..1─── bankTx (matched)
     │                │
     └───1─── meta    └───*─── discountLogs

costs (monthly)   goals (monthly)   summaries (monthly)
```

* **reservations**: 예약의 원천 엔터티
* **meta(서브컬렉션 또는 별도 컬렉션)**: 예약자 보조 정보(입금자명/연락처 등)
* **invoices**: 예약별 청구/정산 정보 (추가 연장 시 다건 가능)
* **discountLogs**: 인보이스별 할인 이력
* **bankTx**: 은행 거래내역(업로드/파싱 결과). 매칭되면 matchedInvoiceId로 연결
* **costs/goals/summaries**: 월 단위 관리/목표/집계

---

## 2) 컬렉션 스키마

### reservations/{reservationId}

| 필드 | 타입 | 설명 |
|------|------|------|
| startAt | Timestamp | 예약 시작 시각 |
| endAt | Timestamp | 예약 종료 시각 |
| people | Number | 예약 인원(기본 입력) |
| channel | String | `default` \| `hourplace` \| `spacecloud` |
| status | String | `CONFIRMED` \| `CANCELLED` |
| notes | String | 원본 메모(설명란) |
| needsCorrection | Boolean | 보정 필요 여부(연락처 누락 등) |
| correctedAt | Timestamp | null \| Timestamp |

### reservations/{reservationId}/meta/default

| 필드 | 타입 | 설명 |
|------|------|------|
| payerName | String | 입금자명 |
| phone | String | 연락처(정규화: 010xxxxxxxx) |
| peopleCount | Number | 방문 인원 수(표준화) |
| parkingCount | Number | 주차 대수 |
| shootingPurpose | String | 촬영 내용 |

### invoices/{invoiceId}

| 필드 | 타입 | 설명 |
|------|------|------|
| reservationId | String | 참조 예약 ID |
| expectedAmount | Number | 요금 엔진 계산 값 |
| discountType | String | null \| `amount` \| `rate` |
| discountValue | Number | null \| Number |
| finalAmount | Number | 최종 청구 금액 |
| status | String | `OPEN` \| `PAID` \| `PARTIAL` \| `VOID` |
| createdAt | Timestamp | 생성 시각 |

### invoices/{invoiceId}/discountLogs/{logId}

| 필드 | 타입 | 설명 |
|------|------|------|
| appliedBy | String | 사용자 UID (운영자) |
| appliedAt | Timestamp | 적용 시각 |
| type | String | `amount` \| `rate` |
| value | Number | 할인값 |

### bankTx/{txId}

| 필드 | 타입 | 설명 |
|------|------|------|
| date | Timestamp | 입금 일시 |
| amount | Number | 금액(정규화) |
| depositorName | String | 입금자명 |
| memo | String | 원문 메모/비고 |
| matchedInvoiceId | String | null \| invoiceId |
| status | String | `UNMATCHED` \| `MATCHED` \| `PENDING_REVIEW` |
| raw | Map | CSV 원문 파싱 결과(원본 보관) |

### costs/{yyyyMM}

| 필드 | 타입 | 설명 |
|------|------|------|
| rent | Number | 임대료 |
| utilities | Number | 전기/수도세(3개월 평균 기본값) |
| adsTotal | Number | 광고비 월 총액 |
| supplies | Number | 소모품 |
| maintenance | Number | 장비 유지보수 |

### goals/{yyyyMM}

| 필드 | 타입 | 설명 |
|------|------|------|
| revenueTarget | Number | 월 매출 목표 |
| notifiedAt | Timestamp | null \| Timestamp |

### summaries/{yyyyMM}

| 필드 | 타입 | 설명 |
|------|------|------|
| revenue | Number | 월 매출 합계 |
| costs | Number | 월 비용 합계 |
| profit | Number | 순이익 |
| utilization | Number | 예약률(운영 블록 제외) |

---

## 3) 관계 정의 및 제약

* **reservations 1 ── * invoices**: 하나의 예약은 여러 인보이스(연장 등)를 가질 수 있음
* **invoices 0..1 ── 1 bankTx**: 인보이스는 선택적으로 하나의 거래와 매칭됨 (matchedInvoiceId 역참조)
* **invoices 1 ── * discountLogs**: 인보이스당 다수 할인 로그
* **meta는 예약의 서브리소스**: RLS/보안상 분리 가능하나 MVP에선 단순화

### 무결성 규칙 (앱/Functions 레벨)

* 예약 삭제 시 → 연결된 invoices/discountLogs의 상태를 VOID 처리(물리 삭제 지양)
* bankTx 매칭 변경 시 → 기존 인보이스의 matchedInvoiceId 해제 후 새 인보이스에 설정
* 할인 정책: discountType은 amount 또는 rate 중 하나만, 둘 다 불가

---

## 4) 인덱스 & 쿼리 패턴

* **reservations** by `startAt` (월간 범위 조회), `needsCorrection`
* **invoices** by `reservationId`, `status`
* **bankTx** by `status`, `date`
* **summaries** 단일 키 조회(/summaries/2025-10)

### 복합 인덱스 예

`bankTx(status ASC, date DESC)`

---

## 5) 샘플 문서 구조

### reservations

```json
{
  "startAt": "2025-10-12T19:00:00+09:00",
  "endAt": "2025-10-12T21:00:00+09:00",
  "people": 4,
  "channel": "default",
  "status": "CONFIRMED",
  "notes": "입금자명: 박상범\n연락처: 010-1234-5432\n인원: 4",
  "needsCorrection": false,
  "correctedAt": null
}
```

### reservations/{id}/meta/default

```json
{
  "payerName": "박상범",
  "phone": "01012345432",
  "peopleCount": 4,
  "parkingCount": 1,
  "shootingPurpose": "의류"
}
```

### invoices

```json
{
  "reservationId": "res_abc",
  "expectedAmount": 70000,
  "discountType": null,
  "discountValue": null,
  "finalAmount": 70000,
  "status": "PAID",
  "createdAt": "2025-10-12T22:10:00+09:00"
}
```

### discountLogs

```json
{
  "appliedBy": "uid_admin",
  "appliedAt": "2025-10-12T10:00:00+09:00",
  "type": "amount",
  "value": 15000
}
```

### bankTx

```json
{
  "date": "2025-10-12T22:05:00+09:00",
  "amount": 70000,
  "depositorName": "박상범",
  "memo": "카카오뱅크 CSV 원문",
  "matchedInvoiceId": "inv_xyz",
  "status": "MATCHED",
  "raw": {"csvLine": "..."}
}
```

### costs/goals/summaries

```json
// costs/2025-10
{
  "rent": 1200000,
  "utilities": 100000,
  "adsTotal": 650000,
  "supplies": 80000,
  "maintenance": 40000
}

// goals/2025-10
{"revenueTarget": 6000000, "notifiedAt": null}

// summaries/2025-10
{"revenue": 5200000, "costs": 1420000, "profit": 3780000, "utilization": 0.53}
```

---

## 6) 데이터 흐름 다이어그램 (텍스트)

```
[Calendar] --pull--> (CF:pullCalendar) --write--> [Firestore: reservations]
[CSV Upload] --> [Storage] --trigger--> (CF:parseCsv) --write--> [Firestore: bankTx]
[Client UI: Match] --call--> (CF:matchBankTx) --update--> [bankTx, invoices]
[Client UI: Discount] --call--> (CF:applyDiscount) --write--> [discountLogs, invoices]
[Scheduler Monthly] --trigger--> (CF:monthlySummary) --write--> [summaries] --notify--> [Email]
```

---

## 7) 규칙/무결성 체크리스트

* 최소 2시간 예약 검증 (클라이언트 + CF)
* 경계/跨일/인원 변경 요금 계산 일관성(클라·서버 공통 유틸)
* 할인 동시 적용 금지(스키마/검증)
* 매칭 상태 전이: UNMATCHED ↔ PENDING_REVIEW ↔ MATCHED
* 예약 삭제 시 인보이스 VOID 처리 권고(하드 딜리트 지양)

---

## 8) 확장 고려사항

* **멀티 테넌시**: 최상위에 `tenants/{tenantId}/...` 구조로 승격 가능
* **채널별 요금표**: `pricingRules/{channel}` 컬렉션 추가 가능
* **ROI 상세**: `adsBreakdown/{yyyyMM}` 컬렉션로 세분화 가능
