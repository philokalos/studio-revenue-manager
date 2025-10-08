# 📄 TRD: Studio Morph 매출·수익 관리 서비스 (MVP Lite)

**업데이트 (2025-10-07)**: 백엔드와 인프라를 Firebase 전면 채택으로 변경했습니다.

본 문서는 Studio Morph 매출·수익 관리 서비스의 **기술 요구사항 문서(Technical Requirements Document, TRD)**로, PRD 및 사용자 여정 문서를 기반으로 작성되었습니다.

---

## 1. 아키텍처 개요 (Firebase 전면 채택)

* **클라이언트(Frontend)**: React + Vite (바이브코딩), 배포: Firebase Hosting
* **인증**: Firebase Authentication (Email/Password 1계정)
* **데이터베이스**: Cloud Firestore (단일 테넌트, Asia-Northeast3 (Seoul) 권장)
* **파일 스토리지**: Cloud Storage for Firebase (CSV 업로드 버킷)
* **백엔드 로직**: Cloud Functions for Firebase (HTTP & Background Trigger)
* **스케줄러/잡**: Cloud Scheduler → Pub/Sub → Functions 트리거
* **외부 연동**:
  * Google Calendar API (예약 동기화) — Service Account/OAuth 2.0 저장: Secret Manager
  * 이메일 발송: Firebase Extensions – Trigger Email (with Mailgun/SendGrid) 또는 HTTPS Function + SMTP

### 아키텍처 흐름 요약

1. 캘린더 Pull 스케줄러(Cloud Scheduler) → Function이 Google Calendar API 호출 → Firestore에 예약 동기화
2. 거래내역 CSV를 Storage에 업로드 → Storage Trigger Function이 파싱 → Firestore에 BankTx 도큐먼트 저장
3. 매칭/요금 계산/알림은 Functions에서 수행, 결과는 Firestore 반영 → 클라이언트는 실시간 구독

---

## 2. 주요 기능별 기술 요구사항

### 2.1 예약 관리

* **데이터 소스**: Google Calendar API (Service Account or OAuth)
* **동기화 주기**: 15분/1시간 간격(Cloud Scheduler) — MVP는 1시간 권장
* **파싱 로직**:
  * 이벤트 제목/메모(description)에서 메타데이터 추출
  * 연락처 정규화: 010-xxxx, 010xxxx, +82-10-xxxx → 010xxxxxxxx
  * 날짜는 캘린더 이벤트(시작/종료)를 신뢰, 메모의 날짜는 무시
* **저장**: Firestore 컬렉션 설계
  * `reservations/{reservationId}`: startAt, endAt, people, channel, status, notes, correctedAt
  * `reservations/{reservationId}/meta/default` (또는 `reservationMeta/{reservationId}`): payerName, phone, peopleCount, parkingCount, shootingPurpose
* **예외 처리**:
  * 연락처 누락 → `needsCorrection: true` 필드로 표기, 클라이언트에서 보정 가능

### 2.2 요금 엔진

* **규칙 (PRD 준수)**:
  * 주간(08–20): 40,000원/시간, 야간(20–08): 20,000원/시간
  * 인원 3명 초과: 1명당 5,000원/시간 추가
  * 최소 2시간
  * 경계 시각 교차 시 시간대별 분할 계산 (예: 19–21 → 19–20 주간, 20–21 야간)
  * 야간跨일(22–02)은 전 구간 야간 단가
  * 인원 변경 발생 시 변경 시점부터 추가요금 반영
* **할인 정책**:
  * 금액 or 비율 중 하나만 적용
  * 적용 내역은 `discountLogs` 서브컬렉션에 저장 (appliedBy, appliedAt, type, value)
* **구현 위치**: Cloud Functions (Callable/HTTPS) + 클라이언트 미리보기 계산(동일 로직 공유 유틸)

### 2.3 매출 관리

* **입력 경로**: KakaoBank 거래내역 CSV 업로드 (Cloud Storage)
* **파서**: Storage Trigger Function (onFinalize)
  * CSV → JSON 변환, 금액/일자/입금자명 정규화
  * `bankTx/{txId}` 도큐먼트 저장 (date, amount, depositorName, raw)
* **매칭 로직 (Function)**:
  * 우선순위: 일자 → 입금자명 → 금액
  * 동일 금액 다중 예약: 자동 매칭 보류, 상태=PENDING_REVIEW → 운영자 수동 지정 화면 제공
  * 추가 입금(시간 연장): 동일 예약 참조로 별도 인보이스 생성
* **청구/정산**: `invoices/{invoiceId}`: reservationId, expectedAmount, discountType, discountValue, finalAmount, status

### 2.4 비용 관리

* **입력**: 클라이언트에서 월 단위 수동 입력
* **자동화**: 전기/수도세 기본값은 최근 3개월 평균을 Function이 계산하여 제안
* **저장**: `costs/{yyyyMM}`: rent, utilities, adsTotal, supplies, maintenance, channelBreakdown(optional)

### 2.5 대시보드

* **표시**: 이번달 매출/비용/순이익/예약률 + 목표 대비 게이지
* **집계**: Cloud Functions의 Scheduled Job이 월 단위 요약을 `summaries/{yyyyMM}`에 캐시 (쿼리 비용 절감)
* **실시간성**: 예약/인보이스/비용 변경 시 클라이언트 구독으로 즉시 반영

### 2.6 알림 시스템

* **이벤트**: 월 매출 목표 달성/미달
* **채널**: 이메일 (Firebase Extensions – Trigger Email 권장)
* **빈도 제어**: Cloud Tasks/Firestore 락 문서로 1일 1회 디바운스
* **설정**: `goals/{yyyyMM}`: revenueTarget, notifiedAt

---

## 3. Firestore 데이터 모델 (권장 스키마)

```
reservations/{reservationId}
  startAt: Timestamp
  endAt: Timestamp
  people: number
  channel: "default" | "hourplace" | "spacecloud"
  status: "CONFIRMED" | "CANCELLED"
  notes: string
  needsCorrection: boolean
  correctedAt: Timestamp | null

reservations/{reservationId}/meta/default
  payerName: string
  phone: string
  peopleCount: number
  parkingCount: number
  shootingPurpose: string

invoices/{invoiceId}
  reservationId: string
  expectedAmount: number
  discountType: "amount" | "rate" | null
  discountValue: number | null
  finalAmount: number
  status: "OPEN" | "PAID" | "PARTIAL" | "VOID"

invoices/{invoiceId}/discountLogs/{logId}
  appliedBy: string (uid)
  appliedAt: Timestamp
  type: "amount" | "rate"
  value: number

bankTx/{txId}
  date: Timestamp
  amount: number
  depositorName: string
  memo: string
  matchedInvoiceId: string | null
  status: "UNMATCHED" | "MATCHED" | "PENDING_REVIEW"

costs/{yyyyMM}
  rent: number
  utilities: number  // default: rollingAvg3m, editable
  adsTotal: number   // 월 총액(채널별 세부 breakdown은 선택)
  supplies: number
  maintenance: number

summaries/{yyyyMM}
  revenue: number
  costs: number
  profit: number
  utilization: number  // 예약률

goals/{yyyyMM}
  revenueTarget: number
  notifiedAt: Timestamp | null
```

---

## 4. 보안/권한/비밀 관리

* **Auth**: Firebase Authentication 단일 사용자(운영자) — 이메일/비밀번호
* **Firestore Security Rules**:
  * 인증 사용자만 읽기/쓰기 허용
  * 컬렉션별 필드 검증(예: 할인 동시 적용 금지, 최소 2시간 검증은 클라이언트+Functions에서 동시 체크)
* **Storage Rules**: CSV 업로드는 인증 사용자만 허용, 바이러스/확장자 검사
* **Secret Manager**: Google Calendar OAuth/SA 자격정보, SMTP/API 키 보관
* **개인정보 보존**: 5년, 운영자 1인 사용이므로 마스킹 불필요 (로드맵에서 다계정 시 고려)

---

## 5. 비기능 요구사항

* **성능**: CSV 2천건 파싱 ≤ 10초(Function 메모리 512MB/초기 콜드 스타트 고려)
* **가용성**: Firebase Hosting/Functions 기본 SLA 수준
* **비용**: Firebase Spark→Blaze 전환 대비, 읽기/쓰기/함수 호출 최적화 (요약 캐시, 컬렉션 인덱스 설계)
* **유지보수성**: 1인 바이브코딩을 고려한 단순 디렉토리 구조 + 공용 유틸 함수 공유

---

## 6. API/함수 설계 (요약)

### HTTP/Callable Functions

* `calcQuote(reservationPayload)` → 미리보기 요금 계산
* `applyDiscount(invoiceId, type, value)` → 할인 적용 + 로그 기록
* `matchBankTx(txId, invoiceId)` → 수동 매칭 확정

### Background Functions

* `onCsvUploaded(storageObject)` → CSV 파싱/검증/bankTx 저장
* `onSchedule_pullCalendar()` → 캘린더 동기화 (Scheduler + Pub/Sub)
* `onSchedule_monthlySummary()` → 월간 요약/목표 체크/알림

---

## 7. 인덱스/쿼리 설계 (예시)

* `invoices` by `reservationId`
* `bankTx` by `status`, `date`
* `reservations` by `startAt` (월 범위 질의), `needsCorrection`
* 복합 인덱스: `bankTx(status, date)` 등

---

## 8. 모니터링/로깅

* Cloud Logging + Error Reporting 활성화
* 주요 비즈니스 이벤트(할인 적용, 수동 매칭, 목표 알림)는 Audit Log 컬렉션(또는 로그 집약)으로 적재

---

## 9. 테스트 전략 (요약)

* **단위 테스트**: 요금 엔진(경계/跨일/인원 변경/할인)
* **통합 테스트**: CSV → bankTx → 매칭 → invoice 파이프라인
* **E2E 테스트**: 예약 동기화 → 대시보드 집계 → 목표 알림 이메일

---

## 10. 향후 확장 (Firebase 기반)

* Cloud Functions Gen2 전환로 비용/성능 최적화
* Workflows + Scheduler로 다단계 잡 구성
* Firebase App Check 도입(웹 무단 접근 방지)
* Extensions(Stripe Payments 등)로 유상 결제/구독 모델 확장
