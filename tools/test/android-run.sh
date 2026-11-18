#!/bin/bash
# Installiert die Test-App, startet sie, verbindet die Fernsteuerung und führt android.cjs aus.
# Aufruf: tools/test/android-run.sh <app-debug.apk> <screenshot-ordner>
set -u
APK="$1"; OUT="${2:-shots}"; PKG=de.sascha.haushaltsbuch.test
adb wait-for-device
for i in $(seq 1 60); do [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ] && break; sleep 2; done
adb shell settings put global window_animation_scale 0; adb shell settings put global transition_animation_scale 0; adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82 || true
adb uninstall $PKG >/dev/null 2>&1 || true
adb install -r -g "$APK" || exit 3
adb logcat -c
adb shell am start -W -n $PKG/de.sascha.haushaltsbuch.MainActivity
sleep 8
PID=$(adb shell pidof $PKG | tr -d '\r')
[ -n "$PID" ] || { echo "App startet nicht"; adb logcat -d -s AndroidRuntime:E | head -40; exit 4; }
HB_PKG=$PKG node "$(dirname "$0")/android.cjs" "$OUT"
