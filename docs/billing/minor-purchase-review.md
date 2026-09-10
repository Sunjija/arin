# 미성년자 구매 검토 (미완료)

앱 대상이 14세 이상이어도 모든 이용자를 성인 구매자로 보지 않는다. 아래는 공식 근거와 남은 결정이다. 법무 검토나 사용자 결정을 완료로 표시하지 않는다.

## 대한민국

- 민법 제5조: 미성년자(만 19세 미만)의 법률행위는 법정대리인 동의가 필요하고, 없으면 취소할 수 있다. [법령](https://www.law.go.kr/)
- 전자상거래법 제13조 제3항 (2026.7.21. 시행 조문 기준): 통신판매업자는 미성년자와 계약할 때, 법정대리인이 동의하지 않으면 본인 또는 법정대리인이 취소할 수 있음을 고지해야 한다. [조문](https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1022784631)
- 개인정보 보호법상 만 14세 이상 정보 수집과, 민법상 구매 행위 능력은 별개다. 14세 이상 가입을 허용해도 17세 이용자의 인앱결제는 미성년 계약일 수 있다.

고지 위치·문안·취소 접수 절차는 법무와 사용자 결정이다. `/billing`에 초안 한 줄만 두었고 법적 고지 완료가 아니다.

## Apple

- [Ask to Buy](https://support.apple.com/105055): Family Sharing에서 자녀 구매·앱 내 구입을 보호자가 승인한다. 지역에 따라 18세 미만 기본 켜짐, 끌 수 없는 경우가 있다.
- StoreKit 2: 승인 대기 시 `Product.PurchaseResult.pending`. 승인 거래는 `Transaction.updates`로 온다. 거절 시 거래가 없을 수 있다.
- 개발자는 Apple ID 나이를 성인으로 가정하고 바로 권한을 주면 안 된다. pending이면 권한 없음.

## Google

- [Play 구매 승인](https://support.google.com/googleplay/answer/7039872): 가족 그룹·Family Link에서 유료 앱·인앱결제 승인을 요구할 수 있다.
- Play Billing: `Purchase.PENDING`이면 권한 없음. 완료 시 RTDN `SUBSCRIPTION_PURCHASED` / `ONE_TIME_PRODUCT_PURCHASED` 후 Developer API로 재확인.
- 구매 승인 설정은 Play 결제에만 적용된다. 다른 결제 경로는 이 프로젝트에 없다.

## 구현이 하는 일 / 하지 않는 일

하는 일:

- pending을 `pending_purchase`로 저장하고 capability를 주지 않는다
- 승인 후 스토어 재검증이 성공해야 부여한다
- 결제 화면에 미성년 취소 가능 초안을 보여 준다

하지 않는 일:

- 자체 나이 확인 게이트를 성인 인증으로 완료 처리
- 스토어 Ask to Buy / Family Link를 우회
- 취소 분쟁 절차를 고객센터 정책으로 확정
