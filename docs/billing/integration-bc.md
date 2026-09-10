# B·C 통합 순서

B(`account-sync-v1`)와 C(`mobile-platform-v1`) 계약은 2026-09-10 기준 저장소에 없다. billing은 자리표시 식별자와 TypeScript 네이티브 인터페이스로 먼저 완성했다. 중복 인증·패키징을 만들지 않는다.

## 지금 동작하는 것

- 상품 카탈로그와 capability
- 인프로세스 서버 검증·알림·복원·만료
- 브라우저 테스트 어댑터와 `/billing` 화면
- 운영에서 테스트 토큰 거부, 스토어 자격 증명 없으면 실패로 닫힘

## B가 준비되면

1. `accountId`를 B 세션의 안정 ID로 교체한다. 자리표시 `placeholder:install:…`는 폐기한다.
2. `createProductionAccountAuth(resolveFromB)`에 액세스 토큰 검증을 넣는다. `Bearer test:`는 운영에서 계속 거부한다.
3. `appAccountToken`(Apple UUID) / `obfuscatedAccountId`(Google) 매핑 테이블을 B DB에 둔다.
4. 계정 삭제 파이프라인이 `POST /v1/billing/account-deleted`를 호출하게 한다.
5. 유료 API(실전 모의 시작 등) 핸들러에서 `assertCapability(accountId, 'full_mock')`를 호출한다. 문항 `approved` 필터는 그대로 콘텐츠 담당.
6. 기기 간 동기화는 B 저장소를 쓰고, billing은 거래·권한만 다룬다.

## C가 준비되면

1. `NativeStoreBilling` (`src/billing/store/native.ts`, 계약 8절)을 StoreKit 2 / Play Billing 7+로 구현한다.
2. 웹 미리보기의 `TestStoreBilling` 대신 네이티브 구현을 주입한다. 테스트 배너는 네이티브 샌드박스에서도 “샌드박스”를 구분한다.
3. 시작 시 `unfinished()` + `Transaction.updates` / `queryPurchasesAsync`를 `BillingClient.recoverUnfinished`에 연결한다.
4. `verify`가 `finished: true`일 때만 `transaction.finish()` / 서버 acknowledge.
5. 스토어 설정 파일·키스토어·엔타이틀먼트는 C만 수정한다.
6. 구독 관리 UI를 `showManageSubscriptions`에 연결한다.

## 권장 순서

1. 이 브랜치의 테스트 어댑터 검증 (완료 대상)
2. B 계약에 `accountId` 필드명 확정 → billing 매핑만 수정
3. C가 샌드박스 상품 ID를 카탈로그 `storeProductIds`에 기입
4. 자격 증명이 있는 스테이징에서 Apple/Google verifier를 fail-closed stub에서 실제 JWS/API로 교체
5. 샌드박스 실기기 구매·복원·환불 — **그때만 샌드박스 통과로 보고**
6. 판매 활성화는 별도 사용자 결정

네이티브 설정이나 공용 인증 파일을 이 담당이 먼저 만들지 않는다.
