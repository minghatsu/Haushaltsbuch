# Finanz MAMI – Handy-Test am PC
# Installiert die Test-App "MAMI Test" (läuft NEBEN deiner echten App, eigene Daten),
# bedient sie per USB mit echten Wischgesten und legt Bildschirmfotos in "Downloads\MAMI-Test-Ergebnis".
# Deine echte Finanz-MAMI-App und ihre Daten werden nicht angefasst.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$tools = Join-Path $env:LOCALAPPDATA 'MAMI-Test'
$out   = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads\MAMI-Test-Ergebnis'
$pkg   = 'de.sascha.haushaltsbuch.test'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force -Path $out | Out-Null
$log = Join-Path $out 'protokoll.txt'
function Say($t) { Write-Host $t; Add-Content -Path $log -Value $t -Encoding UTF8 }

# 1) Android-Werkzeug (adb, offiziell von Google) einmalig holen
$adb = Join-Path $tools 'platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  Say 'Lade Android-Werkzeug von Google (einmalig, ca. 7 MB) ...'
  $zip = Join-Path $tools 'pt.zip'
  Invoke-WebRequest 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $zip
  Expand-Archive $zip -DestinationPath $tools -Force; Remove-Item $zip
}
function A { param([Parameter(ValueFromRemainingArguments)]$a) & $adb @a }

# 2) Handy verbunden?
A start-server | Out-Null
# bis zu 90 Sekunden warten – in der Zeit kann am Handy "Zulassen" bestätigt werden
$dev = $null; $hint = ''
for ($i = 0; $i -lt 45; $i++) {
  $lst = (A devices) | Select-String "`t"
  $dev = $lst | Select-String "`tdevice$"
  if ($dev) { break }
  $st = if ($lst | Select-String 'unauthorized') { 'unauthorized' } elseif ($lst) { 'other' } else { 'none' }
  if ($st -ne $hint) {
    $hint = $st
    if ($st -eq 'unauthorized') { Say 'Handy erkannt – bitte am Handy "USB-Debugging zulassen" bestätigen (Häkchen bei "Immer zulassen") ...' }
    elseif ($st -eq 'none') { Say 'Warte auf Handy ... (USB-Kabel stecken, Handy entsperren)' }
  }
  if ($st -eq 'unauthorized' -and $i -eq 20) { A kill-server | Out-Null; A start-server | Out-Null }
  Start-Sleep 2
}
if (-not $dev) {
  Say ''
  Say "Kein Handy gefunden (Status: $hint)."
  if ($hint -eq 'none') {
    Say 'Bei Samsung braucht Windows meist den Samsung-USB-Treiber:'
    Say '  https://developer.samsung.com/android-usb-driver  -> herunterladen, installieren, PC neu starten.'
    Say 'Außerdem: anderes USB-Kabel/Anschluss probieren (manche Kabel können nur laden).'
  } else {
    Say 'Am Handy: Entwickleroptionen > "USB-Debugging-Berechtigungen widerrufen", Kabel neu stecken, neu zulassen.'
  }
  Say ''; Say 'adb-Ausgabe:'; Say ((A devices -l) -join "`n")
  Read-Host 'Enter zum Schließen'; exit 1
}
Say "Handy: $((A shell getprop ro.product.model).Trim())  Android $((A shell getprop ro.build.version.release).Trim())"

# 3) Neueste Test-App holen und installieren
Say 'Lade neueste Test-App ...'
$apk = Join-Path $tools 'MAMI-Test.apk'
Invoke-WebRequest 'https://github.com/minghatsu/Haushaltsbuch/releases/download/testfotos/MAMI-Test.apk' -OutFile $apk
A install -r -g $apk | Out-Null
A logcat -c
A shell am force-stop $pkg
A shell am start -n "$pkg/de.sascha.haushaltsbuch.MainActivity" | Out-Null
Start-Sleep 10

# Bildschirmgröße
$sz = (A shell wm size) -join "`n"; $m = [regex]::Matches($sz, '(\d+)x(\d+)'); $W = [int]$m[$m.Count-1].Groups[1].Value; $H = [int]$m[$m.Count-1].Groups[2].Value
Say "Bildschirm $W x $H"
$n = 0
function Shot($name) { $script:n++; $f = ('{0:D2}-{1}.png' -f $script:n, $name); A shell screencap -p /sdcard/mami-shot.png; A pull /sdcard/mami-shot.png (Join-Path $out $f) | Out-Null; Say "Foto: $f" }
function Swipe($x1,$y1,$x2,$y2,$ms=300) { A shell input swipe ([int]($W*$x1)) ([int]($H*$y1)) ([int]($W*$x2)) ([int]($H*$y2)) $ms; Start-Sleep -Milliseconds 2500 }
function Tap($x,$y) { A shell input tap ([int]($W*$x)) ([int]($H*$y)); Start-Sleep -Milliseconds 1800 }

# 4) Ablauf – wie ein Mensch
Shot 'start'
Swipe 0.7 0.26 0.3 0.26 250;  Shot 'start-karte-gewischt'
Swipe 0.83 0.72 0.17 0.72;    Shot 'seite-2'
Swipe 0.83 0.72 0.17 0.72;    Shot 'seite-3-sparen'
Swipe 0.7 0.26 0.3 0.26 250;  Shot 'sparen-karte-gewischt'
Swipe 0.7 0.26 0.3 0.26 250;  Shot 'sparen-karte-nochmal'
Swipe 0.83 0.72 0.17 0.72;    Shot 'seite-4'
Swipe 0.17 0.72 0.83 0.72;    Shot 'zurueck-gewischt'
A shell input keyevent 4; Start-Sleep 2; Shot 'zurueck-taste'
Tap 0.5 0.26;                 Shot 'karte-angetippt'
A shell input keyevent 4; Start-Sleep 2; Shot 'ende'

# 5) Abstürze?
$crash = (A logcat -d -s AndroidRuntime:E) -join "`n"
if ($crash -match 'FATAL EXCEPTION') { Say 'ABSTURZ gefunden:'; Say $crash } else { Say 'Kein Absturz.' }
A shell rm /sdcard/mami-shot.png
Say ''
Say "Fertig. Ergebnisse liegen in: $out"
Say 'Sag Claude im Chat Bescheid, dann schaue ich sie mir an.'
Read-Host 'Enter zum Schließen'
