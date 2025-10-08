# 🔐 Firebase Security Rules (Draft) — Studio Morph (MVP Lite)

**목적**: 단일 운영자(OWNER_UID) 환경에서 읽기/쓰기 최소 권한, 핵심 무결성을 보장하는 초안.

구현 상 제약으로 모든 정합성은 완전히 보장되지 않으며, **요금/매칭/요약 계산은 Cloud Functions(Admin SDK, 우회 권한)**에서 수행.

---

## 0) 전제 & 운영 가이드

* **단일 계정만 R/W 허용**: OWNER_UID (Firebase Console → Authentication)
* **클라이언트가 직접 쓰기 허용**: reservations, reservations/*/meta, costs, goals
* **클라이언트는 쓰기 금지**: invoices, discountLogs, bankTx, summaries (Functions 전용)
* **전화번호, 날짜 등 정규화는 Functions/클라이언트 유틸에서 수행**. 룰에서는 최소한의 스키마 검증만 수행.

---

## 1) Firestore Rules (v2 draft)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // -------- Helpers --------
    function isOwner() {
      return request.auth != null && request.auth.uid == OWNER_UID; // 배포 전 교체: 문자열 상수
    }
    function strIn(v, arr) { return arr.hasAny([v]); }
    function isNonNegNumber(n) { return n is int || n is float && n >= 0; }

    // Timestamp 유효성 (초안): 최소 2시간 보장 시도
    function isMinTwoHours(startAt, endAt) {
      return startAt is timestamp && endAt is timestamp && endAt > startAt &&
             (endAt.toMillis() - startAt.toMillis()) >= (2 * 60 * 60 * 1000);
    }

    // 전화번호: 010xxxxxxxx (간단 검증)
    function isPhoneKR(phone) {
      return phone is string && phone.size() == 11 && phone.startsWith('010');
    }

    // ---------- reservations ----------
    match /reservations/{reservationId} {
      allow read: if isOwner();
      allow create, update: if isOwner() &&
        isMinTwoHours(request.resource.data.startAt, request.resource.data.endAt) &&
        request.resource.data.people is int && request.resource.data.people >= 1 &&
        strIn(request.resource.data.channel, ['default','hourplace','spacecloud']) &&
        strIn(request.resource.data.status, ['CONFIRMED','CANCELLED']);
      allow delete: if false; // 물리 삭제 금지 (VOID 처리 권장)

      // meta 서브컬렉션
      match /meta/{docId} {
        allow read: if isOwner();
        allow create, update: if isOwner() &&
          isPhoneKR(request.resource.data.phone) &&
          request.resource.data.payerName is string && request.resource.data.payerName.size() > 0 &&
          request.resource.data.peopleCount is int && request.resource.data.peopleCount >= 1;
        allow delete: if false;
      }
    }

    // ---------- invoices ---------- (Functions 전용)
    match /invoices/{invoiceId} {
      allow read: if isOwner();
      allow write: if false; // 클라이언트 직접 쓰기 금지

      // discountLogs (Functions 전용)
      match /discountLogs/{logId} {
        allow read: if isOwner();
        allow write: if false;
      }
    }

    // ---------- bankTx ---------- (Functions 전용)
    match /bankTx/{txId} {
      allow read: if isOwner();
      allow write: if false;
    }

    // ---------- costs (월 단위) ----------
    match /costs/{yyyyMM} {
      allow read: if isOwner();
      allow create, update: if isOwner() &&
        isNonNegNumber(request.resource.data.rent) &&
        isNonNegNumber(request.resource.data.utilities) &&
        isNonNegNumber(request.resource.data.adsTotal) &&
        isNonNegNumber(request.resource.data.supplies) &&
        isNonNegNumber(request.resource.data.maintenance);
      allow delete: if false;
    }

    // ---------- goals (월 매출 목표) ----------
    match /goals/{yyyyMM} {
      allow read: if isOwner();
      allow create, update: if isOwner() &&
        request.resource.data.revenueTarget is int && request.resource.data.revenueTarget >= 0;
      allow delete: if false;
    }

    // ---------- summaries (월 요약, Functions 전용) ----------
    match /summaries/{yyyyMM} {
      allow read: if isOwner();
      allow write: if false;
    }
  }
}
```

### NOTE

* **OWNER_UID는 실제 배포 시 문자열로 치환**하거나, `request.auth.token.role == 'owner'` 커스텀 클레임을 사용하세요.
* **Firestore Rules는 복잡한 비즈니스 로직(요금, 경계 계산)을 완전 검증하기 어렵습니다**. 핵심 계산/검증은 반드시 Functions에서 재검증하세요.

---

## 2) Storage Rules (CSV 업로드 버킷)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isOwner() { return request.auth != null && request.auth.uid == OWNER_UID; }

    // 은행 CSV 업로드 전용 경로
    match /bank-csv/{fileName} {
      allow read: if false; // 비공개
      allow write: if isOwner() &&
        request.resource.contentType.matches('text/csv') &&
        request.resource.size < 5 * 1024 * 1024; // 5MB 제한
    }

    // 기타 경로 기본 거부
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 3) 인덱스 & 무결성 (운영 체크리스트)

* **하드 딜리트 금지**: 예약 삭제 대신 `status: CANCELLED` + 관련 인보이스 VOID
* **동시 수정 충돌**: 클라이언트에서 update 시 updatedAt 등으로 낙관적 잠금 권장
* **관리성**: Cloud Functions(Admin SDK)는 Rules를 우회하므로, 입력 유효성 검증을 반드시 중복 구현

---

## 4) 다음 단계 (권장)

* **OWNER_UID → 환경별 설정 분리** (dev/prod)
* **request.time 기반 월 경계 검증**(목표/요약 작성 시기 제한 등) 필요 시 보완
* **멀티 테넌시 확장 시**: 최상위 `tenants/{tenantId}/...`로 네임스페이스 분리 + Rules 동적 경계
