#!/bin/bash

# GitHub Issues 생성 스크립트
# Firebase/Firestore 백엔드 전환 + CI/CD 구축

echo "🔥 Creating GitHub Issues for Firebase Migration + CI/CD Setup"
echo ""

# Issue 1
gh issue create \
  --title "🔥 [Phase 1] Firebase 프로젝트 설정 및 초기화" \
  --label "firebase,setup,phase-1" \
  --body "## 목표
Firebase 프로젝트를 생성하고 기본 설정을 완료합니다.

## 작업 체크리스트
- [ ] Firebase Console에서 새 프로젝트 생성
- [ ] Firebase SDK 설치
- [ ] Firebase 초기화 (Firestore, Functions, Hosting, Storage)
- [ ] 환경 설정 파일 작성
- [ ] Admin SDK 설정

## 예상 시간: 2-3시간"

echo "✅ Issue 1 created"

# Issue 2
gh issue create \
  --title "📊 [Phase 2] Firestore 데이터 모델 설계 및 마이그레이션" \
  --label "firestore,database,phase-2" \
  --body "## 목표
PostgreSQL 스키마를 Firestore 컬렉션 구조로 전환합니다.

## 작업 체크리스트
- [ ] Firestore 컬렉션 설계 (7개 컬렉션)
- [ ] Security Rules 작성
- [ ] Composite Indexes 설정
- [ ] 데이터 마이그레이션 스크립트 작성

## 예상 시간: 4-5시간
## 의존성: Issue #1"

echo "✅ Issue 2 created"

# Issue 3
gh issue create \
  --title "⚡ [Phase 3] Firebase Functions 백엔드 구현" \
  --label "functions,backend,phase-3" \
  --body "## 목표
Express.js API를 Firebase Functions로 전환합니다.

## 작업 체크리스트
- [ ] Functions 프로젝트 구조 생성
- [ ] Authentication Functions (3개)
- [ ] CRUD Functions (20개)
- [ ] Scheduled Functions (2개)
- [ ] Firestore Triggers (3개)

## 예상 시간: 6-8시간
## 의존성: Issue #1, #2"

echo "✅ Issue 3 created"

# Issue 4
gh issue create \
  --title "🚀 [Phase 4] CI/CD 파이프라인 구축" \
  --label "ci-cd,deployment,phase-4" \
  --body "## 목표
GitHub Actions 자동 배포 파이프라인 구축

## 작업 체크리스트
- [ ] Development 환경 자동 배포
- [ ] Staging 환경 자동 배포
- [ ] Production 환경 배포 (Manual approval)
- [ ] 테스트 자동화 Workflow
- [ ] Rollback Workflow

## 예상 시간: 4-5시간
## 의존성: Issue #1, #3"

echo "✅ Issue 4 created"

# Issue 5
gh issue create \
  --title "🎨 [Phase 5] 프론트엔드 Firebase SDK 통합" \
  --label "frontend,integration,phase-5" \
  --body "## 목표
React 프론트엔드 Firebase SDK 통합

## 작업 체크리스트
- [ ] Firebase SDK 설치 및 초기화
- [ ] Firebase Authentication 통합
- [ ] Firestore 실시간 데이터 Hooks
- [ ] Firebase Functions 호출
- [ ] Firebase Storage 파일 업로드
- [ ] Offline Support

## 예상 시간: 5-6시간
## 의존성: Issue #1, #3"

echo "✅ Issue 5 created"

# Issue 6
gh issue create \
  --title "📊 [Phase 6] 모니터링 및 문서화" \
  --label "monitoring,documentation,phase-6" \
  --body "## 목표
Firebase 모니터링 설정 및 문서화

## 작업 체크리스트
- [ ] Firebase Analytics 설정
- [ ] Performance Monitoring
- [ ] Error Tracking
- [ ] 마이그레이션 문서 작성
- [ ] 운영 가이드 작성

## 예상 시간: 3-4시간
## 의존성: Issue #1, #5"

echo "✅ Issue 6 created"

echo ""
echo "🎉 Successfully created 6 GitHub Issues!"
echo "📋 View: gh issue list"
