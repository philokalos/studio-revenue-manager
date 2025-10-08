# Studio Morph 매출 관리 시스템

Studio Morph의 예약, 매출, 비용, 목표를 통합 관리하는 웹 서비스입니다.

## 📋 프로젝트 개요

- **목적**: 연습실 운영 매출 관리 효율화
- **주요 기능**: 예약 관리, 요금 계산, 매출 추적, 대시보드
- **기술 스택**: React 18 + Express + PostgreSQL + TypeScript
- **아키텍처**: Monorepo (npm workspaces)

## 🏗️ 프로젝트 구조

```
studio-revenue-manager/
├── packages/
│   ├── backend/          # Express API 서버
│   ├── frontend/         # React 웹 애플리케이션
│   └── shared-pricing/   # 공용 요금 계산 엔진
├── .github/
│   ├── workflows/        # CI/CD 워크플로우
│   └── issue-templates/  # Issue 템플릿
├── docs/                 # 설계 문서 (PRD, TRD, ERD 등)
└── ROADMAP.md           # 개발 로드맵
```

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18.x 이상
- PostgreSQL 14 이상
- npm 9.x 이상

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/philokalos/studio-revenue-manager.git
cd studio-revenue-manager

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 데이터베이스 URL 등 설정

# 4. 데이터베이스 마이그레이션
npm run db:migrate

# 5. 시드 데이터 삽입 (선택)
npm run db:seed

# 6. 개발 서버 실행
npm run dev
```

개발 서버가 실행되면:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173

## 📦 주요 명령어

### 전체 프로젝트

```bash
npm run dev           # 백엔드 + 프론트엔드 동시 실행
npm run build         # 전체 프로젝트 빌드
npm test              # 전체 테스트 실행
```

### 백엔드

```bash
npm run dev:backend      # 백엔드 개발 서버 (nodemon)
npm run build:backend    # 백엔드 빌드
npm run test:backend     # 백엔드 테스트
npm run db:migrate       # DB 마이그레이션 실행
npm run db:seed          # 시드 데이터 삽입
```

### 프론트엔드

```bash
npm run dev:frontend     # 프론트엔드 개발 서버 (Vite)
npm run build:frontend   # 프론트엔드 빌드
npm run test:frontend    # 프론트엔드 테스트
```

### 코드 품질

```bash
npm run lint             # ESLint 실행
npm run type-check       # TypeScript 타입 체크
```

## 🧪 테스트

```bash
# 전체 테스트
npm test

# 단위 테스트만
npm run test:unit

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e

# 커버리지 포함 테스트
npm run test:coverage
```

**테스트 커버리지 목표**:
- Unit: ≥90% (특히 pricing engine)
- Integration: ≥80%
- E2E: 주요 사용자 플로우 100%

## 📖 설계 문서

프로젝트 설계 문서는 다음 파일들에서 확인할 수 있습니다:

- **[PRD.md](docs/PRD.md)** - 제품 요구사항 정의서
- **[TRD.md](docs/TRD.md)** - 기술 요구사항 정의서
- **[ERD.md](docs/ERD.md)** - 데이터베이스 스키마
- **[API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** - API 명세서
- **[PRICING_ENGINE_SPEC.md](docs/PRICING_ENGINE_SPEC.md)** - 요금 계산 엔진 상세 스펙
- **[TEST_CASES_QA_PLAN.md](docs/TEST_CASES_QA_PLAN.md)** - 테스트 케이스 및 QA 계획
- **[DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - 디자인 시스템
- **[INFORMATION_ARCHITECTURE.md](docs/INFORMATION_ARCHITECTURE.md)** - 정보 구조
- **[USER_JOURNEY.md](docs/USER_JOURNEY.md)** - 사용자 시나리오

## 🗺️ 개발 로드맵

상세한 개발 로드맵 및 이슈 목록은 [ROADMAP.md](ROADMAP.md)를 참조하세요.

**현재 진행 상황**:
- ✅ Milestone 1: Foundation (Week 1)
- 🔄 Milestone 2: Core Features (Week 2-3)
- ⏳ Milestone 3: Integration (Week 4-5)
- ⏳ Milestone 4: Testing & Polish (Week 6-7)

## 🔑 핵심 기능

### 1. 요금 계산 엔진
- 30분 단위 시간 슬라이싱
- DAY/NIGHT 시간대별 요금 차등
- 인원 변경 대응
- 할인 적용 (비율/금액)

### 2. 예약 관리
- Google Calendar 연동 자동 동기화
- 수동 예약 생성/수정/삭제
- 요금 보정 및 메모 관리

### 3. 매출 관리
- 은행 거래 내역 CSV 업로드
- 자동 매칭 (시간/금액 기반)
- 수동 매칭 및 매칭 해제
- 미수/환불 처리

### 4. 비용 및 목표 관리
- 월별 비용 입력 (고정비/변동비)
- 월별 매출 목표 설정
- 달성률 추적

### 5. 대시보드
- 일/주/월별 매출 통계
- 비용 대비 수익 분석
- 목표 달성률 시각화

## 🛡️ 보안

- 환경변수로 민감 정보 관리
- PostgreSQL 파라미터화된 쿼리 (SQL Injection 방지)
- CORS 설정 (프론트엔드만 허용)
- 입력 검증 (Zod 스키마)

## 📄 라이선스

MIT License

## 👥 기여자

- **philokalos** - Initial work

## 📞 문의

프로젝트 관련 문의사항은 [GitHub Issues](https://github.com/philokalos/studio-revenue-manager/issues)에 등록해주세요.
