#!/usr/bin/env bash
set -euo pipefail

# Debug APK. Signing keys are the Android debug keystore (local), not the repo.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d android ]]; then
  echo "android/ 프로젝트가 없습니다. npx cap add android 를 먼저 실행하세요." >&2
  exit 1
fi

if [[ ! -f android/local.properties ]]; then
  bash "$ROOT/scripts/setup-android-sdk.sh"
fi

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"

npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug --no-daemon)

apk="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$apk" ]]; then
  mkdir -p "$ROOT/artifacts/mobile"
  cp "$apk" "$ROOT/artifacts/mobile/arin-dev-debug.apk"
  echo "APK: $apk"
  echo "복사: $ROOT/artifacts/mobile/arin-dev-debug.apk"
else
  echo "APK를 찾지 못했습니다." >&2
  exit 1
fi
