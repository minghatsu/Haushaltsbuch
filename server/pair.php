<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

const MAX_BLOB = 6000000;
const MAX_VAULT = 800000000;
const MAX_CREATE_PER_HOUR = 20;
const MAX_CREATE_ALL_HOUR = 200;
const MAX_TOTAL = 20000000000;
const MIN_FREE = 2000000000;
const INV_MAX = 20;
const DEV_MAX = 50;

define('DATA_DIR', (function (): string {
    $found = array_values(array_filter(glob(__DIR__ . '/pair-*', GLOB_ONLYDIR) ?: [], 'is_writable'));
    if ($found) return $found[0];
    return __DIR__ . '/pair-' . bin2hex(random_bytes(12));
})());

function out($data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(string $msg, int $code): void { out(['error' => $msg], $code); }
function body(): array { static $b = null; if ($b === null) { $j = json_decode(file_get_contents('php://input') ?: '{}', true); $b = is_array($j) ? $j : []; } return $b; }
function ip(): string { return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64); }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!is_dir(DATA_DIR)) {
        if (!@mkdir(DATA_DIR, 0700, true)) fail('Datenordner kann nicht angelegt werden', 500);
        @file_put_contents(DATA_DIR . '/.htaccess', "Require all denied\nDeny from all\n");
        @file_put_contents(DATA_DIR . '/index.html', '');
    }
    $dbs = glob(DATA_DIR . '/tresore-*.sqlite') ?: [];
    if ($dbs) $file = $dbs[0];
    else {
        $file = DATA_DIR . '/tresore-' . bin2hex(random_bytes(16)) . '.sqlite';
        if (is_file(DATA_DIR . '/tresore.sqlite')) {
            if (!@rename(DATA_DIR . '/tresore.sqlite', $file)) fail('Datenbank konnte nicht umbenannt werden', 500);
            foreach (['-wal', '-shm'] as $x) if (is_file(DATA_DIR . '/tresore.sqlite' . $x)) @rename(DATA_DIR . '/tresore.sqlite' . $x, $file . $x);
        }
    }
    $pdo = new PDO('sqlite:' . $file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode=WAL'); $pdo->exec('PRAGMA busy_timeout=5000');
    $pdo->exec('CREATE TABLE IF NOT EXISTS vaults (id TEXT PRIMARY KEY, auth TEXT NOT NULL, created INTEGER, used INTEGER, rev INTEGER NOT NULL DEFAULT 0, size INTEGER NOT NULL DEFAULT 0)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS docs (vault TEXT NOT NULL, h TEXT NOT NULL, b TEXT, rev INTEGER NOT NULL, PRIMARY KEY (vault, h))');
    $pdo->exec('CREATE INDEX IF NOT EXISTS docs_rev ON docs(vault, rev)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS ipcreate (ip TEXT PRIMARY KEY, n INTEGER, since INTEGER)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS ipfails (ip TEXT PRIMARY KEY, n INTEGER, since INTEGER)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS ipfeed (ip TEXT PRIMARY KEY, n INTEGER, since INTEGER)');
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }

function ipCount(string $table, int $limit): bool {
    $r = q("SELECT n, since FROM $table WHERE ip = ?", [ip()])->fetch();
    return !($r && (int)$r['since'] > time() - 3600 && (int)$r['n'] >= $limit);
}
function ipBump(string $table): void {
    $r = q("SELECT n, since FROM $table WHERE ip = ?", [ip()])->fetch();
    if (!$r || (int)$r['since'] < time() - 3600) q("INSERT OR REPLACE INTO $table (ip, n, since) VALUES (?, 1, ?)", [ip(), time()]);
    else q("UPDATE $table SET n = n + 1 WHERE ip = ?", [ip()]);
}

function authVault(): array {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    if (!preg_match('/^Bearer\s+([a-f0-9]{32})\.([a-f0-9]{64})$/i', trim($h), $m)) fail('Nicht gekoppelt', 401);
    if (!ipCount('ipfails', 60)) fail('Zu viele falsche Versuche – bitte später noch einmal', 429);
    $v = q('SELECT * FROM vaults WHERE id = ?', [strtolower($m[1])])->fetch(PDO::FETCH_ASSOC);
    if (!$v || !hash_equals((string)$v['auth'], hash('sha256', strtolower($m[2])))) { ipBump('ipfails'); fail('Nicht gekoppelt', 401); }
    if ((int)$v['used'] < time() - 3600) q('UPDATE vaults SET used = ? WHERE id = ?', [time(), $v['id']]);
    return $v;
}

// E-Mail
function cfg(): array { static $c = null; if ($c === null) { $c = is_file(__DIR__ . '/config.php') ? (include __DIR__ . '/config.php') : []; if (!is_array($c)) $c = []; } return $c; }
function smtpSend(string $to, string $subject, string $mime, string $ctype): bool {
    $c = cfg(); $from = (string)($c['mail_from'] ?? ($c['smtp_user'] ?? 'noreply@localhost'));
    $fromAddr = preg_match('/<([^>]+)>/', $from, $m) ? $m[1] : $from;
    $head = "From: $from\r\nTo: $to\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nDate: " . date('r') . "\r\nMIME-Version: 1.0\r\nContent-Type: $ctype\r\n";
    if (empty($c['smtp_host'])) return function_exists('mail') && @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $mime, "From: $from\r\nMIME-Version: 1.0\r\nContent-Type: $ctype");
    $host = (string)$c['smtp_host']; $port = (int)($c['smtp_port'] ?? 465); $sec = (string)($c['smtp_secure'] ?? ($port === 465 ? 'ssl' : 'tls'));
    $fp = @stream_socket_client(($sec === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $en, $es, 20);
    if (!$fp) return false; stream_set_timeout($fp, 20);
    $rd = function () use ($fp) { $o = ''; while (($l = fgets($fp, 1000)) !== false) { $o .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return $o; };
    $cmd = function (string $c, string $ok) use ($fp, $rd) { fwrite($fp, $c . "\r\n"); $r = $rd(); return strncmp($r, $ok, strlen($ok)) === 0; };
    $rd(); if (!$cmd('EHLO finanz-mami', '250')) { fclose($fp); return false; }
    if ($sec === 'tls') { if (!$cmd('STARTTLS', '220') || !stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) || !$cmd('EHLO finanz-mami', '250')) { fclose($fp); return false; } }
    $ok = $cmd('AUTH LOGIN', '334') && $cmd(base64_encode((string)($c['smtp_user'] ?? '')), '334') && $cmd(base64_encode((string)($c['smtp_pass'] ?? '')), '235')
       && $cmd("MAIL FROM:<$fromAddr>", '250') && $cmd("RCPT TO:<$to>", '25') && $cmd('DATA', '354');
    if ($ok) { fwrite($fp, $head . "\r\n" . preg_replace('/^\./m', '..', $mime) . "\r\n.\r\n"); $ok = strncmp($rd(), '250', 3) === 0; }
    @fwrite($fp, "QUIT\r\n"); fclose($fp); return $ok;
}
const DEV_REPO = 'minghatsu/Haushaltsbuch';
function devCheck(): void {
    $h = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
    if (!preg_match('/^Dev\s+([A-Za-z0-9_]{20,255})$/', trim($h), $m)) fail('Kein Entwickler-Schlüssel', 401);
    $hash = hash('sha256', $m[1]);
    db()->exec('CREATE TABLE IF NOT EXISTS devkeys (h TEXT PRIMARY KEY, until INTEGER)');
    $r = q('SELECT until FROM devkeys WHERE h = ?', [$hash])->fetch();
    if ($r && (int)$r['until'] > time()) return;
    if (!ipCount('ipfails', 30)) fail('Zu viele Versuche', 429);
    $code = 0; $why = '';
    $hdr = ["Authorization: Bearer {$m[1]}", 'User-Agent: FinanzMAMI-Server', 'Accept: application/vnd.github+json'];
    if (function_exists('curl_init')) {
        $ch = curl_init('https://api.github.com/repos/' . DEV_REPO);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $hdr, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 10]);
        $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); if ($body === false) $why = curl_error($ch); curl_close($ch);
    } elseif (ini_get('allow_url_fopen')) {
        $ctx = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 15, 'ignore_errors' => true, 'header' => implode("\r\n", $hdr) . "\r\n"]]);
        $body = @file_get_contents('https://api.github.com/repos/' . DEV_REPO, false, $ctx);
        foreach (($http_response_header ?? []) as $l) if (preg_match('#^HTTP/\S+\s+(\d+)#', $l, $mm)) $code = (int)$mm[1];
        if ($body === false) $why = (error_get_last()['message'] ?? 'keine Verbindung');
    } else $why = 'PHP darf keine Verbindung nach außen aufbauen (curl und allow_url_fopen sind aus)';
    if ($code === 401 || $code === 403 || $code === 404) { ipBump('ipfails'); fail('Entwickler-Schlüssel ungültig (GitHub ' . $code . ')', 401); }
    if ($code !== 200) fail('GitHub nicht erreichbar' . ($why !== '' ? ': ' . mb_substr($why, 0, 160) : ' (' . $code . ')'), 502);
    $rj = is_string($body ?? null) ? (json_decode($body, true) ?: []) : []; $perm = $rj['permissions'] ?? [];
    if (empty($rj['private']) && empty($perm['admin']) && empty($perm['maintain']) && empty($perm['push'])) { ipBump('ipfails'); fail('Entwickler-Schlüssel ungültig (keine Rechte an der App)', 401); }
    q('INSERT OR REPLACE INTO devkeys (h, until) VALUES (?, ?)', [$hash, time() + 3600]);
}
function feedDir(): string { return DATA_DIR . '/feedback'; }
function feedPath(string $id): string { if (!preg_match('/^[0-9A-Za-z_-]{10,80}$/', $id) || !is_dir(feedDir() . '/' . $id)) fail('Nicht gefunden', 404); return feedDir() . '/' . $id; }

try {
    $a = $_GET['a'] ?? '';
    if (random_int(1, 200) === 1) {
        $old = q('SELECT id FROM vaults WHERE used < ?', [time() - 730 * 86400])->fetchAll(PDO::FETCH_COLUMN);
        foreach ($old as $id) { q('DELETE FROM docs WHERE vault = ?', [$id]); q('DELETE FROM vaults WHERE id = ?', [$id]); }
    }

    if ($a === 'status') out(['pair' => true]);

    // Einladungen
    if ($a === 'invmake' || $a === 'invrenew' || $a === 'invinfo' || $a === 'activate') {
        db()->exec('CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, owner TEXT UNIQUE, max INTEGER, lvl INTEGER DEFAULT 1, created INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
        try { db()->exec('ALTER TABLE invites ADD COLUMN off INTEGER DEFAULT 0'); } catch (Throwable $e) { }
        $used = fn(string $c): int => (int)q('SELECT COUNT(*) FROM acts WHERE code = ?', [$c])->fetchColumn();
        $b = body(); $dev = (string)($b['dev'] ?? '');
        if ($a === 'invmake' || $a === 'invrenew') {
            if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dev)) fail('Gerät fehlt', 400);
            $h = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));
            $lvl = null;
            if (preg_match('/^Dev\s/', $h)) { devCheck(); $lvl = 0; }
            if ($lvl === null) fail('Nur der Entwickler kann Einladungen verschicken', 403);
            $fresh = $a === 'invrenew' || !empty($b['fresh']);
            $mine = $lvl === 0 ? 'lvl = 0' : "owner LIKE ? ESCAPE '\\'";
            $mp = $lvl === 0 ? [] : [str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $dev) . '#%'];
            $r = null;
            if (!$fresh) $r = q("SELECT code, max, lvl FROM invites WHERE $mine AND COALESCE(off, 0) = 0 AND code NOT IN (SELECT code FROM acts) ORDER BY created DESC, rowid DESC LIMIT 1", $mp)->fetch(PDO::FETCH_ASSOC) ?: null;
            if (!$r) {
                if ($lvl === 1 && (int)q("SELECT COUNT(*) FROM invites WHERE $mine", $mp)->fetchColumn() >= INV_MAX) fail('Du hast schon ' . INV_MAX . ' Einladungen verschickt', 403);
                if (!ipCount('ipcreate', MAX_CREATE_PER_HOUR)) fail('Zu viele neue Codes – bitte später noch einmal', 429);
                ipBump('ipcreate');
                $abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
                do { $c = ''; for ($i = 0; $i < 6; $i++) $c .= $abc[random_int(0, strlen($abc) - 1)]; } while (q('SELECT 1 FROM invites WHERE code = ?', [$c])->fetch());
                q('INSERT INTO invites (code, owner, max, lvl, created) VALUES (?, ?, 1, ?, ?)', [$c, $dev . '#' . $c, $lvl, time()]);
                $r = ['code' => $c, 'max' => 1, 'lvl' => $lvl];
            }
            $r['max'] = 1;
            out(['code' => $r['code'], 'max' => (int)$r['max'], 'used' => $used($r['code'])]);
        }
        $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($b['c'] ?? ($_GET['c'] ?? ''))));
        if (!ipCount('ipfails', 60)) fail('Zu viele falsche Versuche – bitte später noch einmal', 429);
        $r = $c !== '' ? q('SELECT code, max, lvl, off FROM invites WHERE code = ?', [$c])->fetch(PDO::FETCH_ASSOC) : null;
        if (!$r) { ipBump('ipfails'); fail('Diesen Einladungscode gibt es nicht', 404); }
        if ((int)($r['off'] ?? 0) === 1 && !($a === 'activate' && preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dev) && q('SELECT 1 FROM acts WHERE code = ? AND dev = ?', [$c, $dev])->fetch())) fail('Dieser Einladungscode gilt nicht mehr – frag nach dem neuen', 410);
        $max = 1; $n = $used($c); $left = max(0, $max - $n);
        $inv = false;
        if ($a === 'invinfo') out(['ok' => true, 'max' => $max, 'left' => $left]);
        if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dev)) fail('Gerät fehlt', 400);
        if (q('SELECT 1 FROM acts WHERE code = ? AND dev = ?', [$c, $dev])->fetch()) out(['ok' => true, 'left' => $left, 'invite' => $inv]);
        if ($n >= $max) fail('Dieser Code wurde schon benutzt – jeder bekommt seinen eigenen. Frag nach einem neuen.', 403);
        q('INSERT INTO acts (code, dev, t) VALUES (?, ?, ?)', [$c, $dev, time()]);
        out(['ok' => true, 'left' => 0, 'invite' => $inv]);
    }

    if ($a === 'feedback') {
        $b = body();
        $kind = in_array($b['kind'] ?? '', ['fehler', 'idee', 'lob', 'absturz'], true) ? $b['kind'] : 'idee';
        if (!ipCount($kind === 'absturz' ? 'ipcrash' : 'ipfeed', $kind === 'absturz' ? 20 : 10)) fail('Gerade zu viel Feedback von hier – bitte später noch einmal', 429);
        $text = trim(mb_substr((string)($b['text'] ?? ''), 0, 8000));
        if ($text === '') fail('Bitte etwas schreiben', 400);
        $imgs = [];
        foreach (array_slice(is_array($b['images'] ?? null) ? $b['images'] : [], 0, 5) as $u) {
            if (!is_string($u) || !preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', $u, $m)) continue;
            $bin = base64_decode($m[2], true); if ($bin === false || strlen($bin) > 3000000) continue;
            $imgs[] = [$m[1] === 'jpeg' ? 'jpg' : $m[1], $bin];
        }
        ipBump($kind === 'absturz' ? 'ipcrash' : 'ipfeed');
        $used = 0; foreach (glob(feedDir() . '/*/*') ?: [] as $f) $used += (int)@filesize($f);
        $need = strlen($text); foreach ($imgs as [, $bin]) $need += strlen($bin);
        $free = function_exists('disk_free_space') ? @disk_free_space(DATA_DIR) : false;
        if ($used + $need > 500000000 || ($free !== false && $free - $need < MIN_FREE)) fail('Feedback kann gerade nicht gespeichert werden – bitte per E-Mail schicken', 507);
        $dir = DATA_DIR . '/feedback/' . date('Y-m-d_His') . '_' . $kind . '_' . bin2hex(random_bytes(3));
        if (!@mkdir($dir, 0700, true)) fail('Feedback konnte nicht gespeichert werden', 500);
        @file_put_contents($dir . '/feedback.txt', $text . "\n");
        foreach ($imgs as $i => [$ext, $bin]) @file_put_contents($dir . '/bild-' . ($i + 1) . '.' . $ext, $bin);
        $to = $kind === 'absturz' ? '' : (string)(cfg()['feedback_to'] ?? '');
        if ($to !== '') {
            $bd = 'fm' . bin2hex(random_bytes(8));
            $msg = "--$bd\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n";
            foreach ($imgs as $i => [$ext, $bin]) $msg .= "--$bd\r\nContent-Type: image/$ext\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"bild-" . ($i + 1) . ".$ext\"\r\n\r\n" . chunk_split(base64_encode($bin)) . "\r\n";
            $msg .= "--$bd--\r\n";
            $subj = ['fehler' => 'Fehler', 'idee' => 'Idee', 'lob' => 'Lob'][$kind] . ' – Finanz MAMI';
            if (smtpSend($to, $subj, $msg, "multipart/mixed; boundary=\"$bd\"")) @touch($dir . '/.mailed');
        }
        out(['ok' => true]);
    }
    // Versions-Ping
    if ($a === 'ping') {
        $b = body(); $dev = (string)($b['dev'] ?? '');
        if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dev)) fail('Gerät fehlt', 400);
        $ver = preg_replace('/[^0-9.]/', '', (string)($b['ver'] ?? '')); $form = in_array($b['form'] ?? '', ['phone', 'tablet', 'pc', 'laptop'], true) ? $b['form'] : 'phone';
        $role = ($b['role'] ?? '') === 'Entwickler' ? 'dev' : 'tester';
        db()->exec('CREATE TABLE IF NOT EXISTS pings (h TEXT PRIMARY KEY, ver TEXT, form TEXT, role TEXT, t INTEGER)');
        q('INSERT OR REPLACE INTO pings (h, ver, form, role, t) VALUES (?, ?, ?, ?, ?)', [hash('sha256', 'ping|' . $dev), substr($ver, 0, 12), $form, $role, time()]);
        out(['ok' => true]);
    }
    // Dev-Übersicht
    if ($a === 'devstats') {
        devCheck();
        db()->exec('CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, owner TEXT UNIQUE, max INTEGER, lvl INTEGER DEFAULT 1, created INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
        try { db()->exec('ALTER TABLE invites ADD COLUMN off INTEGER DEFAULT 0'); } catch (Throwable $e) { }
        db()->exec('CREATE TABLE IF NOT EXISTS pings (h TEXT PRIMARY KEY, ver TEXT, form TEXT, role TEXT, t INTEGER)');
        $inv = q('SELECT i.code, i.max, i.lvl, i.created, COUNT(a.dev) AS used, MAX(a.t) AS last FROM invites i LEFT JOIN acts a ON a.code = i.code WHERE COALESCE(i.off, 0) = 0 GROUP BY i.code ORDER BY i.lvl, i.created DESC LIMIT 60')->fetchAll(PDO::FETCH_ASSOC);
        $since = time() - 14 * 86400;
        $vers = q('SELECT ver, form, role, COUNT(*) AS n FROM pings WHERE t > ? GROUP BY ver, form, role ORDER BY ver DESC', [$since])->fetchAll(PDO::FETCH_ASSOC);
        $act7 = (int)q('SELECT COUNT(*) FROM pings WHERE t > ?', [time() - 7 * 86400])->fetchColumn();
        $acts = (int)q('SELECT COUNT(*) FROM acts')->fetchColumn();
        out(['invites' => $inv, 'versions' => $vers, 'active7' => $act7, 'activations' => $acts]);
    }
    if ($a === 'feedlist') {
        devCheck(); $list = [];
        foreach (array_reverse(glob(feedDir() . '/*', GLOB_ONLYDIR) ?: []) as $d) {
            if (count($list) >= 300) break; $id = basename($d); $p = explode('_', $id);
            $ts = strtotime(($p[0] ?? '') . ' ' . substr($p[1] ?? '', 0, 2) . ':' . substr($p[1] ?? '', 2, 2) . ':' . substr($p[1] ?? '', 4, 2)) ?: filemtime($d);
            $list[] = ['id' => $id, 'kind' => $p[2] ?? 'idee', 'ts' => $ts, 'text' => (string)@file_get_contents($d . '/feedback.txt'),
                'images' => count(glob($d . '/bild-*') ?: []), 'read' => is_file($d . '/.read'), 'mailed' => is_file($d . '/.mailed')];
        }
        out(['items' => $list]);
    }
    if ($a === 'feedimg') {
        devCheck(); $d = feedPath((string)($_GET['id'] ?? '')); $n = max(1, (int)($_GET['n'] ?? 1));
        $f = (glob($d . '/bild-' . $n . '.*') ?: [])[0] ?? null; if (!$f) fail('Nicht gefunden', 404);
        $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION)); $mime = $ext === 'jpg' ? 'jpeg' : $ext;
        out(['d' => 'data:image/' . $mime . ';base64,' . base64_encode((string)file_get_contents($f))]);
    }
    if ($a === 'feeddel') {
        devCheck(); $d = feedPath((string)(body()['id'] ?? ''));
        foreach (array_merge(glob($d . '/*') ?: [], glob($d . '/.[!.]*') ?: []) as $f) if (is_file($f)) @unlink($f);
        if (!@rmdir($d)) fail('Konnte nicht gelöscht werden', 500);
        out(['ok' => true]);
    }
    if ($a === 'feedread') {
        devCheck(); $d = feedPath((string)(body()['id'] ?? '')); if (!empty(body()['unread'])) @unlink($d . '/.read'); else @touch($d . '/.read'); out(['ok' => true]);
    }

    if ($a === 'create') {
        $b = body(); $id = strtolower((string)($b['vault'] ?? '')); $auth = strtolower((string)($b['auth'] ?? ''));
        if (!preg_match('/^[a-f0-9]{32}$/', $id) || !preg_match('/^[a-f0-9]{64}$/', $auth)) fail('Ungültige Anfrage', 400);
        $have = q('SELECT auth FROM vaults WHERE id = ?', [$id])->fetchColumn();
        if ($have !== false) { if (hash_equals((string)$have, hash('sha256', $auth))) out(['ok' => true]); fail('Diese Nummer ist schon vergeben', 409); }
        if (!ipCount('ipcreate', MAX_CREATE_PER_HOUR)) fail('Zu viele neue Kopplungen – bitte später noch einmal', 429);
        $all = q('SELECT n, since FROM ipcreate WHERE ip = ?', ['*'])->fetch();
        if ($all && (int)$all['since'] > time() - 3600 && (int)$all['n'] >= MAX_CREATE_ALL_HOUR) fail('Gerade zu viele neue Kopplungen – bitte später noch einmal', 429);
        if ($all && (int)$all['since'] > time() - 3600) q('UPDATE ipcreate SET n = n + 1 WHERE ip = ?', ['*']);
        else q('INSERT INTO ipcreate (ip, n, since) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET n = 1, since = excluded.since', ['*', time()]);
        ipBump('ipcreate');
        if (random_int(1, 20) === 1) q('DELETE FROM vaults WHERE size = 0 AND rev = 0 AND created < ?', [time() - 7 * 86400]);
        q('INSERT INTO vaults (id, auth, created, used) VALUES (?, ?, ?, ?)', [$id, hash('sha256', $auth), time(), time()]);
        out(['ok' => true]);
    }

    if ($a === 'pull') {
        $v = authVault();
        $since = max(0, (int)($_GET['since'] ?? 0));
        $s = q('SELECT h, b, rev FROM docs WHERE vault = ? AND rev > ? ORDER BY rev LIMIT 2000', [$v['id'], $since]);
        $docs = []; $last = $since; $bytes = 0; $cut = false;
        foreach ($s as $r) {
            $n = strlen((string)$r['b']);
            if ($docs && $bytes + $n > 4000000) { $cut = true; break; }
            $docs[] = ['h' => $r['h'], 'b' => $r['b'], 'rev' => (int)$r['rev']]; $last = (int)$r['rev']; $bytes += $n;
        }
        $more = $cut || count($docs) === 2000;
        out(['rev' => $more ? $last : (int)$v['rev'], 'docs' => $docs, 'more' => $more]);
    }

    if ($a === 'push') {
        $v = authVault();
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 40000000) fail('Zu viele Daten auf einmal', 413);
        $ops = body()['ops'] ?? null;
        if (!is_array($ops) || count($ops) > 5000) fail('Ungültige Anfrage', 400);
        $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
        $cur = q('SELECT rev, size FROM vaults WHERE id = ?', [$v['id']])->fetch();
        $rev = (int)$cur['rev']; $size = (int)$cur['size']; $start = $size;
        $others = (int)(q('SELECT COALESCE(SUM(size), 0) FROM vaults WHERE id <> ?', [$v['id']])->fetchColumn() ?: 0);
        $free = false; try { if (function_exists('disk_free_space')) $free = @disk_free_space(DATA_DIR); } catch (\Throwable $e) { $free = false; }
        $old = $pdo->prepare('SELECT LENGTH(b) FROM docs WHERE vault = ? AND h = ?');
        $put = $pdo->prepare('INSERT INTO docs (vault, h, b, rev) VALUES (?, ?, ?, ?) ON CONFLICT(vault, h) DO UPDATE SET b = excluded.b, rev = excluded.rev');
        foreach ($ops as $op) {
            $h = (string)($op['h'] ?? ''); $b = isset($op['b']) && is_string($op['b']) ? $op['b'] : null;
            if (!preg_match('/^[A-Za-z0-9_-]{20,64}$/', $h)) continue;
            if ($b !== null && (strlen($b) > MAX_BLOB || !preg_match('/^[A-Za-z0-9_\-]+$/', $b))) continue;
            $old->execute([$v['id'], $h]); $was = (int)($old->fetchColumn() ?: 0);
            $size += strlen((string)$b) - $was;
            if ($size > MAX_VAULT) { $pdo->exec('ROLLBACK'); fail('Speicher voll – bitte alte Belegfotos löschen', 413); }
            if ($size > $start && ($others + $size > MAX_TOTAL || ($free !== false && $free - ($size - $start) < MIN_FREE))) { $pdo->exec('ROLLBACK'); fail('Der Server ist gerade voll – bitte später noch einmal', 507); }
            $rev++;
            $put->execute([$v['id'], $h, $b, $rev]);
        }
        q('UPDATE vaults SET rev = ?, size = ? WHERE id = ?', [$rev, max(0, $size), $v['id']]);
        $pdo->exec('COMMIT');
        out(['rev' => $rev]);
    }

    if ($a === 'wipe') {
        $v = authVault();
        q('DELETE FROM docs WHERE vault = ?', [$v['id']]);
        q('DELETE FROM vaults WHERE id = ?', [$v['id']]);
        out(['ok' => true]);
    }

    fail('Unbekannte Aktion', 404);
} catch (Throwable $e) {
    fail('Serverfehler', 500);
}
