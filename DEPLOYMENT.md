# 배포 가이드

## 자동 배포 (GitHub Actions)

main 브랜치에 푸시하면 자동으로 배포됩니다.

### 필요한 환경 변수 설정

GitHub Repository Settings > Secrets and variables > Actions에서 다음 secrets를 설정하세요:

#### Vercel (Frontend)
- `VERCEL_TOKEN`: Vercel 토큰 ([vercel.com/account/tokens](https://vercel.com/account/tokens))
- `VERCEL_ORG_ID`: Vercel 조직 ID
- `VERCEL_PROJECT_ID`: Vercel 프로젝트 ID

#### Backend (선택)
- Railway, Render, AWS 등 사용하는 플랫폼의 credentials

## 수동 배포

### Frontend (Vercel)

```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 디렉토리에서
cd packages/frontend
vercel --prod
```

### Backend

#### Option 1: Railway

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 배포
cd packages/backend
railway up
```

#### Option 2: Render

1. [render.com](https://render.com)에서 새 Web Service 생성
2. GitHub 저장소 연결
3. Build Command: `cd packages/backend && npm install && npm run build`
4. Start Command: `cd packages/backend && npm start`

#### Option 3: AWS/Azure/GCP

각 플랫폼의 배포 가이드를 참조하세요.

## 환경 변수

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env.production)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=your-database-url
```

## 데이터베이스

프로덕션 데이터베이스를 설정하고 마이그레이션을 실행하세요:

```bash
npm run db:migrate
```

## 모니터링

- Frontend: Vercel Analytics
- Backend: 선택한 플랫폼의 모니터링 도구
- Errors: Sentry 등 에러 추적 도구 권장

## 롤백

문제 발생 시 이전 배포로 롤백:

```bash
# Vercel
vercel rollback

# Railway
railway rollback
```
