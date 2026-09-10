# 결제 모듈 실행과 검증

판매 활성화·운영 배포·유료 계약은 하지 않는다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://127.0.0.1:43127/billing](http://127.0.0.1:43127/billing) 또는 설정 → 이용권 관리.

화면 상단의 **테스트 결제 모드**가 보이면 테스트 어댑터다. 실제 스토어 결제가 아니다.

## 검사

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

결제 상태 기계는 `src/billing/billing.test.ts`, 화면은 `src/pages/BillingPage.test.tsx`.

테스트 어댑터로 증명한 것:

- 구매 성공 / 사용자 취소 / 보류 후 승인
- 중복·지연·역순 알림
- 다른 기기 복원, 다른 계정 귀속 충돌
- 갱신, 해지 예약 후 잔여 기간, 만료, 환불
- 서버 장애 후 재검증 (우회 없음)
- 계정 삭제 후 서비스 권한 제거, 스토어 구독 유지
- 오프라인 TTL 만료
- 운영 서버의 테스트 토큰 거부
- 클라이언트 성공만으로는 권한 없음

App Store / Play 샌드박스 실기기는 자격 증명과 C의 네이티브 연결이 없어 **실행하지 않았고 통과로 보고하지 않는다.**

## 운영 메모

- 권한의 소스 오브 트루스는 서버의 스토어 재검증 스냅샷이다.
- 알림은 힌트다. 실패(자격 증명 없음) 시 권한을 올리지 않고 재시도 가능하게 둔다.
- 로그에 `purchaseToken` / JWS / 키를 남기지 않는다. `redactForLog`를 통과시킨다.
- 개발 거래 prefix `test.` 는 production/sandbox에서 `test_transaction_rejected`.
- 해지 예약은 즉시 권한 소멸이 아니다.

HTTP 엔드포인트는 `src/billing/server/http.ts`의 `handleBillingHttp`다. B 서버에 마운트한다. 이 미리보기는 인프로세스 서비스로 동일 로직을 호출한다.
