# 즉시 확인 환경

브라우저 미리보기는 그대로 둔다. 앱 고유 동작만 에뮬레이터·휴대폰에서 본다.

## 1. 데모 모드 (서버 없음)

UI와 IndexedDB만 쓴다. 상단에 **데모 · 서버 없음**이 보인다.

```bash
npm install
npm run dev
```

주소: http://127.0.0.1:43127

진입:

| 확인 | 경로 |
|---|---|
| 오늘 | `/` |
| 학습 | `/study` |
| 실전 | `/mock` |
| 설정(키보드) | `/settings` |
| 로그인 복귀 테스트 | `/auth/callback?code=preview` |
| 테스트 로그인 버튼 | 상단 데모 배너 |

같은 번들을 앱에 넣으려면:

```bash
npm run mobile:icons
npm run mobile:android:apk
```

산출: `android/app/build/outputs/apk/debug/app-debug.apk`  
복사: `artifacts/mobile/arin-dev-debug.apk`

휴대폰: USB 디버깅 후 `adb install -r artifacts/mobile/arin-dev-debug.apk`. 패키지 `app.arin.dev`.

에뮬레이터 (Android SDK + KVM):

```bash
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools:$PATH"
emulator -avd arin_dev -gpu swiftshader_indirect
adb install -r artifacts/mobile/arin-dev-debug.apk
adb shell am start -n app.arin.dev/.MainActivity
```

딥링크 확인: `adb shell am start -a android.intent.action.VIEW -d 'arin://app/mock' -n app.arin.dev/.MainActivity`  
로그인 복귀: `adb shell am start -a android.intent.action.VIEW -d 'arin://auth/callback?code=preview' -n app.arin.dev/.MainActivity`


## 2. 개발 서버 모드 (Vite에 연결)

앱 WebView가 로컬 Vite를 연다. 배너는 **개발 서버 · Vite** (`VITE_RUNTIME_MODE=live`).

1. 컴퓨터와 휴대폰이 같은 네트워크인지 확인
2. `npm run dev:live` — 포트 43127, `0.0.0.0`
3. LAN IP 확인 (`ip addr` / `ipconfig`)
4. 앱 쪽에만 라이브 URL을 넣는다. **운영 `capacitor.config.json`에는 `server.url`을 커밋하지 않는다.**

```bash
npx cap run android --live-reload --port 43127
```

B의 API가 생기면 `.env.live`의 `VITE_API_BASE_URL`만 채운다. 비밀키는 `.env.local`.

## 이번 변경에서 확인할 것

1. 브라우저에서 데모 배너와 기존 오늘/학습/실전 화면
2. 설정 숫자 입력 시 배너·탭이 입력칸을 가리지 않는지 (모바일 폭)
3. 배너 **테스트 로그인** 후 “테스트 사용자”, 로그아웃
4. `/auth/callback?code=preview` 복귀
5. 가능하면 개발 APK 설치 후 같은 화면, 오프라인 시 빨간 안내
6. 실전 중 앱 전환·뒤로 가기 → 준비 화면으로 나가며 진행이 남는지 (채점 로직은 D)

iOS는 [`ios-signing.md`](./ios-signing.md). 이 Linux 환경에서는 설치 검증을 하지 않는다.
