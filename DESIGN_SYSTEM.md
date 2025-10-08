# 🎨 Design System: Studio Morph 매출·수익 관리 서비스 (MVP Lite, 2025 트렌드 반영)

본 문서는 Studio Morph 서비스(MVP Lite)의 일관된 UX/UI 구현을 위한 Design System 문서이다. PRD, TRD, ERD, 사용자 여정 문서를 기반으로 작성되었으며, 2025년 최신 디자인 트렌드를 반영하였다.

---

## 1. 디자인 원칙

* **단순성 (Simplicity)**: 1인 운영자가 빠르게 이해하고 사용할 수 있도록 복잡한 UI를 최소화.
* **일관성 (Consistency)**: 컴포넌트, 색상, 타이포그래피 일관 유지.
* **가시성 (Clarity)**: 매출/비용/순이익 같은 핵심 지표를 한눈에 확인 가능.
* **보정 중심 (Correction-first)**: 자동화보다 운영자가 쉽게 보정할 수 있는 UI 제공.
* **트렌드 반영 (Trendy yet Practical)**: 2025년 모션·3D·블러·Bento Layout 등을 반영하여 최신 감각 제공.

---

## 2. 색상 시스템

* **Primary**: Indigo 600 (#4F46E5) → 버튼, 주요 강조색
* **Secondary**: Gray 700 (#374151) → 텍스트, 보조 UI
* **Success**: Green 500 (#10B981) → 목표 달성, 성공 상태
* **Warning**: Amber 500 (#F59E0B) → 경고 메시지, 예약률 저하
* **Error**: Red 500 (#EF4444) → 오류, 매칭 실패 상태
* **Background**: White (#FFFFFF), Gray 100 (#F3F4F6)
* **Accent Glow (2025)**: Bright Blue / Purple Gradient (#6366F1 → #A855F7) → 인터랙션 강조, 최신 트렌드 반영
* **Glass Background (2025)**: rgba(255,255,255,0.6) + blur → 모달/오버레이 배경

---

## 3. 타이포그래피

* **Primary Font**: Noto Sans KR (한국어 최적화)
* **Heading**: Bold, 18–24px → 대시보드 카드 제목, 섹션 타이틀
* **Body**: Regular, 14–16px → 리스트, 입력폼
* **Label/Meta**: Medium, 12px → 상태 표시, 작은 레이블
* **Decorative Headline (2025)**: 제한적으로 개성 있는 폰트 사용 (예: 룩북 통계/특별 강조 구간)
* **숫자 애니메이션**: 매출·순이익 값은 부드럽게 카운팅 애니메이션 적용

---

## 4. 컴포넌트

### 4.1 카드(Card)

* **대시보드 카드**: 매출, 비용, 순이익, 예약률 표시
* **디자인**: Glassmorphism 배경 (투명+블러), 그림자(shadow-sm), 아이콘 + 값 표시
* **애니메이션**: 카드 등장 시 fade-in + 살짝 scale-up

### 4.2 버튼(Button)

* **Primary Button**: Indigo 600 → hover 시 Gradient Glow 효과
* **Secondary Button**: Gray 200 배경, Gray 800 텍스트
* **Destructive Button**: Red 500 배경, White 텍스트
* **Micro Interaction (2025)**: 클릭 시 ripple/press 효과

### 4.3 입력폼(Form)

* **Input 필드**: border-gray-300, rounded-lg, focus:ring-indigo-500
* **Hover 시 subtle shadow, focus 시 glow 효과**
* **Error 상태**: border-red-500, helper text 표시

### 4.4 테이블(Table)

* **예약 리스트, 거래내역 매칭 대기 큐에 사용**
* **컬럼**: 날짜, 예약자명, 인원, 금액, 상태
* **상태별 색상 태그** (MATCHED=Green, PENDING=Amber)
* **Row hover 시 background fade-in 효과 추가**

### 4.5 알림(Alert)

* **토스트/배너 형태**
* **색상코드**: Success=Green, Warning=Amber, Error=Red
* **Fade-in/out 전환 효과, 아이콘 흔들림 애니메이션 소규모 적용**

### 4.6 모달(Modal)

* **Glassmorphism 배경 + blur 처리**
* **열림/닫힘 시 scale-up/down 애니메이션**

---

## 5. 레이아웃

* **내비게이션 바**: 상단 고정, 좌측 로고(Studio Morph), 우측 사용자 계정
* **대시보드**: Bento-style 2x2 카드 레이아웃 (매출, 비용, 순이익, 예약률)
* **리스트 뷰**: 예약/매칭/비용 관리 → 테이블 뷰
* **입력 페이지**: 비용 입력, 목표 설정 → 폼 기반
* **반응형**: 모바일에서 카드가 세로 스택으로 전환

---

## 6. 아이콘 시스템

* **Heroicons (Tailwind 아이콘)**
  * 매출: CurrencyDollar
  * 비용: CreditCard
  * 순이익: TrendingUp
  * 예약률: Calendar
  * 알림: Bell, ExclamationTriangle
* **3D 스타일 아이콘 (2025)**: 중요 섹션(대시보드)에는 약간의 입체감/그라디언트 적용

---

## 7. 상태 및 피드백

* **예약 상태**: Confirmed(Indigo), Cancelled(Gray)
* **매칭 상태**: Matched(Green), Pending(Amber), Unmatched(Red)
* **보정 필요**: 빨간 점 표시 + Tooltip ("연락처 누락")
* **로딩**: Spinner + Skeleton UI (뼈대 로딩, 최신 UX 패턴)
* **인터랙션 피드백**: 버튼/카드 hover 시 micro-motion 애니메이션

---

## 8. 접근성

* **WCAG 2.1 AA 준수 목표**
* **색상 대비 비율 4.5:1 이상**
* **키보드 네비게이션 지원** (Tab, Enter, Space)
* **스크린 리더 라벨 제공** (예약자명, 금액 등)
* **색약 모드 대비**: 고대비 테마 옵션 제공

---

## 9. 샘플 화면 구성

* **대시보드**: 2x2 Bento-style 카드, Glass 배경, 숫자 애니메이션
* **예약 리스트**: hover 애니메이션 포함된 테이블
* **매칭 큐**: 좌측 거래내역, 우측 예약 추천 → 드래그앤드롭 매칭 인터랙션 고려
* **비용 입력**: 모달 폼, glass effect 배경

---

## 10. 향후 확장 (Design)

* **다크모드** (배경 Gray 900, 텍스트 Gray 100, 카드 Glass effect)
* **인터랙티브 데이터 시각화** (Recharts + 애니메이션)
* **PDF 리포트용 전용 레이아웃**
* **AI 기반 UI 개인화** (예약 패턴 기반 대시보드 위젯 재배치)
