#!/usr/bin/env bash
set -euo pipefail

# Android command-line SDK for debug APK builds on Linux (no Android Studio).
# Capacitor 8: compile/target SDK 36, min 24.

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
mkdir -p "$SDK_ROOT/cmdline-tools"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_HOME="$SDK_ROOT"

if [[ ! -x "$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]]; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/cmdtools.zip" \
    "https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
  unzip -q "$tmp/cmdtools.zip" -d "$tmp"
  mkdir -p "$SDK_ROOT/cmdline-tools/latest"
  mv "$tmp/cmdline-tools/"* "$SDK_ROOT/cmdline-tools/latest/"
  rm -rf "$tmp"
fi

export PATH="$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools:$PATH"

mkdir -p "$SDK_ROOT/licenses"
printf '\n24333f8a63b6825ea9c5514f83c2829b004d1dc\n' > "$SDK_ROOT/licenses/android-sdk-license"
printf '\n84831b9409646161da1e653ef071701f\n' > "$SDK_ROOT/licenses/android-sdk-preview-license"
set +o pipefail
yes | sdkmanager --sdk_root="$SDK_ROOT" --licenses >/tmp/android-sdk-licenses.log || true
set -o pipefail

sdkmanager --sdk_root="$SDK_ROOT" \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"

ANDROID_DIR="$(cd "$(dirname "$0")/.." && pwd)/android"
if [[ -d "$ANDROID_DIR" ]]; then
  printf 'sdk.dir=%s\n' "$SDK_ROOT" > "$ANDROID_DIR/local.properties"
fi
echo "ANDROID_SDK_ROOT=$SDK_ROOT"
