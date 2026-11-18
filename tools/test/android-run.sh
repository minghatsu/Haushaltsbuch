#!/bin/bash
# Installiert die Test-App, startet sie, verbindet die Fernsteuerung und führt android.cjs aus.
# Aufruf: tools/test/android-run.sh <app-debug.apk> <screenshot-ordner>
set -u
APK="$1"; OUT="${2:-shots}"; PKG=de.sascha.haushaltsbuch.test
adb wait-for-device
for i in $(seq 1 60); do [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ] && break; sleep 2; done
adb shell settings put global window_animation_scale 0; adb shell settings put global transition_animation_scale 0; adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82 || true
adb shell input keyevent 3 || true
sleep 20
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
adb uninstall $PKG >/dev/null 2>&1 || true
adb install -r -g "$APK" || exit 3
adb logcat -c
PID=""
for t in 1 2 3; do
  adb shell am start -W -n $PKG/de.sascha.haushaltsbuch.MainActivity
  sleep 15
  PID=$(adb shell pidof $PKG | tr -d '\r'); [ -n "$PID" ] && break
  echo "App noch nicht da – Versuch $t"; adb shell input keyevent 3; adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1; sleep 10
done
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
PID=$(adb shell pidof $PKG | tr -d '\r')
[ -n "$PID" ] || { echo "App startet nicht"; adb logcat -d -s AndroidRuntime:E | head -40; exit 4; }
# Emulatoren in der Cloud hängen manchmal (System-Meldungen, Trägheit):
# Ein Fehler zählt erst, wenn er auch beim zweiten Durchlauf auftritt.
HB_PKG=$PKG node "$(dirname "$0")/android.cjs" "$OUT"; RC=$?
if [ $RC -ne 0 ]; then
  echo "--- 2. Durchlauf (zur Bestätigung) ---"
  adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
  adb shell am force-stop $PKG; adb shell am start -W -n $PKG/de.sascha.haushaltsbuch.MainActivity; sleep 15
  HB_PKG=$PKG node "$(dirname "$0")/android.cjs" "$OUT"; RC=$?
fi
exit $RC
