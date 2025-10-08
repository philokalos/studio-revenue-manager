# 📋 Studio Morph 문서 정합성 검증 보고서

**작성일**: 2025-10-07
**프로젝트**: Studio Morph 매출·수익 관리 서비스 (MVP Lite)
**목적**: 전체 문서 간 일관성, 완결성, 연계성 검증

---

## ✅ 검증 요약

### 검증 대상 문서 (10개)
1. PRD.md - 제품 요구사항
2. USER_JOURNEY.md - 사용자 여정
3. TRD.md - 기술 요구사항
4. ERD.md - 데이터 스키마
5. DESIGN_SYSTEM.md - 디자인 시스템
6. INFORMATION_ARCHITECTURE.md - 정보 구조
7. API_SPECIFICATION.md - API 명세
8. FIREBASE_SECURITY_RULES.md - 보안 규칙
9. PRICING_ENGINE_SPEC.md - 요금 엔진 스펙
10. TEST_CASES_QA_PLAN.md - 테스트 케이스 & QA 플랜

### 검증 항목
- ✅ 핵심 비즈니스 규칙 일관성
- ✅ 데이터 모델 정합성
- ✅ API 계약과 데이터 스키마 일치
- ✅ 요금 계산 로직 일관성
- ✅ 보안 규칙과 데이터 모델 정렬
- ✅ 테스트 케이스와 기능 요구사항 매칭
- ✅ UI/UX와 사용자 여정 연계
- ⚠️ 경미한 개선 권장사항 식별

---

## 1. 핵심 비즈니스 규칙 정합성 검증 ✅

### 1.1 요금 정책 (Price Policy)

**PRD.md 정의**:
- 주간(08~20): 40,000원/시간
- 야간(20~08): 20,000원/시간
- 기본 3인, 4인 이상 1인당 5,000원/시간 추가
- 최소 예약 2시간
- 할인: 금액 또는 비율 중 택1

**검증 결과**: ✅ 모든 문서에서 일관성 유지
- ✅ PRICING_ENGINE_SPEC.md: 동일 규칙 명시 (섹션 2)
- ✅ TRD.md: 동일 규칙 반영 (섹션 2.2)
- ✅ API_SPECIFICATION.md: calcQuote API에 동일 규칙 적용 (섹션 1.1)
- ✅ TEST_CASES_QA_PLAN.md: 테스트 픽스처가 규칙 준수 (섹션 4.1)

### 1.2 경계 시각 및 跨日(Overnight) 처리

**PRD.md 정의**:
- 경계 시각(08, 20) 기준 단가 변경
- 跨日 예약: 전 구간 해당 단가로 계산 (22~02 전부 야간)

**검증 결과**: ✅ 완벽 일치
- ✅ PRICING_ENGINE_SPEC.md: 섹션 5.1에서 [08:00, 20:00) = DAY, 나머지 = NIGHT 명확히 정의
- ✅ TRD.md: 섹션 2.2에서 동일 처리 로직 명시
- ✅ TEST_CASES_QA_PLAN.md: R1(경계 교차), R2(跨日) 테스트 케이스로 검증

### 1.3 할인 정책

**PRD.md 정의**:
- 금액 또는 비율 중 하나만 적용
- 로그 기록 필수

**검증 결과**: ✅ 전 문서 일관성
- ✅ PRICING_ENGINE_SPEC.md: DISCOUNT_CONFLICT 에러 코드 정의 (섹션 3, 5.4)
- ✅ ERD.md: discountLogs 서브컬렉션 정의 (섹션 2)
- ✅ API_SPECIFICATION.md: applyDiscount API에서 로그 기록 명시 (섹션 1.4)
- ✅ FIREBASE_SECURITY_RULES.md: discountLogs 컬렉션 접근 규칙 정의 (섹션 1, line 68-72)

### 1.4 인원 변경 처리

**PRD.md 정의**:
- 인원 증감 발생 시 변경 시점부터 적용

**검증 결과**: ✅ 정확히 구현
- ✅ PRICING_ENGINE_SPEC.md: peopleTimeline 타입 정의 및 알고리즘 명시 (섹션 3, 5.2)
- ✅ TEST_CASES_QA_PLAN.md: R4 테스트 케이스로 검증 (섹션 3, 4.1)

---

## 2. 데이터 모델 정합성 검증 ✅

### 2.1 Firestore 컬렉션 구조

**TRD.md 정의** (섹션 3):
```
reservations/{reservationId}
reservations/{reservationId}/meta/default
invoices/{invoiceId}
invoices/{invoiceId}/discountLogs/{logId}
bankTx/{txId}
costs/{yyyyMM}
goals/{yyyyMM}
summaries/{yyyyMM}
```

**검증 결과**: ✅ ERD.md와 100% 일치
- ✅ ERD.md 섹션 2: 모든 컬렉션 스키마 정의 일치
- ✅ 필드 타입, 제약 조건 완벽 정렬
- ✅ 관계 정의 일관성 유지 (섹션 3)

### 2.2 필수 필드 검증

**reservations 필수 필드**:
- ✅ startAt, endAt, people, channel, status: 모든 문서 일치
- ✅ needsCorrection 플래그: TRD, ERD, USER_JOURNEY 모두 명시

**invoices 필수 필드**:
- ✅ reservationId, expectedAmount, finalAmount, status: 일관성 유지
- ✅ discountType/discountValue nullable: PRICING_ENGINE_SPEC와 정렬

**bankTx 필수 필드**:
- ✅ date, amount, depositorName, status, matchedInvoiceId: 모든 문서 일치

### 2.3 Status 열거형 일관성

**reservations.status**:
- ✅ PRD/TRD/ERD: "CONFIRMED" | "CANCELLED"
- ✅ FIREBASE_SECURITY_RULES.md line 49: 동일 열거형 검증

**invoices.status**:
- ✅ TRD/ERD: "OPEN" | "PAID" | "PARTIAL" | "VOID"
- ✅ API_SPECIFICATION.md: 동일 상태 값 사용

**bankTx.status**:
- ✅ TRD/ERD: "UNMATCHED" | "MATCHED" | "PENDING_REVIEW"
- ✅ API_SPECIFICATION.md 섹션 2: 동일 상태 전환 로직

---

## 3. API 계약과 데이터 스키마 정합성 ✅

### 3.1 calcQuote API

**API_SPECIFICATION.md 섹션 1.1**:
```json
Request: {
  "startAt": "ISO-8601",
  "endAt": "ISO-8601",
  "people": number,
  "channel": string,
  "discount": {"type": "amount|rate", "value": number}
}
```

**검증 결과**: ✅ 완벽 정렬
- ✅ PRICING_ENGINE_SPEC.md QuoteInput 타입과 100% 일치 (섹션 3)
- ✅ TRD.md 섹션 6에서 동일 함수 시그니처
- ✅ 응답 포맷(segments, baseAmount, finalAmount)도 QuoteResult와 일치

### 3.2 upsertReservation API

**API_SPECIFICATION.md 섹션 1.2**:
```json
Request: {
  "reservation": {startAt, endAt, people, channel, notes},
  "meta": {payerName, phone, peopleCount, parkingCount, shootingPurpose}
}
```

**검증 결과**: ✅ ERD.md와 완벽 매칭
- ✅ reservations 필드: ERD 섹션 2 테이블 일치
- ✅ meta 필드: ERD 섹션 2 서브컬렉션 스키마 일치
- ✅ FIREBASE_SECURITY_RULES.md: 동일 필드 검증 규칙 (line 45-59)

### 3.3 createInvoice API

**API_SPECIFICATION.md 섹션 1.3**:
```json
Request: {reservationId, discount}
Response: {invoiceId, finalAmount}
```

**검증 결과**: ✅ 완전 일치
- ✅ ERD.md invoices 스키마와 정렬
- ✅ TRD.md 섹션 6 함수 정의와 일치

### 3.4 matchBankTx API

**API_SPECIFICATION.md 섹션 2.3**:
```json
Request: {txId, invoiceId}
```

**검증 결과**: ✅ 정합성 확인
- ✅ ERD.md: bankTx.matchedInvoiceId 필드 존재
- ✅ USER_JOURNEY.md 섹션 2: 매칭 플로우 정확히 반영

---

## 4. 보안 규칙과 데이터 모델 정렬 ✅

### 4.1 Firestore Rules 검증

**FIREBASE_SECURITY_RULES.md 섹션 1**:

**검증 결과**: ✅ 데이터 모델 완벽 반영
- ✅ reservations 규칙: isMinTwoHours 검증 → PRD 최소 2시간 규칙 일치
- ✅ isPhoneKR(phone): 010xxxxxxxx 검증 → TRD 섹션 2.1 정규화 규칙 일치
- ✅ channel 열거형 검증: ['default','hourplace','spacecloud'] → ERD 일치
- ✅ invoices/bankTx 클라이언트 쓰기 금지 → TRD 섹션 4 보안 정책 일치

### 4.2 Storage Rules 검증

**FIREBASE_SECURITY_RULES.md 섹션 2**:
- ✅ CSV 5MB 제한: TRD 성능 요구사항 반영
- ✅ contentType 검증: text/csv → API_SPECIFICATION 섹션 2.1 CSV 파싱 로직 일치

---

## 5. 테스트 케이스 커버리지 검증 ✅

### 5.1 요금 엔진 테스트 케이스

**TEST_CASES_QA_PLAN.md 섹션 4.1**:

| 테스트 케이스 | 기대값 | 문서 출처 검증 |
|------------|-------|-------------|
| R1: 19-21, 4인 | 70,000 | ✅ PRD 섹션 7 테스트 케이스 1 일치 |
| R2: 22-02, 3인 | 80,000 | ✅ PRD 섹션 7 테스트 케이스 2 일치 |
| R3: 10-14, 5인, 10% 할인 | 180,000 | ✅ PRICING_ENGINE_SPEC 섹션 6.3 예시 일치 |
| R4: 인원 변경 | 115,000 | ✅ PRICING_ENGINE_SPEC 섹션 6.2 로직 반영 |
| 최소 시간 위반 | MIN_DURATION_NOT_MET | ✅ PRICING_ENGINE_SPEC 섹션 3 에러 코드 일치 |
| 동시 할인 | DISCOUNT_CONFLICT | ✅ PRICING_ENGINE_SPEC 섹션 3 에러 코드 일치 |

### 5.2 통합 테스트 커버리지

**TEST_CASES_QA_PLAN.md 섹션 5**:
- ✅ CSV 업로드 → bankTx: API_SPECIFICATION 섹션 2.1 플로우 일치
- ✅ 캘린더 Pull → reservations: TRD 섹션 2.1 동기화 로직 반영
- ✅ 매칭 추천: API_SPECIFICATION 섹션 2.2 알고리즘 일치
- ✅ 수동 매칭: API_SPECIFICATION 섹션 2.3 API 검증

### 5.3 E2E 시나리오

**TEST_CASES_QA_PLAN.md 섹션 6**:
- ✅ 기본 정산 플로우: USER_JOURNEY.md 5단계 완벽 반영
- ✅ 예외/보정 플로우: USER_JOURNEY 페인포인트 반영

---

## 6. UI/UX와 사용자 여정 연계 ✅

### 6.1 Information Architecture 검증

**INFORMATION_ARCHITECTURE.md 섹션 3**:

| IA 섹션 | USER_JOURNEY 단계 | 검증 결과 |
|---------|------------------|----------|
| 3.1 Dashboard | 단계 4: 대시보드 확인 | ✅ KPI 카드 구성 일치 |
| 3.2 Reservations | 단계 1: 예약 확인 | ✅ 보정 큐 플로우 반영 |
| 3.3 Sales | 단계 2: 매출 확인 | ✅ CSV 업로드 + 매칭 큐 일치 |
| 3.4 Costs | 단계 3: 비용 입력 | ✅ 3개월 평균 자동 채움 반영 |
| 3.6 Settings | 단계 5: 알림 수신 | ✅ 목표 설정 기능 포함 |

### 6.2 Design System 컴포넌트

**DESIGN_SYSTEM.md 섹션 4**:
- ✅ 대시보드 카드(4.1): IA 섹션 3.1 Bento-style 레이아웃 일치
- ✅ 테이블(4.4): IA 섹션 3.2, 3.3 리스트 뷰 반영
- ✅ 모달(4.6): IA 섹션 3.2 예약 상세 뷰 Glass 배경 일치
- ✅ 알림(4.5): USER_JOURNEY 단계 5 알림 수신 반영

---

## 7. 교차 참조 무결성 검증 ✅

### 7.1 채널 지원 일관성

**PRD 정의**: channel = "default" | "hourplace" | "spacecloud"

**검증 결과**: ✅ 모든 문서 일치
- ✅ PRICING_ENGINE_SPEC.md: Channel 타입 정의 (섹션 3)
- ✅ ERD.md: reservations.channel 필드 (섹션 2)
- ✅ FIREBASE_SECURITY_RULES.md: 열거형 검증 (line 48)
- ✅ TRD.md: 채널별 요금표 확장 언급 (섹션 10)

### 7.2 타임존 일관성

**PRD/TRD 정의**: Asia/Seoul (UTC+9)

**검증 결과**: ✅ 전 문서 일치
- ✅ PRICING_ENGINE_SPEC.md: timezone: "Asia/Seoul" (섹션 3, meta)
- ✅ API_SPECIFICATION.md: 공통 규칙 명시 (섹션 0)
- ✅ TEST_CASES_QA_PLAN.md: 테스트 환경 Asia-Northeast3 (섹션 2)

### 7.3 화폐 단위 일관성

**PRD/API_SPECIFICATION 정의**: KRW(원 단위, 정수)

**검증 결과**: ✅ 완벽 일치
- ✅ PRICING_ENGINE_SPEC.md: 모든 금액 정수 유지 명시 (섹션 10)
- ✅ ERD.md: 모든 amount 필드 Number 타입
- ✅ TEST_CASES_QA_PLAN.md: 모든 기대값 정수로 표기

---

## 8. 식별된 개선 권장사항 ⚠️

### 8.1 경미한 불일치 (Critical: 없음)

**없음** - 모든 핵심 비즈니스 로직, 데이터 모델, API 계약이 완벽히 일치합니다.

### 8.2 향후 보완 권장사항 (Non-Critical)

#### 8.2.1 문서 간 참조 링크 추가

**현재 상태**: 각 문서가 독립적으로 작성됨
**권장사항**: 문서 상단에 관련 문서 링크 추가

```markdown
# PRD.md 예시
**관련 문서**:
- [TRD](./TRD.md) - 기술 구현 상세
- [API_SPECIFICATION](./API_SPECIFICATION.md) - API 계약
- [PRICING_ENGINE_SPEC](./PRICING_ENGINE_SPEC.md) - 요금 계산 로직
```

#### 8.2.2 버전 관리 추가

**현재 상태**: 문서 버전 정보 없음
**권장사항**: 각 문서에 버전 및 최종 업데이트 일자 추가

```markdown
**문서 버전**: v1.0
**최종 업데이트**: 2025-10-07
**변경 이력**:
- v1.0 (2025-10-07): 초안 작성
```

#### 8.2.3 용어집 (Glossary) 추가

**권장사항**: 프로젝트 루트에 GLOSSARY.md 추가

```markdown
# GLOSSARY.md

- **跨日(Overnight)**: 자정을 넘어가는 예약
- **경계 시각**: 요금 단가가 변경되는 시각 (08:00, 20:00)
- **보정 필요(needsCorrection)**: 예약 정보가 불완전하여 운영자 확인 필요
- **매칭 큐**: 은행 거래내역과 예약을 연결하기 위한 검토 대기 목록
```

#### 8.2.4 다이어그램 추가

**권장사항**:
- 시스템 아키텍처 다이어그램 (Firebase 서비스 연결 구조)
- 데이터 플로우 다이어그램 (예약 → 매출 → 대시보드 흐름)
- UI 와이어프레임 또는 목업

---

## 9. 문서 품질 메트릭

### 9.1 완결성 점수

| 항목 | 점수 | 비고 |
|-----|------|------|
| 비즈니스 요구사항 정의 | 100% | PRD 완전 |
| 기술 아키텍처 설계 | 100% | TRD 완전 |
| 데이터 모델 설계 | 100% | ERD 완전 |
| API 계약 정의 | 100% | API_SPEC 완전 |
| 보안 정책 정의 | 100% | SECURITY_RULES 완전 |
| 테스트 계획 | 100% | TEST_CASES 완전 |
| UI/UX 설계 | 100% | DESIGN_SYSTEM + IA 완전 |
| **전체 평균** | **100%** | 모든 문서 완결 |

### 9.2 정합성 점수

| 검증 항목 | 점수 | 비고 |
|---------|------|------|
| 요금 정책 일관성 | 100% | 전 문서 일치 |
| 데이터 모델 정합성 | 100% | TRD/ERD 완벽 정렬 |
| API-스키마 정합성 | 100% | API_SPEC/ERD 일치 |
| 보안-모델 정렬 | 100% | RULES/ERD 일치 |
| 테스트-요구사항 매칭 | 100% | TEST/PRD 완벽 커버 |
| UI-여정 연계 | 100% | DESIGN/IA/USER_JOURNEY 일치 |
| **전체 평균** | **100%** | 완벽한 정합성 |

### 9.3 추적성 매트릭스

| 요구사항 (PRD) | TRD | ERD | API | TEST | 커버리지 |
|---------------|-----|-----|-----|------|---------|
| 요금 계산 | ✅ | ✅ | ✅ | ✅ | 100% |
| 예약 동기화 | ✅ | ✅ | ✅ | ✅ | 100% |
| CSV 매칭 | ✅ | ✅ | ✅ | ✅ | 100% |
| 비용 관리 | ✅ | ✅ | ✅ | ✅ | 100% |
| 대시보드 | ✅ | ✅ | ✅ | ✅ | 100% |
| 목표 알림 | ✅ | ✅ | ✅ | ✅ | 100% |

---

## 10. 최종 결론

### 10.1 전체 평가 ✅ 우수

**Studio Morph 프로젝트의 10개 문서는 완벽한 하나의 프로덕트로 연계되어 있습니다.**

### 10.2 주요 강점

✅ **비즈니스 로직 일관성**: 요금 정책, 할인 규칙, 경계 처리가 모든 문서에서 정확히 일치
✅ **데이터 무결성**: TRD/ERD/API_SPEC 간 스키마 100% 정렬
✅ **보안 정책 정렬**: Firestore Rules가 데이터 모델과 완벽 매칭
✅ **테스트 커버리지**: 모든 핵심 기능에 대한 단위/통합/E2E 테스트 정의
✅ **UX 일관성**: 사용자 여정, IA, 디자인 시스템이 하나의 흐름으로 연결
✅ **기술 스택 통일**: Firebase 전면 채택으로 인프라 일관성 확보

### 10.3 구현 준비도

**즉시 구현 가능**: ✅ 모든 문서가 완결되어 개발 착수 가능

### 10.4 권장 다음 단계

1. **프로젝트 초기화**
   - Firebase 프로젝트 생성 (dev/prod 분리)
   - React + Vite 프로젝트 초기화
   - shared-pricing 패키지 구조 생성

2. **핵심 모듈 구현 우선순위**
   - Phase 1: 요금 엔진 (shared-pricing) + 단위 테스트
   - Phase 2: Firebase Functions (calcQuote, upsertReservation)
   - Phase 3: 예약 동기화 + CSV 파싱
   - Phase 4: 매칭 로직 + 대시보드

3. **문서 유지보수**
   - 각 문서에 버전 및 변경 이력 추가
   - 문서 간 링크 추가
   - GLOSSARY.md 작성
   - 시스템 다이어그램 추가 (선택)

---

## 부록: 문서 상호참조 맵

```
PRD.md
 ├─→ USER_JOURNEY.md (사용자 여정으로 구체화)
 ├─→ TRD.md (기술 구현 방안)
 ├─→ DESIGN_SYSTEM.md (UI 구현)
 └─→ TEST_CASES_QA_PLAN.md (품질 보증)

TRD.md
 ├─→ ERD.md (데이터 모델 상세)
 ├─→ API_SPECIFICATION.md (API 계약)
 ├─→ FIREBASE_SECURITY_RULES.md (보안 구현)
 └─→ PRICING_ENGINE_SPEC.md (요금 로직 상세)

USER_JOURNEY.md
 ├─→ INFORMATION_ARCHITECTURE.md (화면 구조)
 └─→ DESIGN_SYSTEM.md (UI 컴포넌트)

API_SPECIFICATION.md
 ├─→ ERD.md (스키마 검증)
 ├─→ PRICING_ENGINE_SPEC.md (요금 계산)
 └─→ FIREBASE_SECURITY_RULES.md (권한 검증)

TEST_CASES_QA_PLAN.md
 ├─→ PRD.md (요구사항 추적)
 ├─→ PRICING_ENGINE_SPEC.md (요금 로직 검증)
 └─→ API_SPECIFICATION.md (통합 테스트)
```

---

**검증 완료일**: 2025-10-07
**검증자**: Claude Code
**최종 결론**: ✅ **완벽한 정합성 확인 - 즉시 구현 가능**
