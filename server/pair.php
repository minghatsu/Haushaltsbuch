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
function ipH(): string { return hash('sha256', 'invip|' . ip()); }
function invCols(): void {
    foreach (['name TEXT', 'given INTEGER', 'seen INTEGER', 'dl INTEGER', 'dlform TEXT', 'app INTEGER', 'iph TEXT', 'remind INTEGER', 'ios INTEGER', 'src TEXT'] as $col) { try { db()->exec('ALTER TABLE invites ADD COLUMN ' . $col); } catch (Throwable $e) { } }
}
// Testplätze: gemeinsame Grenze für alle Tester zusammen (der Entwickler kann sie ändern)
function invCap(): int {
    db()->exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)');
    $v = q('SELECT v FROM kv WHERE k = ?', ['invcap'])->fetchColumn();
    return $v === false ? DEV_MAX : max(1, min(100000, (int)$v));
}
function invUsed(): int {
    db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
    return (int)q('SELECT COUNT(DISTINCT a.dev) FROM acts a JOIN invites i ON i.code = a.code WHERE COALESCE(i.off, 0) = 0')->fetchColumn();
}
function invTester(string $dev): bool {
    return $dev !== '' && (bool)q('SELECT 1 FROM acts a JOIN invites i ON i.code = a.code WHERE a.dev = ? AND COALESCE(i.off, 0) = 0 LIMIT 1', [$dev])->fetch();
}
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
    foreach (['ipinvseen', 'ipactwait', 'ipcrash'] as $t) $pdo->exec("CREATE TABLE IF NOT EXISTS $t (ip TEXT PRIMARY KEY, n INTEGER, since INTEGER)");
    foreach (['ipcreate', 'ipfails', 'ipfeed', 'ipcrash', 'ipinvseen', 'ipactwait'] as $t) { try { $pdo->exec("DELETE FROM $t WHERE length(ip) <> 64"); } catch (Throwable $e) { } }
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $i = 0; foreach ($p as $v) { $i++; $s->bindValue($i, $v, is_int($v) ? PDO::PARAM_INT : (is_null($v) ? PDO::PARAM_NULL : PDO::PARAM_STR)); } $s->execute(); return $s; }

/* Missbrauchsschutz: nur eine Prüfsumme der IP-Adresse, Einträge älter als ein Tag werden gelöscht */
function ipK(): string { return hash('sha256', 'rl|' . ip()); }
function ipCount(string $table, int $limit): bool {
    if (random_int(1, 50) === 1) q("DELETE FROM $table WHERE since < ?", [time() - 86400]);
    $r = q("SELECT n, since FROM $table WHERE ip = ?", [ipK()])->fetch();
    return !($r && (int)$r['since'] > time() - 3600 && (int)$r['n'] >= $limit);
}
function ipBump(string $table): void {
    $r = q("SELECT n, since FROM $table WHERE ip = ?", [ipK()])->fetch();
    if (!$r || (int)$r['since'] < time() - 3600) q("INSERT OR REPLACE INTO $table (ip, n, since) VALUES (?, 1, ?)", [ipK(), time()]);
    else q("UPDATE $table SET n = n + 1 WHERE ip = ?", [ipK()]);
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
// Link für Posts: ein öffentlicher Link, jeder Besucher bekommt seinen eigenen Code
const PUB_DAY = 20;
function kvGet(string $k): ?string { db()->exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)'); $v = q('SELECT v FROM kv WHERE k = ?', [$k])->fetchColumn(); return $v === false ? null : (string)$v; }
function kvSet(string $k, string $v): void { db()->exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)'); q('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', [$k, $v]); }
function pubTables(): void {
    db()->exec('CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, owner TEXT UNIQUE, max INTEGER, lvl INTEGER DEFAULT 1, created INTEGER)');
    db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
    try { db()->exec('ALTER TABLE invites ADD COLUMN off INTEGER DEFAULT 0'); } catch (Throwable $e) { }
    invCols();
}
function pubToday(): int { return (int)q("SELECT COUNT(*) FROM invites WHERE src = 'link' AND created >= ?", [time() - 86400])->fetchColumn(); }
function pubInfo(): array {
    $tok = kvGet('pubtok') ?? '';
    return ['tok' => $tok, 'on' => $tok !== '' && kvGet('pubon') !== '0', 'today' => pubToday(), 'day' => PUB_DAY,
        'total' => (int)q("SELECT COUNT(*) FROM invites WHERE src = 'link'")->fetchColumn(),
        'act' => (int)q("SELECT COUNT(DISTINCT a.code) FROM acts a JOIN invites i ON i.code = a.code WHERE i.src = 'link'")->fetchColumn(),
        'slots' => invUsed(), 'cap' => invCap()];
}
function pubNewTok(): string { $abc = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'; $t = ''; for ($i = 0; $i < 8; $i++) $t .= $abc[random_int(0, strlen($abc) - 1)]; return $t; }
function nudgeTable(): void { db()->exec('CREATE TABLE IF NOT EXISTS nudges (code TEXT PRIMARY KEY, t INTEGER, ver TEXT, frm TEXT, items TEXT)'); }
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
            elseif (invTester($dev)) $lvl = 1;
            if ($lvl === null) fail('Einladen geht nur auf dem Gerät, mit dem du die App freigeschaltet hast', 403);
            $cap = invCap(); $tot = invUsed();
            if ($lvl === 1 && $tot >= $cap) out(['full' => true, 'slots' => $tot, 'cap' => $cap]);
            $fresh = $a === 'invrenew' || !empty($b['fresh']);
            $mine = $lvl === 0 ? 'lvl = 0' : "owner LIKE ? ESCAPE '\\'";
            $mp = $lvl === 0 ? [] : [str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $dev) . '#%'];
            $r = null;
            invCols();
            if (!$fresh) $r = q("SELECT code, max, lvl FROM invites WHERE $mine AND COALESCE(off, 0) = 0 AND given IS NULL AND seen IS NULL AND code NOT IN (SELECT code FROM acts) ORDER BY created DESC, rowid DESC LIMIT 1", $mp)->fetch(PDO::FETCH_ASSOC) ?: null;
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
            out(['code' => $r['code'], 'max' => (int)$r['max'], 'used' => $used($r['code']), 'slots' => $tot, 'cap' => $cap]);
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
        if (invUsed() >= invCap()) fail('Alle Testplätze sind gerade vergeben – frag die Person, die dich eingeladen hat.', 403);
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
    // ---- Einladungen: Verlauf (verschickt → Seite geöffnet → geladen → App offen → freigeschaltet) ----
    if (in_array($a, ['invgive', 'invname', 'invseen', 'invdl', 'iosint', 'actwait', 'devinv', 'invremind'], true)) {
        db()->exec('CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, owner TEXT UNIQUE, max INTEGER, lvl INTEGER DEFAULT 1, created INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
        db()->exec('CREATE TABLE IF NOT EXISTS pings (h TEXT PRIMARY KEY, ver TEXT, form TEXT, role TEXT, t INTEGER)');
        try { db()->exec('ALTER TABLE invites ADD COLUMN off INTEGER DEFAULT 0'); } catch (Throwable $e) { }
        invCols(); $b = body();
        $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($b['c'] ?? ($_GET['c'] ?? ''))));
        if ($a === 'invgive' || $a === 'invname' || $a === 'invremind') {
            if ($c === '') fail('Code fehlt', 400);
            $h = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));
            if (preg_match('/^Dev\s/', $h)) devCheck();
            else { $dv = (string)($b['dev'] ?? ''); if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dv) || !q('SELECT 1 FROM invites WHERE code = ? AND owner = ?', [$c, $dv . '#' . $c])->fetch()) fail('Nicht erlaubt', 403); }
            $name = mb_substr(trim((string)($b['name'] ?? '')), 0, 40);
            if ($a === 'invgive') q('UPDATE invites SET given = COALESCE(given, ?), name = CASE WHEN ? <> \'\' THEN ? ELSE name END WHERE code = ?', [time(), $name, $name, $c]);
            elseif ($a === 'invname') q('UPDATE invites SET name = ? WHERE code = ?', [$name, $c]);
            else q('UPDATE invites SET remind = ? WHERE code = ?', [time(), $c]);
            out(['ok' => true]);
        }
        if ($a === 'iosint') {
            // iPhone-Nutzer merkt sich für die iPhone-App vor (Code ist persönlich)
            if (!ipCount('ipinvseen', 120)) out(['ok' => false]); ipBump('ipinvseen');
            if ($c === '') out(['ok' => false]);
            q('UPDATE invites SET seen = COALESCE(seen, ?), ios = COALESCE(ios, ?), iph = ? WHERE code = ? AND COALESCE(off, 0) = 0', [time(), time(), ipH(), $c]);
            out(['ok' => true]);
        }
        if ($a === 'invseen' || $a === 'invdl') {
            if (!ipCount('ipinvseen', 120)) out(['ok' => false]); ipBump('ipinvseen');
            if ($c === '') out(['ok' => false]);
            if ($a === 'invseen') q('UPDATE invites SET seen = COALESCE(seen, ?), iph = ? WHERE code = ? AND COALESCE(off, 0) = 0', [time(), ipH(), $c]);
            else { $f = in_array($b['f'] ?? ($_GET['f'] ?? ''), ['apk', 'zip', 'ios'], true) ? ($b['f'] ?? $_GET['f']) : 'apk';
                q('UPDATE invites SET seen = COALESCE(seen, ?), dl = COALESCE(dl, ?), dlform = ?, iph = ? WHERE code = ? AND COALESCE(off, 0) = 0', [time(), time(), $f, ipH(), $c]); }
            out(['ok' => true]);
        }
        if ($a === 'actwait') {
            // App ist installiert, aber noch nicht freigeschaltet: passende Einladung über dieselbe Internetverbindung finden
            // (Codes vom Link für Posts nur kurz nach dem Download: im Mobilfunk teilen sich viele Fremde eine Adresse)
            if (!ipCount('ipactwait', 30)) out(['c' => '']); ipBump('ipactwait');
            $r = q('SELECT code FROM invites WHERE iph = ? AND COALESCE(off, 0) = 0 AND code NOT IN (SELECT code FROM acts) AND COALESCE(seen, dl, given, created) > ? AND (COALESCE(src, ?) <> ? OR dl > ?) ORDER BY COALESCE(dl, seen) DESC LIMIT 1', [ipH(), time() - 14 * 86400, '', 'link', time() - 3 * 3600])->fetch(PDO::FETCH_ASSOC);
            if ($r) { q('UPDATE invites SET app = COALESCE(app, ?) WHERE code = ?', [time(), $r['code']]); out(['c' => $r['code']]); }
            out(['c' => '']);
        }
        if ($a === 'devinv') {
            devCheck(); $L = []; nudgeTable();
            foreach (q('SELECT code, name, owner, created, given, seen, dl, dlform, app, remind, lvl, ios, src FROM invites WHERE COALESCE(off, 0) = 0 AND (given IS NOT NULL OR code IN (SELECT code FROM acts)) ORDER BY COALESCE(given, created) DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC) as $x) {
                $act = q('SELECT dev, t FROM acts WHERE code = ? ORDER BY t LIMIT 1', [$x['code']])->fetch(PDO::FETCH_ASSOC);
                $p = $act ? q('SELECT ver, form, role, t FROM pings WHERE h = ?', [hash('sha256', 'ping|' . $act['dev'])])->fetch(PDO::FETCH_ASSOC) : null;
                if ($p && $p['role'] === 'dev') continue;
                $via = '';
                if ((int)$x['lvl'] === 1) { $od = explode('#', (string)$x['owner'])[0];
                    $vr = q('SELECT i.code, i.name FROM acts a JOIN invites i ON i.code = a.code WHERE a.dev = ? ORDER BY a.t LIMIT 1', [$od])->fetch(PDO::FETCH_ASSOC);
                    if ($vr) $via = (string)($vr['name'] ?: $vr['code']); }
                $L[] = ['via' => $via, 'src' => (string)($x['src'] ?? ''), 'ios' => (int)($x['ios'] ?? 0), 'code' => $x['code'], 'name' => (string)($x['name'] ?? ''), 'given' => (int)($x['given'] ?? 0), 'seen' => (int)($x['seen'] ?? 0), 'dl' => (int)($x['dl'] ?? 0),
                    'dlform' => (string)($x['dlform'] ?? ''), 'app' => (int)($x['app'] ?? 0), 'remind' => (int)($x['remind'] ?? 0), 'act' => $act ? (int)$act['t'] : 0,
                    'ver' => $p ? (string)$p['ver'] : '', 'form' => $p ? (string)$p['form'] : '', 'last' => $p ? (int)$p['t'] : 0,
                    'nudge' => (int)(q('SELECT COALESCE(MAX(t), 0) FROM nudges WHERE code = ?', [$x['code']])->fetchColumn())];
            }
            out(['items' => $L, 'pub' => pubInfo(), 'slots' => invUsed(), 'cap' => invCap(), 'ios' => (int)q('SELECT COUNT(*) FROM invites WHERE ios IS NOT NULL AND COALESCE(off, 0) = 0')->fetchColumn()]);
        }
    }
    // ---- Link für Posts ----
    if ($a === 'publink') {
        devCheck(); pubTables(); $op = (string)(body()['op'] ?? 'get');
        if ($op === 'new' || ($op === 'on' && (kvGet('pubtok') ?? '') === '')) kvSet('pubtok', pubNewTok());
        if ($op === 'on' || $op === 'new') kvSet('pubon', '1');
        if ($op === 'off') kvSet('pubon', '0');
        out(pubInfo());
    }
    if ($a === 'pubcode') {
        pubTables(); $b = body();
        if (!ipCount('ipinvseen', 120)) fail('Zu viele Aufrufe – bitte später noch einmal', 429);
        ipBump('ipinvseen');
        $l = preg_replace('/[^A-Za-z0-9]/', '', (string)($b['l'] ?? ($_GET['l'] ?? '')));
        $tok = kvGet('pubtok') ?? '';
        if ($l === '' || $tok === '' || !hash_equals($tok, $l)) out(['gone' => true]);
        if (kvGet('pubon') === '0') out(['paused' => true]);
        // Derselbe Browser bekommt seinen Code von vorhin (nicht über die IP: im Mobilfunk teilen sich viele Fremde eine Adresse)
        $mine = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($b['b'] ?? ($_GET['b'] ?? ''))));
        if ($mine !== '' && q("SELECT 1 FROM invites WHERE code = ? AND src = 'link' AND COALESCE(off, 0) = 0", [$mine])->fetch()) out(['code' => $mine, 'fresh' => false]);
        if (invUsed() >= invCap()) out(['full' => true]);
        if (pubToday() >= PUB_DAY) out(['limit' => true]);
        if (!ipCount('ipcreate', MAX_CREATE_PER_HOUR)) fail('Zu viele neue Codes – bitte später noch einmal', 429);
        ipBump('ipcreate');
        $abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
        do { $c = ''; for ($i = 0; $i < 6; $i++) $c .= $abc[random_int(0, strlen($abc) - 1)]; } while (q('SELECT 1 FROM invites WHERE code = ?', [$c])->fetch());
        q('INSERT INTO invites (code, owner, max, lvl, created, given, seen, iph, src) VALUES (?, ?, 1, 0, ?, ?, ?, ?, ?)', [$c, 'pub#' . $c, time(), time(), time(), ipH(), 'link']);
        out(['code' => $c, 'fresh' => true]);
    }
    // ---- Update-Erinnerung: Entwickler bittet Tester, die neue Version zu holen ----
    if ($a === 'nudge') {
        devCheck(); nudgeTable(); $b = body();
        $from = mb_substr(trim((string)($b['from'] ?? '')), 0, 30);
        $clean = function ($L): array { $o = []; foreach (array_slice(is_array($L) ? $L : [], 0, 3) as $it) { $it = mb_substr(trim((string)$it), 0, 90); if ($it !== '') $o[] = $it; } return $o; };
        $items = $clean($b['items'] ?? []); $by = is_array($b['itemsBy'] ?? null) ? $b['itemsBy'] : [];
        $vers = (array)($b['vers'] ?? []); $n = 0;
        foreach (array_slice((array)($b['codes'] ?? []), 0, 200) as $c) {
            $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$c)); if ($c === '') continue;
            $v = substr(preg_replace('/[^0-9.]/', '', (string)($vers[$c] ?? '')), 0, 12);
            q('INSERT OR REPLACE INTO nudges (code, t, ver, frm, items) VALUES (?, ?, ?, ?, ?)', [$c, time(), $v, $from, json_encode(isset($by[$c]) ? $clean($by[$c]) : $items, JSON_UNESCAPED_UNICODE)]); $n++;
        }
        out(['ok' => true, 'n' => $n]);
    }
    if ($a === 'nudgeget') {
        nudgeTable(); $b = body(); $dev = (string)($b['dev'] ?? '');
        if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dev)) out(['t' => 0]);
        db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
        $r = q('SELECT n.t, n.ver, n.frm, n.items FROM nudges n JOIN acts a ON a.code = n.code WHERE a.dev = ? ORDER BY n.t DESC LIMIT 1', [$dev])->fetch(PDO::FETCH_ASSOC);
        if (!$r) out(['t' => 0]);
        out(['t' => (int)$r['t'], 'ver' => (string)$r['ver'], 'from' => (string)$r['frm'], 'items' => json_decode((string)$r['items'], true) ?: []]);
    }
    if ($a === 'invcap') {
        devCheck(); $n = (int)(body()['cap'] ?? 0);
        if ($n < 1 || $n > 100000) fail('Ungültige Zahl', 400);
        db()->exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)');
        q('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', ['invcap', (string)$n]);
        out(['ok' => true, 'slots' => invUsed(), 'cap' => invCap()]);
    }
    if ($a === 'invdel') {
        devCheck(); $b = body();
        $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($b['c'] ?? '')));
        if ($c === '') fail('Code fehlt', 400);
        q("UPDATE invites SET off = 1, owner = owner || '~' || ? WHERE code = ?", [(string)time(), $c]);
        out(['ok' => true]);
    }
    // Dev-Übersicht
    if ($a === 'devstats') {
        devCheck();
        db()->exec('CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, owner TEXT UNIQUE, max INTEGER, lvl INTEGER DEFAULT 1, created INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
        try { db()->exec('ALTER TABLE invites ADD COLUMN off INTEGER DEFAULT 0'); } catch (Throwable $e) { }
        db()->exec('CREATE TABLE IF NOT EXISTS ai (code TEXT PRIMARY KEY, on1 INTEGER, t INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS pings (h TEXT PRIMARY KEY, ver TEXT, form TEXT, role TEXT, t INTEGER)');
        $inv = q('SELECT i.code, i.max, i.lvl, i.created, COUNT(a.dev) AS used, MAX(a.t) AS last FROM invites i LEFT JOIN acts a ON a.code = i.code WHERE COALESCE(i.off, 0) = 0 GROUP BY i.code ORDER BY i.lvl, i.created DESC LIMIT 60')->fetchAll(PDO::FETCH_ASSOC);
        $since = time() - 14 * 86400;
        $vers = q('SELECT ver, form, role, COUNT(*) AS n FROM pings WHERE t > ? GROUP BY ver, form, role ORDER BY ver DESC', [$since])->fetchAll(PDO::FETCH_ASSOC);
        $act7 = (int)q('SELECT COUNT(*) FROM pings WHERE t > ?', [time() - 7 * 86400])->fetchColumn();
        $acts = (int)q('SELECT COUNT(*) FROM acts')->fetchColumn();
        $testers = [];
        foreach (q('SELECT a.code, a.dev, a.t, i.lvl FROM acts a JOIN invites i ON i.code = a.code ORDER BY a.t DESC LIMIT 500')->fetchAll(PDO::FETCH_ASSOC) as $x) {
            $p = q('SELECT ver, form, role, t FROM pings WHERE h = ?', [hash('sha256', 'ping|' . $x['dev'])])->fetch(PDO::FETCH_ASSOC);
            if ($p && $p['role'] === 'dev') continue;
            $testers[] = ['ai' => (int)(q('SELECT COALESCE(MAX(on1), 0) FROM ai WHERE code = ?', [$x['code']])->fetchColumn()), 'code' => $x['code'], 'since' => (int)$x['t'], 'ver' => $p ? $p['ver'] : '', 'form' => $p ? $p['form'] : '', 'seen' => $p ? (int)$p['t'] : 0];
        }
        out(['invites' => $inv, 'versions' => $vers, 'active7' => $act7, 'activations' => $acts, 'testers' => $testers]);
    }
    // ---- KI-Mami: Amtsbriefe genauer lesen (nur freigeschaltete Tester + Entwickler) ----
    if (in_array($a, ['mami', 'aiok', 'aistat', 'aiset'], true)) {
        db()->exec('CREATE TABLE IF NOT EXISTS acts (code TEXT NOT NULL, dev TEXT NOT NULL, t INTEGER, PRIMARY KEY (code, dev))');
        db()->exec('CREATE TABLE IF NOT EXISTS ai (code TEXT PRIMARY KEY, on1 INTEGER, t INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS aiuse (t INTEGER, code TEXT, inp INTEGER, cw INTEGER, cr INTEGER, outp INTEGER, usd REAL, ok INTEGER)');
        db()->exec('CREATE TABLE IF NOT EXISTS aicfg (k TEXT PRIMARY KEY, v TEXT)');
        $C = array_merge(['anthropic_key' => '', 'mami_model' => 'claude-haiku-5-5', 'mami_dev_day' => 15, 'credit_usd' => 100, 'credit_day' => 27,
            'price_in' => 0.10, 'price_cw' => 0.125, 'price_cr' => 0.01, 'price_out' => 0.50], cfg());
        if (is_file(__DIR__ . '/mami-config.php')) { $mc = include __DIR__ . '/mami-config.php'; if (is_array($mc)) $C = array_merge($C, $mc); }
        $ck = trim((string)$C['anthropic_key']); $hasKey = $ck !== '' && strpos($ck, 'HIER-') !== 0;
        $gv = fn(string $k, $d) => ($r = q('SELECT v FROM aicfg WHERE k = ?', [$k])->fetchColumn()) === false ? $d : $r;
        $budget = (float)$gv('budget', (string)$C['credit_usd']);
        $cday = max(1, min(28, (int)$gv('cday', (string)$C['credit_day'])));
        $pStart = (function () use ($cday): int { $y = (int)gmdate('Y'); $m = (int)gmdate('n'); if ((int)gmdate('j') < $cday) { $m--; if ($m < 1) { $m = 12; $y--; } } return gmmktime(0, 0, 0, $m, $cday, $y); })();
        $pEnd = (int)strtotime('+1 month', $pStart);
        $spent = (float)q('SELECT COALESCE(SUM(usd), 0) FROM aiuse WHERE t >= ?', [$pStart])->fetchColumn();
        $hdr = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));
        $isDev = false; if (preg_match('/^Dev\s/', $hdr)) { devCheck(); $isDev = true; }

        if ($a === 'aistat' || $a === 'aiset') {
            if (!$isDev) fail('Nur für den Entwickler', 403);
            if ($a === 'aiset') { $b = body();
                if (isset($b['c'])) { $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$b['c'])); q('INSERT OR REPLACE INTO ai (code, on1, t) VALUES (?, ?, ?)', [$c, empty($b['on']) ? 0 : 1, time()]); }
                if (isset($b['all'])) { foreach (q('SELECT DISTINCT code FROM acts')->fetchAll(PDO::FETCH_COLUMN) as $c) q('INSERT OR REPLACE INTO ai (code, on1, t) VALUES (?, ?, ?)', [$c, empty($b['all']) ? 0 : 1, time()]); }
                if (isset($b['budget'])) q('INSERT OR REPLACE INTO aicfg (k, v) VALUES (?, ?)', ['budget', (string)max(0, min(10000, (float)$b['budget']))]);
                if (isset($b['cday'])) q('INSERT OR REPLACE INTO aicfg (k, v) VALUES (?, ?)', ['cday', (string)max(1, min(28, (int)$b['cday']))]);
                if (isset($b['pause'])) q('INSERT OR REPLACE INTO aicfg (k, v) VALUES (?, ?)', ['pause', empty($b['pause']) ? '0' : '1']);
            }
            $budget = (float)$gv('budget', (string)$C['credit_usd']);
            $days = q("SELECT strftime('%Y-%m-%d', t, 'unixepoch') AS d, COUNT(*) AS n, SUM(usd) AS usd FROM aiuse WHERE t >= ? GROUP BY d ORDER BY d", [time() - 31 * 86400])->fetchAll(PDO::FETCH_ASSOC);
            $per = q('SELECT code, COUNT(*) AS n, SUM(usd) AS usd, MAX(t) AS last FROM aiuse WHERE t >= ? GROUP BY code', [$pStart])->fetchAll(PDO::FETCH_ASSOC);
            $tot = q('SELECT COUNT(*) AS n, COALESCE(SUM(inp),0) AS inp, COALESCE(SUM(cw),0) AS cw, COALESCE(SUM(cr),0) AS cr, COALESCE(SUM(outp),0) AS outp FROM aiuse WHERE t >= ?', [$pStart])->fetch(PDO::FETCH_ASSOC);
            $codes = q('SELECT DISTINCT a.code, COALESCE(x.on1, 0) AS on1 FROM acts a LEFT JOIN ai x ON x.code = a.code')->fetchAll(PDO::FETCH_ASSOC);
            out(['key' => $hasKey, 'model' => (string)$C['mami_model'], 'budget' => $budget, 'spent' => round($spent, 6), 'start' => $pStart, 'end' => $pEnd, 'cday' => $cday,
                'pause' => $gv('pause', '0') === '1', 'tot' => $tot, 'days' => $days, 'per' => $per, 'codes' => $codes,
                'prices' => ['in' => (float)$C['price_in'], 'cw' => (float)$C['price_cw'], 'cr' => (float)$C['price_cr'], 'out' => (float)$C['price_out']]]);
        }

        $b = body(); $dev = (string)($b['dev'] ?? ($_GET['dev'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $dev)) fail('dev', 400);
        $code = (string)(q('SELECT code FROM acts WHERE dev = ? ORDER BY t DESC LIMIT 1', [$dev])->fetchColumn() ?: '');
        $allowed = $isDev || ($code !== '' && (int)q('SELECT COALESCE(MAX(on1), 0) FROM ai WHERE code = ?', [$code])->fetchColumn() === 1);
        $why = !$hasKey ? 'nokey' : (!$allowed ? 'notyet' : ($gv('pause', '0') === '1' ? 'pause' : ($spent >= $budget ? 'budget' : '')));
        if ($a === 'aiok') out(['on' => $why === '', 'why' => $why]);
        if ($why !== '') fail($why, $why === 'nokey' ? 503 : 403);
        $n = (int)q('SELECT COUNT(*) FROM aiuse WHERE ok = 1 AND code = ? AND t >= ?', [$isDev ? '#dev' : $code, gmmktime(0, 0, 0)])->fetchColumn();
        if (!$isDev && $n >= (int)$C['mami_dev_day']) fail('limit', 429);
        $text = trim(mb_substr((string)($b['text'] ?? ''), 0, 16000)); if (mb_strlen($text) < 40) fail('short', 400);
        $lang = preg_replace('/[^a-z]/', '', (string)($b['lang'] ?? 'de')) ?: 'de';
        $L = ['de' => 'Deutsch', 'en' => 'English', 'tr' => 'Türkçe', 'ru' => 'Русский', 'uk' => 'Українська', 'pl' => 'Polski', 'ar' => 'العربية', 'ro' => 'Română']; $ln = $L[$lang] ?? 'Deutsch';
        $system = "Du liest deutsche Briefe von Ämtern und Behörden (Jobcenter, Finanzamt, Familienkasse, Krankenkasse, Rentenversicherung, Stadt, Gericht usw.) für eine Haushalts-App.\n"
            . "Der Text stammt aus einer Texterkennung und kann Fehler und Spalten-Durcheinander enthalten. Mit █ geschwärzte Stellen sind persönliche Daten – ignoriere sie und rate sie nicht.\n"
            . "Antworte AUSSCHLIESSLICH mit einem JSON-Objekt ohne Text davor oder danach, Felder (unbekannt = null):\n"
            . "{\"from\": Behörde kurz, \"kind\": \"mit\" (Unterlagen/Mitwirkung) | \"bes\" (Bescheid) | \"bew\" (Bewilligung) | \"abl\" (Ablehnung) | \"rueck\" (Rückforderung) | \"mahn\" (Mahnung) | \"ein\" (Einladung/Termin) | \"anh\" (Anhörung) | \"info\",\n"
            . " \"date\": Briefdatum \"YYYY-MM-DD\", \"due\": wichtigste Frist \"YYYY-MM-DD\", \"term\": Termin \"YYYY-MM-DD\", \"time\": \"HH:MM\",\n"
            . " \"money\": \"pay\" (muss zahlen) | \"back\" (bekommt einmalig Geld) | \"month\" (laufende Leistung) | \"none\", \"amt\": Betrag als Zahl (bei Spalten der Gesamtbetrag),\n"
            . " \"docs\": [einzureichende Unterlagen, kurz], \"warn\": true wenn Kürzung/Sanktion/Versagung/Mahngebühr/Vollstreckung droht,\n"
            . " \"sum\": [2 bis 4 sehr kurze einfache Sätze auf $ln in Du-Form: was drinsteht und was zu tun ist], \"todo\": [bis zu 4 kurze Aufgaben auf $ln]}\n"
            . "Erfinde nichts. Was nicht im Text steht, ist null.";
        $payload = json_encode(['model' => (string)$C['mami_model'], 'max_tokens' => 900,
            'system' => [['type' => 'text', 'text' => $system, 'cache_control' => ['type' => 'ephemeral']]],
            'messages' => [['role' => 'user', 'content' => "Brief:\n\n" . $text]]], JSON_UNESCAPED_UNICODE);
        $h = ['Content-Type: application/json', 'x-api-key: ' . $ck, 'anthropic-version: 2023-06-01']; $hc = 0; $resp = '';
        if (function_exists('curl_init')) { $ch = curl_init('https://api.anthropic.com/v1/messages');
            curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_HTTPHEADER => $h, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_CONNECTTIMEOUT => 10]);
            $resp = (string)curl_exec($ch); $hc = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        } else { $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => implode("\r\n", $h), 'content' => $payload, 'timeout' => 60, 'ignore_errors' => true]]);
            $resp = (string)@file_get_contents('https://api.anthropic.com/v1/messages', false, $ctx);
            foreach ($http_response_header ?? [] as $l) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $l, $m)) $hc = (int)$m[1]; }
        $j = json_decode($resp, true) ?: []; $u = $j['usage'] ?? [];
        $ti = (int)($u['input_tokens'] ?? 0); $tw = (int)($u['cache_creation_input_tokens'] ?? 0); $tr = (int)($u['cache_read_input_tokens'] ?? 0); $to = (int)($u['output_tokens'] ?? 0);
        $f = ($ti + $tw + $tr) > 100000 ? 5 : 1;
        $usd = $f * ($ti * $C['price_in'] + $tw * $C['price_cw'] + $tr * $C['price_cr'] + $to * $C['price_out']) / 1e6;
        q('INSERT INTO aiuse (t, code, inp, cw, cr, outp, usd, ok) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [time(), $isDev ? '#dev' : $code, $ti, $tw, $tr, $to, $usd, ($hc >= 200 && $hc < 300) ? 1 : 0]);
        if ($hc < 200 || $hc >= 300) { @file_put_contents(DATA_DIR . '/ki-fehler.log', gmdate('c') . " $hc " . substr($resp, 0, 300) . "\n", FILE_APPEND); fail($hc === 429 || $hc === 529 ? 'busy' : 'ai', 502); }
        $txt = ''; foreach ((array)($j['content'] ?? []) as $c) if (($c['type'] ?? '') === 'text') $txt .= $c['text'];
        if (!preg_match('/\{[\s\S]*\}/', $txt, $m)) fail('ai', 502);
        $r = json_decode($m[0], true); if (!is_array($r)) fail('ai', 502);
        $dd = fn($v) => is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
        $ss = fn($v, $n) => is_string($v) ? mb_substr(trim($v), 0, $n) : null;
        $ll = function ($v, $n, $len) use ($ss) { $o = []; foreach ((array)$v as $x) { $x = $ss($x, $len); if ($x) $o[] = $x; if (count($o) >= $n) break; } return $o; };
        $res = ['from' => $ss($r['from'] ?? null, 60),
            'kind' => in_array($r['kind'] ?? '', ['mit', 'bes', 'bew', 'abl', 'rueck', 'mahn', 'ein', 'anh', 'info'], true) ? $r['kind'] : null,
            'date' => $dd($r['date'] ?? null), 'due' => $dd($r['due'] ?? null), 'term' => $dd($r['term'] ?? null),
            'time' => is_string($r['time'] ?? null) && preg_match('/^\d{1,2}:\d{2}$/', $r['time']) ? $r['time'] : null,
            'money' => in_array($r['money'] ?? '', ['pay', 'back', 'month', 'none'], true) ? $r['money'] : null,
            'amt' => is_numeric($r['amt'] ?? null) ? round(abs((float)$r['amt']), 2) : null,
            'docs' => $ll($r['docs'] ?? [], 10, 120), 'warn' => !empty($r['warn']), 'sum' => $ll($r['sum'] ?? [], 4, 240), 'todo' => $ll($r['todo'] ?? [], 4, 120)];
        if (!$res['sum'] && is_string($r['sum'] ?? null)) $res['sum'] = [$ss($r['sum'], 600)];
        out(['ok' => 1, 'r' => $res]);
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
