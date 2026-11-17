<?php
// Finanz MAMI – „Mami schaut genauer hin“: liest geschwärzte Amtsbriefe mit KI (Anthropic Claude).
// Der API-Schlüssel steht NUR hier auf dem Server in mami-config.php (oder config.php): 'anthropic_key' => 'sk-ant-…'.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

$CFG = ['anthropic_key' => '', 'mami_model' => 'claude-haiku-5-5', 'mami_dev_day' => 15, 'mami_ip_day' => 40, 'mami_all_day' => 3000];
if (is_file(__DIR__ . '/config.php')) $CFG = array_merge($CFG, (array)(include __DIR__ . '/config.php'));
if (is_file(__DIR__ . '/mami-config.php')) $CFG = array_merge($CFG, (array)(include __DIR__ . '/mami-config.php'));

function out($d, int $c = 200): void { http_response_code($c); echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['error' => 'POST'], 405);
$key = trim((string)$CFG['anthropic_key']);
if ($key === '' || strpos($key, 'HIER-') === 0) out(['error' => 'nokey'], 503);

$b = json_decode(file_get_contents('php://input') ?: '{}', true); if (!is_array($b)) $b = [];
$dev = preg_replace('/[^A-Za-z0-9_-]/', '', (string)($b['dev'] ?? ''));
$text = (string)($b['text'] ?? '');
$lang = preg_replace('/[^a-z]/', '', (string)($b['lang'] ?? 'de')) ?: 'de';
if (strlen($dev) < 6 || strlen($dev) > 64) out(['error' => 'dev'], 400);
$text = trim(mb_substr($text, 0, 16000));
if (mb_strlen($text) < 40) out(['error' => 'short'], 400);

// ---- Tageslimits (Gerät, IP, alle) ----
$dir = (function (): string {
    $f = array_values(array_filter(glob(__DIR__ . '/mami-*', GLOB_ONLYDIR) ?: [], 'is_writable'));
    if ($f) return $f[0];
    $d = __DIR__ . '/mami-' . bin2hex(random_bytes(12));
    @mkdir($d, 0700, true); @file_put_contents($d . '/.htaccess', "Require all denied\nDeny from all\n"); @file_put_contents($d . '/index.html', '');
    return $d;
})();
try {
    $db = new PDO('sqlite:' . $dir . '/limits.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA busy_timeout=5000');
    $db->exec('CREATE TABLE IF NOT EXISTS n (k TEXT PRIMARY KEY, day TEXT, c INTEGER)');
} catch (Throwable $e) { out(['error' => 'server'], 500); }
$day = gmdate('Y-m-d');
$ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
$keys = ['d:' . $dev => (int)$CFG['mami_dev_day'], 'i:' . hash('sha256', $ip) => (int)$CFG['mami_ip_day'], 'all' => (int)$CFG['mami_all_day']];
$get = $db->prepare('SELECT day, c FROM n WHERE k = ?');
foreach ($keys as $k => $max) { $get->execute([$k]); $r = $get->fetch(PDO::FETCH_ASSOC); if ($r && $r['day'] === $day && (int)$r['c'] >= $max) out(['error' => 'limit'], 429); }
$up = $db->prepare('INSERT INTO n (k, day, c) VALUES (?, ?, 1) ON CONFLICT(k) DO UPDATE SET c = CASE WHEN day = excluded.day THEN c + 1 ELSE 1 END, day = excluded.day');
foreach ($keys as $k => $max) $up->execute([$k, $day]);
if (mt_rand(1, 50) === 1) $db->exec("DELETE FROM n WHERE day < '" . gmdate('Y-m-d', time() - 3 * 86400) . "'");

// ---- KI fragen ----
$L = ['de' => 'Deutsch', 'en' => 'English', 'tr' => 'Türkçe', 'ru' => 'Русский', 'uk' => 'Українська', 'pl' => 'Polski', 'ar' => 'العربية', 'ro' => 'Română'];
$langName = $L[$lang] ?? 'Deutsch';
$system = <<<TXT
Du liest deutsche Briefe von Ämtern und Behörden (Jobcenter, Finanzamt, Familienkasse, Krankenkasse, Rentenversicherung, Stadt, Gericht usw.) für eine Haushalts-App.
Der Text stammt aus einer Texterkennung und kann Fehler und Spalten-Durcheinander enthalten. Mit █ geschwärzte Stellen sind persönliche Daten – ignoriere sie und rate sie nicht.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Erklärung davor oder danach, mit diesen Feldern (unbekannt = null):
{"from": Name der Behörde kurz (z. B. "Jobcenter Solingen"),
 "kind": eins von "mit" (Mitwirkung/Unterlagen anfordern), "bes" (Bescheid), "bew" (Bewilligung), "abl" (Ablehnung), "rueck" (Rückforderung/Erstattung an das Amt), "mahn" (Mahnung), "ein" (Einladung/Termin), "anh" (Anhörung), "info" (nur Information),
 "date": Datum des Briefs "YYYY-MM-DD",
 "due": wichtigste Frist bis wann etwas getan oder bezahlt werden muss "YYYY-MM-DD",
 "term": Termin-Datum "YYYY-MM-DD", "time": Uhrzeit "HH:MM",
 "money": "pay" (Empfänger muss zahlen), "back" (Empfänger bekommt Geld einmalig), "month" (laufende monatliche Leistung) oder "none",
 "amt": Betrag als Zahl ohne Währung (bei mehreren Spalten den Gesamtbetrag),
 "docs": Liste der Unterlagen, die eingereicht werden sollen (kurze Stichworte),
 "warn": true wenn Kürzung, Sanktion, Versagung, Mahngebühr oder Vollstreckung droht,
 "sum": 2 bis 4 sehr kurze, einfache Sätze auf {$langName} in Du-Form: was im Brief steht und was jetzt zu tun ist,
 "todo": bis zu 4 kurze Aufgaben auf {$langName}}
Erfinde nichts. Wenn etwas nicht im Text steht, setze null.
TXT;
$req = [
    'model' => (string)$CFG['mami_model'],
    'max_tokens' => 900,
    'system' => [['type' => 'text', 'text' => $system, 'cache_control' => ['type' => 'ephemeral']]],
    'messages' => [['role' => 'user', 'content' => "Brief:\n\n" . $text]],
];
$payload = json_encode($req, JSON_UNESCAPED_UNICODE);
$hdr = ['Content-Type: application/json', 'x-api-key: ' . $key, 'anthropic-version: 2023-06-01'];
$code = 0; $resp = '';
if (function_exists('curl_init')) {
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_HTTPHEADER => $hdr, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_CONNECTTIMEOUT => 10]);
    $resp = (string)curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
} else {
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => implode("\r\n", $hdr), 'content' => $payload, 'timeout' => 60, 'ignore_errors' => true]]);
    $resp = (string)@file_get_contents('https://api.anthropic.com/v1/messages', false, $ctx);
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) $code = (int)$m[1];
}
if ($code < 200 || $code >= 300) { @file_put_contents($dir . '/fehler.log', gmdate('c') . " $code " . substr($resp, 0, 300) . "\n", FILE_APPEND); out(['error' => $code === 429 || $code === 529 ? 'busy' : 'ai'], 502); }
$j = json_decode($resp, true);
$txt = ''; foreach ((array)($j['content'] ?? []) as $c) if (($c['type'] ?? '') === 'text') $txt .= $c['text'];
if (!preg_match('/\{[\s\S]*\}/', $txt, $m)) out(['error' => 'ai'], 502);
$r = json_decode($m[0], true); if (!is_array($r)) out(['error' => 'ai'], 502);

// ---- säubern ----
$d = fn($v) => is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
$s = fn($v, $n) => is_string($v) ? mb_substr(trim($v), 0, $n) : null;
$list = function ($v, $n, $len) use ($s) { $o = []; foreach ((array)$v as $x) { $x = $s($x, $len); if ($x) $o[] = $x; if (count($o) >= $n) break; } return $o; };
$res = [
    'from' => $s($r['from'] ?? null, 60),
    'kind' => in_array($r['kind'] ?? '', ['mit', 'bes', 'bew', 'abl', 'rueck', 'mahn', 'ein', 'anh', 'info'], true) ? $r['kind'] : null,
    'date' => $d($r['date'] ?? null), 'due' => $d($r['due'] ?? null), 'term' => $d($r['term'] ?? null),
    'time' => is_string($r['time'] ?? null) && preg_match('/^\d{1,2}:\d{2}$/', $r['time']) ? $r['time'] : null,
    'money' => in_array($r['money'] ?? '', ['pay', 'back', 'month', 'none'], true) ? $r['money'] : null,
    'amt' => is_numeric($r['amt'] ?? null) ? round(abs((float)$r['amt']), 2) : null,
    'docs' => $list($r['docs'] ?? [], 10, 120),
    'warn' => !empty($r['warn']),
    'sum' => $list($r['sum'] ?? [], 4, 240),
    'todo' => $list($r['todo'] ?? [], 4, 120),
];
if (!$res['sum'] && is_string($r['sum'] ?? null)) $res['sum'] = [$s($r['sum'], 600)];
out(['ok' => 1, 'r' => $res]);
