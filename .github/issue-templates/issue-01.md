## Description
Git 저장소 초기화, 환경변수 템플릿, CI/CD 기본 설정

프로젝트 개발의 기반이 되는 버전 관리 시스템과 개발 환경을 구축합니다.

## Tasks
- [ ] Git 초기화 + .gitignore 생성
- [ ] .env.example 작성 (DB, API 키)
- [ ] GitHub Actions 워크플로우 (lint, test)
- [ ] README.md 업데이트 (개발 가이드)
- [ ] package.json scripts 검증

## Acceptance Criteria
- ✅ Git 커밋 가능
- ✅ 환경변수 템플릿 문서화 완료
- ✅ CI가 PR에서 자동 실행
- ✅ README에 빌드/테스트 명령어 포함
- ✅ 로컬 개발 환경 설정 가능

## Dependencies
None (첫 번째 작업)

## Priority
**P0 (Critical Path)** - 모든 후속 작업의 선행 조건

## Estimate
**4 hours**

## Labels
`setup`, `infrastructure`, `P0`

## Milestone
Foundation (Week 1)

## Definition of Done
- 모든 Tasks 체크 완료
- PR 리뷰 통과
- CI/CD 그린 체크
- 다른 개발자가 README만으로 환경 설정 가능
