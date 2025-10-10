# Firebase Setup Guide

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `studio-revenue-manager` 입력
4. Google Analytics 활성화 (선택사항)
5. 프로젝트 생성 완료

## 2. Firebase 서비스 활성화

### 2.1 Authentication 설정
1. Firebase Console > Authentication > 시작하기
2. 로그인 방법 탭
3. 이메일/비밀번호 활성화
4. 저장

### 2.2 Firestore 설정
1. Firebase Console > Firestore Database > 데이터베이스 만들기
2. 프로덕션 모드로 시작
3. 위치 선택: `asia-northeast3` (Seoul)
4. 데이터베이스 만들기

### 2.3 Storage 설정
1. Firebase Console > Storage > 시작하기
2. 프로덕션 모드로 시작
3. 위치 선택: `asia-northeast3` (Seoul)
4. 완료

### 2.4 Hosting 설정
1. Firebase Console > Hosting > 시작하기
2. 설정은 이미 완료됨 (firebase.json)

## 3. Firebase CLI 로그인

```bash
firebase login
```

브라우저에서 Google 계정으로 로그인

## 4. Firebase 프로젝트 연결

```bash
# 현재 디렉토리를 Firebase 프로젝트와 연결
firebase use --add

# studio-revenue-manager 프로젝트 선택
# alias: default 입력
```

## 5. 환경 변수 설정

### 5.1 Firebase 프로젝트 설정 가져오기

1. Firebase Console > 프로젝트 설정 (⚙️)
2. 일반 탭 > 내 앱 섹션
3. 웹 앱 추가 (</>)
4. 앱 닉네임: `Studio Revenue Manager Web`
5. Firebase SDK 구성 복사

### 5.2 .env 파일 생성

```bash
cp .env.example .env
```

`.env` 파일을 열고 Firebase 설정값 입력:
```env
VITE_FIREBASE_API_KEY=실제_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=프로젝트ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=실제_프로젝트ID
VITE_FIREBASE_STORAGE_BUCKET=프로젝트ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=실제_SENDER_ID
VITE_FIREBASE_APP_ID=실제_APP_ID
```

### 5.3 Admin SDK 서비스 계정 생성

1. Firebase Console > 프로젝트 설정 > 서비스 계정
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드
4. `functions/serviceAccountKey.json`으로 저장 (⚠️ .gitignore에 포함됨)

## 6. Functions 의존성 설치

```bash
cd functions
npm install
cd ..
```

## 7. Firebase 배포

### 7.1 보안 규칙 배포
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### 7.2 Firestore 인덱스 배포
```bash
firebase deploy --only firestore:indexes
```

### 7.3 Functions 배포
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 7.4 Hosting 배포
```bash
# 프론트엔드 빌드
cd packages/frontend
npm run build
cd ../..

# Hosting 배포
firebase deploy --only hosting
```

### 7.5 전체 배포
```bash
firebase deploy
```

## 8. 로컬 개발 환경

### 8.1 Emulator Suite 설치
```bash
firebase init emulators
```

선택할 에뮬레이터:
- Authentication Emulator
- Firestore Emulator
- Functions Emulator
- Hosting Emulator
- Storage Emulator

### 8.2 Emulator 실행
```bash
firebase emulators:start
```

Emulator UI: http://localhost:4000

### 8.3 프론트엔드 개발 서버
```bash
cd packages/frontend
npm run dev
```

Frontend: http://localhost:5173

## 9. CI/CD GitHub Actions 설정

### 9.1 Firebase 토큰 생성
```bash
firebase login:ci
```

토큰 복사

### 9.2 GitHub Secrets 추가

Repository > Settings > Secrets and variables > Actions

추가할 Secrets:
- `FIREBASE_TOKEN_DEV`: 개발 환경 토큰
- `FIREBASE_TOKEN_STAGING`: 스테이징 환경 토큰
- `FIREBASE_TOKEN_PROD`: 프로덕션 환경 토큰

⚠️ **보안**: 각 환경별로 별도의 Firebase 프로젝트를 권장합니다.

## 10. 다중 환경 설정 (선택사항)

### 10.1 환경별 프로젝트 생성
```bash
# 개발 환경
firebase use --add
# studio-revenue-manager-dev 선택
# alias: development

# 스테이징 환경
firebase use --add
# studio-revenue-manager-staging 선택
# alias: staging

# 프로덕션 환경
firebase use --add
# studio-revenue-manager 선택
# alias: production
```

### 10.2 환경 전환
```bash
firebase use development  # 개발
firebase use staging      # 스테이징
firebase use production   # 프로덕션
```

## 11. 모니터링 및 로그

### 11.1 Functions 로그
```bash
firebase functions:log
```

### 11.2 Firebase Console 모니터링
- Performance Monitoring
- Crashlytics
- Analytics

## 12. 비용 관리

### Spark 플랜 (무료)
- Firestore: 1GB 저장소, 50K 읽기/20K 쓰기/일
- Functions: 125K 호출/월, 40K GB-초/월
- Hosting: 10GB 저장소, 360MB/일 전송
- Storage: 5GB 저장소, 1GB/일 다운로드

### Blaze 플랜 (종량제)
- 무료 한도 초과 시 과금
- 예산 알림 설정 권장

## 13. 문제 해결

### 배포 실패
```bash
# Firebase CLI 업데이트
npm install -g firebase-tools

# 로그인 재시도
firebase logout
firebase login

# 프로젝트 재연결
firebase use --add
```

### Emulator 포트 충돌
```bash
# firebase.json에서 포트 변경
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "hosting": { "port": 5000 },
    "storage": { "port": 9199 }
  }
}
```

## 다음 단계

✅ Phase 1 완료
- [ ] Phase 2: Firestore 데이터 모델 설계 및 마이그레이션
- [ ] Phase 3: Firebase Functions 백엔드 구현
- [ ] Phase 4: CI/CD 파이프라인 구축
- [ ] Phase 5: 프론트엔드 Firebase SDK 통합
- [ ] Phase 6: 모니터링 및 문서화
