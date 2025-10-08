# 🗂 Information Architecture: Studio Morph 매출·수익 관리 서비스 (MVP Lite, 2025 트렌드 반영)

본 문서는 Studio Morph 서비스(MVP Lite)의 Information Architecture (IA) 문서로, PRD, TRD, ERD, Design System, 사용자 여정 기반으로 작성되었으며 2025년 최신 디자인 트렌드를 반영했다.

---

## 1. IA 원칙

* **단순성**: 1인 운영자가 직관적으로 사용할 수 있도록 구조 최소화
* **일관성**: 예약 → 매출 → 비용 → 대시보드 → 알림 흐름 유지
* **가시성**: 주요 지표(매출, 비용, 순이익, 예약률)를 상위 레벨에서 확인 가능
* **유연성**: 수동 보정이 가능하도록 "검토 대기" 큐 구조 포함
* **최신 트렌드 반영**: Bento-style 레이아웃, Glassmorphism 오버레이, Micro-interaction 고려

---

## 2. 글로벌 구조 (탑 레벨 네비게이션)

* **Dashboard** (대시보드)
* **Reservations** (예약 관리)
* **Sales** (매출 관리)
* **Costs** (비용 관리)
* **Reports** (요약/리포트)
* **Settings** (설정)

---

## 3. 상세 IA 흐름

### 3.1 Dashboard

* 오늘/이번달 매출, 비용, 순이익, 예약률 카드 (Bento-style grid)
* 월 목표 대비 게이지
* 알림 배너 (목표 달성/미달)
* 최신 예약/매출 요약 리스트

### 3.2 Reservations (예약 관리)

#### 예약 리스트 뷰 (Table)
* 날짜, 예약자명, 인원, 시간, 상태
* 상태 태그: Confirmed, Cancelled, Needs Correction

#### 예약 상세 뷰 (Modal/Glass 배경)
* 예약자 메타데이터 (입금자명, 연락처, 인원, 주차, 촬영 목적)
* 요금 자동 계산 결과
* 수정/보정 기능

#### 검토 대기 큐 (Needs Correction)
* 연락처 누락, 잘못된 시간 입력 등 오류 예약

### 3.3 Sales (매출 관리)

#### 은행 거래내역 업로드 (CSV)
* 업로드 → 파싱 결과 리스트

#### 매칭 큐 (Pending Review)
* 은행 거래 vs 예약 건 추천 매칭 UI
* Drag & Drop 또는 선택 매칭

#### 매출 상세 뷰
* 예약 연결 여부, 금액, 할인 기록

### 3.4 Costs (비용 관리)

#### 월별 비용 입력 폼
* **고정비**: 임대료, 전기/수도세
* **변동비**: 광고비(월 총액), 소모품, 장비 유지보수
* 최근 3개월 평균값 자동 제안 → 운영자 수정 가능

### 3.5 Reports (요약/리포트)

* 월간 요약: 매출/비용/순이익/예약률
* 트렌드 뷰 (최근 3개월)
* 다운로드 (CSV 내보내기)
* PDF 출력은 후순위 (로드맵)

### 3.6 Settings (설정)

* 월 매출 목표 입력/수정
* 알림 채널 관리 (이메일)
* 요금 정책 (주간/야간 단가, 인원 요금) 확인
* 계정 관리 (운영자 1인 한정)

---

## 4. 최신 트렌드 반영 포인트

* **Bento-style Layout**: 대시보드 카드를 모듈형 배치 (반응형 → 모바일에서 세로 스택)
* **Glassmorphism**: 모달, 오버레이, 대시보드 카드에 투명+블러 효과 적용
* **Micro Animation**: 카드 hover 시 scale-up, 버튼 클릭 시 ripple 효과
* **Skeleton UI**: 데이터 로딩 시 뼈대 화면 표시
* **Adaptive Grid**: 예약 리스트, 매칭 큐가 화면 크기에 따라 자동 정렬
* **3D 아이콘/Gradient Glow**: 주요 카드와 버튼에 시각적 깊이감 추가

---

## 5. 정보 계층 구조 다이어그램 (텍스트)

```
Global Nav
 ├── Dashboard
 │    ├── KPI Cards (매출/비용/순이익/예약률)
 │    ├── Monthly Goal Gauge
 │    └── Alerts
 │
 ├── Reservations
 │    ├── Reservation List
 │    ├── Reservation Detail
 │    └── Correction Queue
 │
 ├── Sales
 │    ├── BankTx Upload
 │    ├── Matching Queue
 │    └── Sales Detail
 │
 ├── Costs
 │    └── Monthly Cost Form
 │
 ├── Reports
 │    ├── Monthly Summary
 │    └── Export CSV (PDF later)
 │
 └── Settings
      ├── Revenue Goal
      ├── Notification Settings
      ├── Pricing Rules
      └── Account
```

---

## 6. 향후 확장

* 멀티 테넌트 구조 반영 (다중 스튜디오)
* 광고비 ROI 상세 분석 (채널 단위)
* 시즌별 매출 트렌드 시각화
* PDF 리포트, 세무사 제출용 포맷
* 알림 범위 확장 (비용 초과, 예약률 급감)
