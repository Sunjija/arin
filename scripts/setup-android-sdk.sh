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
yes | sdkmanager --sdk_root="$SDK_ROOT" --licenses >/dev/null
sdkmanager --sdk_root="$SDK_ROOT" \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"

printf 'sdk.dir=%s\n' "$SDK_ROOT" > "$(dirname "$0")/../android/local.properties"
echo "ANDROID_SDK_ROOT=$SDK_ROOT"
