# 🔌 API Specification: Studio Morph (MVP Lite, Firebase 기반)

본 문서는 Firebase Functions/Firestore/Storage를 사용하는 **MVP Lite API 스펙**입니다. 클라이언트(웹)에서 호출하는 **HTTPS/Callable Functions**, 백그라운드 **Trigger Functions**, Firestore/Storage 스키마 및 **검증 규칙**을 포함합니다.

> 표기: (C)=Callable/HTTPS, (BG)=Background Trigger

---

## 0) 공통 규칙

* **인증**: Firebase Auth(운영자 1인). 모든 API는 인증 필요
* **응답 포맷**: `{ ok: boolean, data?: any, error?: { code: string, message: string, details?: any } }`
* **타임존**: Asia/Seoul (UTC+9)
* **화폐**: KRW(정수, 원 단위)
* **날짜/시간**: ISO 8601 문자열 또는 Firestore Timestamp
* **에러 코드**: `INVALID_ARGUMENT`, `NOT_FOUND`, `PERMISSION_DENIED`, `CONFLICT`, `FAILED_PRECONDITION`, `INTERNAL`

---

## 1) 예약/요금

### 1.1 calcQuote (C)

**요금 미리보기**

* **POST** `/calcQuote`
* **req.body**

```json
{
  "startAt": "2025-10-09T10:00:00+09:00",
  "endAt":   "2025-10-09T14:00:00+09:00",
  "people": 5,
  "channel": "default",
  "discount": { "type": "rate", "value": 10 } // 혹은 {"type":"amount","value":15000} 또는 null
}
```

* **rules**
  * 최소 2시간, `endAt > startAt`
  * 할인은 amount | rate 중 택1

* **resp.data**

```json
{
  "segments": [
    { "from":"2025-10-09T10:00:00+09:00", "to":"2025-10-09T20:00:00+09:00", "rate":"DAY", "unit":40000, "hours":4 }
  ],
  "baseAmount": 160000,
  "extraPeopleAmount": 40000,
  "discountApplied": {"type":"rate","value":10,"amount":20000},
  "finalAmount": 180000
}
```

### 1.2 upsertReservation (C)

**예약 생성/수정** (캘린더 동기화 후 보정 포함)

* **POST** `/upsertReservation`
* **req.body**

```json
{
  "reservation": {
    "id": "res_abc", // optional(없으면 신규)
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt":   "2025-10-09T14:00:00+09:00",
    "people": 5,
    "channel": "default",
    "notes": "입금자명: 윤아영\n연락처: 010-2344-4564"
  },
  "meta": {
    "payerName": "윤아영",
    "phone": "01023444564",
    "peopleCount": 5,
    "parkingCount": 2,
    "shootingPurpose": "룩북"
  }
}
```

* **resp.data**: `{ reservationId: string }`

### 1.3 createInvoice (C)

**예약에 대한 인보이스 생성** (할인 적용 포함)

* **POST** `/createInvoice`
* **req.body**

```json
{
  "reservationId": "res_abc",
  "discount": {"type":"amount","value":15000} // 혹은 {"type":"rate","value":10} 또는 null
}
```

* **resp.data**: `{ invoiceId: string, finalAmount: number }`

### 1.4 applyDiscount (C)

**기존 인보이스에 할인 적용(로그 기록)**

* **POST** `/applyDiscount`
* **req.body**

```json
{ "invoiceId": "inv_xyz", "type": "amount", "value": 15000 }
```

* **resp.data**: `{ invoiceId: string, finalAmount: number }`

---

## 2) 거래내역/매칭

### 2.1 parseBankCsv (BG)

**CSV 업로드 트리거**

* **Storage Trigger**: `gs://<bucket>/bank-csv/*.csv` onFinalize
* **동작**: CSV → JSON 파싱 → `bankTx` 문서 생성 (status=`UNMATCHED`)

### 2.2 listPendingMatches (C)

**검토 대기 큐 조회**

* **GET** `/listPendingMatches?limit=50`
* **resp.data**

```json
{
  "tx": [
    {"id":"tx_1","date":"2025-05-07T23:07:57+09:00","amount":160000,"depositorName":"김준석(뉴머)"}
  ],
  "candidates": [
    {"txId":"tx_1","reservations":[{"reservationId":"res_abc","score":0.82}]}
  ]
}
```

### 2.3 matchBankTx (C)

**수동 매칭 확정**

* **POST** `/matchBankTx`
* **req.body**

```json
{ "txId": "tx_1", "invoiceId": "inv_xyz" }
```

* **resp.data**: `{ matched: true }`

---

## 3) 비용/목표/요약

### 3.1 upsertMonthlyCosts (C)

* **POST** `/upsertMonthlyCosts`
* **req.body**

```json
{
  "month": "2025-10",
  "rent": 1200000,
  "utilities": 100000,
  "adsTotal": 650000,
  "supplies": 80000,
  "maintenance": 40000
}
```

* **resp.data**: `{ month: "2025-10" }`

### 3.2 setMonthlyGoal (C)

* **POST** `/setMonthlyGoal`
* **req.body** `{ "month": "2025-10", "revenueTarget": 6000000 }`
* **resp.data** `{ ok: true }`

### 3.3 getDashboardSummary (C)

* **GET** `/getDashboardSummary?month=2025-10`
* **resp.data**

```json
{
  "revenue": 5200000,
  "costs": 1420000,
  "profit": 3780000,
  "utilization": 0.53,
  "goal": {"revenueTarget": 6000000, "progress": 0.87}
}
```

### 3.4 notifyMonthlyGoal (BG)

* **Scheduler Trigger**: 매일 09:00 KST
* **동작**: 월 목표 달성/미달 체크 → 이메일 발송(1일 1회)

---

## 4) 검증 & 비즈니스 규칙

* **예약**: 최소 2시간, 경계(08/20) 분할 계산, 야간跨일 전 구간 야간 단가
* **인원 변경**: 변경 시점부터 반영(30분 단위 슬라이스 권장)
* **할인**: amount | rate 중 택1 (동시 적용 금지). 모든 적용은 `discountLogs` 기록
* **매칭**: 우선순위=일자→입금자명→금액, 동일 금액 다건은 자동 매칭 금지
* **전기/수도세**: 최근 3개월 평균값 기본 제안, 수정 가능

---

## 5) 에러 사례

* `INVALID_ARGUMENT`: endAt ≤ startAt, 최소 2시간 불만족, 할인 규칙 위반
* `FAILED_PRECONDITION`: 이미 매칭된 txId 재매칭 시도
* `NOT_FOUND`: 존재하지 않는 reservationId/invoiceId/txId
* `CONFLICT`: 동시 수정 충돌(낙관적 잠금 적용 권장)

---

## 6) 보안 (요약)

* 모든 Callable/HTTPS는 **Auth Required**
* Firestore/Storage Rules: 운영자 계정만 R/W
* Secret Manager: Calendar/OAuth, Email API Key 저장

---

## 7) 예시 시퀀스

```
[CSV 업로드] → (parseBankCsv) → bankTx(UNMATCHED)
[listPendingMatches] → 후보 표시 → [matchBankTx]
[upsertReservation] → [createInvoice] → [applyDiscount]
[getDashboardSummary] → 대시보드 표시
```

---

## 8) TODO (차기)

* Open Banking API 연동 엔드포인트 초안
* 광고비 채널별 breakdown용 API
* 예약자 메모 AI 파서 endpoint(옵션)
