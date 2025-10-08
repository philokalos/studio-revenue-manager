#!/bin/bash

# GitHub Issues 자동 생성 스크립트
# 사용법: ./create-issues.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Studio Morph GitHub Issues 생성 시작${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI 인증 필요${NC}"
    gh auth login
fi

# Create milestones
echo -e "${YELLOW}Creating Milestones...${NC}"
gh api repos/:owner/:repo/milestones -f title="Milestone 1: Foundation" -f description="Week 1 - 프로젝트 기반 구축" -f state="open" || echo "Milestone already exists"
gh api repos/:owner/:repo/milestones -f title="Milestone 2: Core Features" -f description="Week 2-3 - 핵심 기능 개발" -f state="open" || echo "Milestone already exists"
gh api repos/:owner/:repo/milestones -f title="Milestone 3: Integration" -f description="Week 4-5 - 통합 및 고급 기능" -f state="open" || echo "Milestone already exists"
gh api repos/:owner/:repo/milestones -f title="Milestone 4: Testing & Polish" -f description="Week 6-7 - 테스트 및 완성도" -f state="open" || echo "Milestone already exists"

echo ""
echo -e "${YELLOW}Creating Issues...${NC}"

# Milestone 1: Foundation (9 Issues)

# Issue #1
echo "Creating Issue #1..."
gh issue create --title "[Infrastructure] 프로젝트 초기 설정" \
  --body "$(cat .github/issue-templates/issue-01.md)" \
  --label "setup,infrastructure,P0" \
  --milestone "Milestone 1: Foundation"

# Issue #2
echo "Creating Issue #2..."
gh issue create --title "[Shared] 공용 요금 엔진 패키지 구조" \
  --body "## Description
\`packages/shared-pricing\` TypeScript 패키지 생성 및 타입 정의

## Tasks
- [ ] 패키지 디렉토리 생성
- [ ] package.json + tsconfig.json 설정
- [ ] types.ts (QuoteInput, QuoteResult, PricingRule 등)
- [ ] 빌드 스크립트 설정
- [ ] ESLint + TypeScript 검증

## Acceptance Criteria
- \`npm run build\` 성공
- 타입 정의가 다른 패키지에서 import 가능
- 타입 오류 0개

## Dependencies
Depends on #1

## Priority
**P0 (Critical Path)**

## Estimate
**3 hours**" \
  --label "shared,typescript,P0" \
  --milestone "Milestone 1: Foundation"

# Issue #3
echo "Creating Issue #3..."
gh issue create --title "[Shared] 요금 계산 로직 구현" \
  --body "## Description
30분 슬라이싱 기반 요금 계산 핵심 로직 (PRICING_ENGINE_SPEC.md 기반)

## Tasks
- [ ] segmentation.ts (시간 구간 분할)
- [ ] pricing.ts (computeQuote 함수)
- [ ] discount.ts (할인 적용)
- [ ] validation.ts (입력 검증)
- [ ] 단위 테스트 8개 케이스 작성

## Test Cases (TEST_CASES_QA_PLAN.md)
- [ ] R1: 19-21시 4인 = 70,000원
- [ ] R2: 22-02시 3인 = 80,000원
- [ ] R4: 인원 변경 = 115,000원
- [ ] 비율 할인 10% = 180,000원
- [ ] 금액 할인 15,000원 = 185,000원
- [ ] 최소 2시간 위반 → 에러
- [ ] 동시 할인 → 에러
- [ ] 채널별 요금 오버라이드

## Acceptance Criteria
- 모든 테스트 케이스 통과
- 테스트 커버리지 ≥90%
- 정수 계산 (소수점 없음)

## Dependencies
Depends on #2

## Priority
**P0 (Critical Path)**

## Estimate
**8 hours**" \
  --label "shared,business-logic,P0" \
  --milestone "Milestone 1: Foundation"

# Issue #4
echo "Creating Issue #4..."
gh issue create --title "[Backend] PostgreSQL 스키마 설계" \
  --body "## Description
ERD.md 기반 데이터베이스 마이그레이션 스크립트 작성

## Tasks
- [ ] 마이그레이션 파일 생성 (001_initial.sql)
- [ ] 테이블: reservations, invoices, bank_tx, costs, goals, summaries
- [ ] 인덱스: created_at, status, date 필드
- [ ] 외래키 제약조건 설정
- [ ] 마이그레이션 실행 스크립트

## Acceptance Criteria
- \`npm run db:migrate\` 성공
- 모든 테이블 생성 확인
- ERD.md와 100% 일치
- 인덱스 성능 검증

## Dependencies
None (병렬 가능)

## Priority
**P0 (Can Run Parallel)**

## Estimate
**4 hours**" \
  --label "backend,database,P0" \
  --milestone "Milestone 1: Foundation"

# Issue #5
echo "Creating Issue #5..."
gh issue create --title "[Backend] 백엔드 기본 구조 설정" \
  --body "## Description
Express 서버 + 라우팅 + 미들웨어 설정

## Tasks
- [ ] src/index.ts (Express 앱 초기화)
- [ ] src/routes/ (라우터 구조)
- [ ] src/middleware/ (에러 핸들링, 로깅)
- [ ] src/db/ (PostgreSQL 연결 풀)
- [ ] Health check 엔드포인트

## Acceptance Criteria
- 서버 시작 성공 (PORT 3000)
- Health check 엔드포인트 응답
- 에러 핸들러 동작 확인
- 로깅 설정 완료

## Dependencies
Depends on #1

## Priority
**P0 (Can Run Parallel)**

## Estimate
**3 hours**" \
  --label "backend,setup,P0" \
  --milestone "Milestone 1: Foundation"

# Issue #6
echo "Creating Issue #6..."
gh issue create --title "[Backend] 시드 데이터 생성" \
  --body "## Description
테스트용 예약/거래 샘플 데이터 (TEST_CASES_QA_PLAN.md 기반)

## Tasks
- [ ] src/db/seed.ts 작성
- [ ] 예약 데이터 4건 (R1-R4)
- [ ] 거래 데이터 4건 (T1-T4)
- [ ] 비용/목표 샘플 데이터
- [ ] 시드 실행 스크립트

## Acceptance Criteria
- \`npm run db:seed\` 성공
- 데이터 조회 가능
- TEST_CASES_QA_PLAN.md 픽스처와 일치

## Dependencies
Depends on #4

## Priority
**P1**

## Estimate
**2 hours**" \
  --label "backend,database,P1" \
  --milestone "Milestone 1: Foundation"

# Issue #7
echo "Creating Issue #7..."
gh issue create --title "[Frontend] React 프로젝트 구조 설정" \
  --body "## Description
Vite + React Router + 기본 레이아웃 구조

## Tasks
- [ ] src/main.tsx (앱 진입점)
- [ ] src/App.tsx (라우터 설정)
- [ ] src/layouts/ (Header, Sidebar, MainLayout)
- [ ] src/pages/ (페이지 컴포넌트 스켈레톤)
- [ ] 라우팅 경로 설정

## Acceptance Criteria
- 개발 서버 시작 (\`npm run dev\`)
- 라우팅 동작 확인 (/, /reservations, /sales, /dashboard)
- 레이아웃 컴포넌트 렌더링
- INFORMATION_ARCHITECTURE.md 구조 반영

## Dependencies
Depends on #1

## Priority
**P0 (Can Run Parallel)**

## Estimate
**3 hours**" \
  --label "frontend,setup,P0" \
  --milestone "Milestone 1: Foundation"

# Issue #8
echo "Creating Issue #8..."
gh issue create --title "[Frontend] 디자인 시스템 토큰" \
  --body "## Description
색상, 타이포그래피, 스페이싱 CSS 변수 정의 (DESIGN_SYSTEM.md 기반)

## Tasks
- [ ] src/styles/tokens.css (CSS 커스텀 프로퍼티)
- [ ] 색상: Primary Indigo 600, Success Green 500, Warning Amber 500, Error Red 500
- [ ] 타이포그래피: Noto Sans KR (18-24px Heading, 14-16px Body)
- [ ] 스페이싱: 4px 기준 (8, 12, 16, 24, 32, 48)
- [ ] 그림자/테두리 토큰

## Acceptance Criteria
- DESIGN_SYSTEM.md 스펙 100% 구현
- 모든 컴포넌트에서 토큰 사용 가능
- 다크모드 대비 (향후 확장 가능)

## Dependencies
None (병렬 가능)

## Priority
**P1**

## Estimate
**2 hours**" \
  --label "frontend,design,P1" \
  --milestone "Milestone 1: Foundation"

# Issue #9
echo "Creating Issue #9..."
gh issue create --title "[Frontend] API 클라이언트 유틸리티" \
  --body "## Description
백엔드 API 호출 공통 함수 (fetch wrapper)

## Tasks
- [ ] src/lib/api.ts (fetch 래퍼)
- [ ] 에러 핸들링 (네트워크, 4xx, 5xx)
- [ ] 타입 안전성 (Zod 스키마)
- [ ] 목(mock) 데이터 모드 (백엔드 대기 시)
- [ ] 토스트 알림 통합

## Acceptance Criteria
- API 호출 함수 작성
- 에러 토스트 표시
- 목 데이터로 개발 가능
- TypeScript 타입 안전성 100%

## Dependencies
None (병렬 가능)

## Priority
**P1**

## Estimate
**3 hours**" \
  --label "frontend,infrastructure,P1" \
  --milestone "Milestone 1: Foundation"

echo ""
echo -e "${GREEN}✅ Milestone 1 Issues 생성 완료 (9개)${NC}"
echo ""
echo -e "${YELLOW}Note: Milestone 2-4 Issues는 필요 시 수동으로 생성하거나${NC}"
echo -e "${YELLOW}이 스크립트를 확장하여 추가할 수 있습니다.${NC}"
echo ""
echo -e "${GREEN}GitHub Projects 보드에서 확인하세요:${NC}"
echo "https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/issues"
