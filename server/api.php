<?php

header_remove('X-Powered-By'); /* PHP-Version nicht verraten */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Private-Network: true');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
header('X-Permitted-Cross-Domain-Policies: none');
if (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') header('Strict-Transport-Security: max-age=31536000');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_DIR', (function (): string {
    $fixed = __DIR__ . '/data-__DATA_SUFFIX__';
    if (strpos($fixed, '__DATA' . '_SUFFIX__') === false) return $fixed;
    $found = glob(__DIR__ . '/data-*', GLOB_ONLYDIR) ?: [];
    if ($found) { usort($found, fn($a, $b) => filemtime($b) <=> filemtime($a)); return $found[0]; }
    return __DIR__ . '/data-' . bin2hex(random_bytes(12));
})());
const DEPLOY_REPO = 'minghatsu/haushaltsbuch';
const DEPLOY_AUD = 'haushaltsbuch-deploy';
const GH_ISSUER = 'https://token.actions.githubusercontent.com';
const ALLOWED_COLS = ['tx', 'txb', 'fixed', 'months', 'debts', 'app'];

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $msg, int $code): void { out(['error' => $msg], $code); }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!is_dir(DATA_DIR)) {
        if (!@mkdir(DATA_DIR, 0700, true)) fail('Datenordner kann nicht angelegt werden', 500);
        @file_put_contents(DATA_DIR . '/index.html', '');
    }
    $pdo = new PDO('sqlite:' . DATA_DIR . '/haushaltsbuch.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA busy_timeout=5000');
    $pdo->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, created INTEGER, used INTEGER)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT, rev INTEGER NOT NULL, PRIMARY KEY (col, id))');
    $pdo->exec('CREATE INDEX IF NOT EXISTS docs_rev ON docs(rev)');
    return $pdo;
}
function meta(string $k): ?string {
    $s = db()->prepare('SELECT v FROM meta WHERE k = ?');
    $s->execute([$k]);
    $v = $s->fetchColumn();
    return $v === false ? null : $v;
}
function setMeta(string $k, string $v): void {
    db()->prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$k, $v]);
}
function body(): array {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw ?: '{}', true);
    return is_array($j) ? $j : [];
}
function newToken(): string {
    $t = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO tokens (hash, created, used) VALUES (?, ?, ?)')->execute([hash('sha256', $t), time(), time()]);
    return $t;
}
function requireAuth(): void {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    }
    if (!preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($h), $m)) fail('Nicht angemeldet', 401);
    $s = db()->prepare('UPDATE tokens SET used = ? WHERE hash = ?');
    $s->execute([time(), hash('sha256', strtolower($m[1]))]);
    if ($s->rowCount() !== 1) fail('Nicht angemeldet', 401);
    if (random_int(1, 50) === 1) db()->prepare('DELETE FROM tokens WHERE used < ?')->execute([time() - 180 * 86400]);
}
function appVersion(string $html): int {
    return preg_match('/name="hb-version" content="(\d+)"/', $html, $m) ? (int)$m[1] : 0;
}
function appFile(): string { return DATA_DIR . '/app.html'; }
function currentApp(): string { return is_file(appFile()) ? (string)file_get_contents(appFile()) : ''; }
/* GitHub-OIDC prüfen */
function b64u(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)); }
function derLen(int $l): string { if ($l < 128) return chr($l); $b = ltrim(pack('N', $l), "\0"); return chr(0x80 | strlen($b)) . $b; }
function derInt(string $x): string { if (ord($x[0]) > 127) $x = "\0" . $x; return "\x02" . derLen(strlen($x)) . $x; }
function jwkToPem(string $n, string $e): string {
    $ints = derInt($n) . derInt($e);
    $rsa = "\x30" . derLen(strlen($ints)) . $ints;
    $bit = "\x03" . derLen(strlen($rsa) + 1) . "\x00" . $rsa;
    $alg = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
    $spki = "\x30" . derLen(strlen($alg . $bit)) . $alg . $bit;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}
function httpGet(string $url): string {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_FOLLOWLOCATION => true]);
        $r = curl_exec($c);
        curl_close($c);
        return is_string($r) ? $r : '';
    }
    $r = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 15]]));
    return is_string($r) ? $r : '';
}
function githubKeys(bool $refresh): array {
    $f = DATA_DIR . '/github-keys.json';
    if ($refresh || !is_file($f) || filemtime($f) < time() - 86400) {
        $conf = json_decode(httpGet(GH_ISSUER . '/.well-known/openid-configuration'), true);
        $uri = is_array($conf) ? (string)($conf['jwks_uri'] ?? '') : '';
        $jwks = $uri !== '' && strpos($uri, GH_ISSUER . '/') === 0 ? httpGet($uri) : '';
        if (is_array(json_decode($jwks, true))) file_put_contents($f, $jwks);
    }
    $k = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    return is_array($k) ? ($k['keys'] ?? []) : [];
}
function githubBuildAllowed(string $jwt): bool {
    $p = explode('.', $jwt);
    if (count($p) !== 3) return false;
    $h = json_decode(b64u($p[0]), true);
    $c = json_decode(b64u($p[1]), true);
    if (!is_array($h) || !is_array($c) || ($h['alg'] ?? '') !== 'RS256') return false;
    $verified = false;
    foreach ([false, true] as $refresh) {
        foreach (githubKeys($refresh) as $k) {
            if (($k['kid'] ?? null) !== ($h['kid'] ?? '') || empty($k['n']) || empty($k['e'])) continue;
            $verified = openssl_verify($p[0] . '.' . $p[1], b64u($p[2]), jwkToPem(b64u($k['n']), b64u($k['e'])), OPENSSL_ALGO_SHA256) === 1;
            break 2;
        }
    }
    if (!$verified) return false;
    $now = time();
    return ($c['iss'] ?? '') === GH_ISSUER
        && ($c['aud'] ?? '') === DEPLOY_AUD
        && strtolower((string)($c['repository'] ?? '')) === DEPLOY_REPO
        && ($c['ref'] ?? '') === 'refs/heads/main'
        && (int)($c['exp'] ?? 0) > $now - 60
        && (int)($c['iat'] ?? 0) < $now + 300;
}

/* Schutz gegen Passwort-Raten */
function loginLocked(): int {
    $f = json_decode((string)(meta('fails') ?? '{}'), true) ?: [];
    $until = (int)($f['until'] ?? 0);
    return $until > time() ? $until - time() : 0;
}
function loginFailed(): void {
    $f = json_decode((string)(meta('fails') ?? '{}'), true) ?: [];
    $n = (int)($f['n'] ?? 0) + 1; $r = (int)($f['r'] ?? 0); $until = 0;
    if ($n >= 5) { $r++; $until = time() + [60, 300, 900, 3600][min(3, $r - 1)]; $n = 0; }
    setMeta('fails', json_encode(['n' => $n, 'r' => $r, 'until' => $until]));
    /* Gesamtzahl falscher Versuche: die App warnt, wenn sie seit dem letzten Abgleich gestiegen ist */
    setMeta('bad', (string)((int)(meta('bad') ?? 0) + 1)); setMeta('bad_t', (string)time());
}
function loginOk(): void { setMeta('fails', '{}'); }
function fromHomeNetwork(): bool {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if ($ip === '' ) return false;
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) return true;
    if (preg_match('/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./', $ip)) return true;
    return false;
}

/* Zwei-Faktor */
function b32decode(string $b): string {
    $b = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $b)); $bits = ''; $out = '';
    foreach (str_split($b) as $c) $bits .= str_pad(decbin(strpos('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', $c)), 5, '0', STR_PAD_LEFT);
    foreach (str_split($bits, 8) as $byte) if (strlen($byte) === 8) $out .= chr(bindec($byte));
    return $out;
}
function b32encode(string $raw): string {
    $bits = ''; $out = '';
    foreach (str_split($raw) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    foreach (str_split($bits, 5) as $chunk) $out .= 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[bindec(str_pad($chunk, 5, '0'))];
    return $out;
}
function totpAt(string $secret, int $step): string {
    $h = hash_hmac('sha1', pack('N2', 0, $step), b32decode($secret), true);
    $o = ord($h[19]) & 15;
    $n = ((ord($h[$o]) & 127) << 24 | ord($h[$o + 1]) << 16 | ord($h[$o + 2]) << 8 | ord($h[$o + 3])) % 1000000;
    return str_pad((string)$n, 6, '0', STR_PAD_LEFT);
}
function totpCheck(string $secret, string $code, string $metaUsed = 'totp_used'): bool {
    $code = preg_replace('/\s+/', '', $code);
    if (preg_match('/^\d{6}$/', $code)) {
        $now = intdiv(time(), 30); $last = (int)(meta($metaUsed) ?? 0);
        for ($d = -1; $d <= 1; $d++) {
            $st = $now + $d;
            if ($st > $last && hash_equals(totpAt($secret, $st), $code)) { setMeta($metaUsed, (string)$st); return true; }
        }
        return false;
    }
    $norm = strtr(strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code)), ['0' => 'O', '1' => 'I', '8' => 'B']);
    if (strlen($norm) !== 10) return false;
    $list = json_decode((string)(meta('totp_recovery') ?? '[]'), true) ?: [];
    foreach ($list as $i => $h) {
        if (password_verify($norm, $h)) { array_splice($list, $i, 1); setMeta('totp_recovery', json_encode($list)); return true; }
    }
    return false;
}
function totpOn(): bool { return (string)(meta('totp') ?? '') !== ''; }
function resetRequested(): bool { return is_file(__DIR__ . '/passwort-zuruecksetzen.txt'); }

function checkPassword(string $pw): bool {
    $hash = meta('password');
    return $hash !== null && password_verify($pw, $hash);
}

try {
    $a = $_GET['a'] ?? '';

    if ($a === 'version') { db(); out(['version' => appVersion(currentApp())]); }

    if ($a === 'app') {
        db();
        $html = currentApp();
        if ($html === '') fail('Noch keine App-Version hochgeladen', 404);
        if (!empty($_GET['web'])) {
            $html = preg_replace('/<meta name="hb-server" content="[^"]*">/', '<meta name="hb-server" content="api.php">', $html, 1);
            $html = preg_replace('/<meta charset="utf-8">/', '<meta charset="utf-8"><link rel="manifest" href="manifest.json"><meta name="theme-color" content="#147A5B">', $html, 1);
        }
        /* Die App bringt ihre eigenen Sicherheitsregeln mit (CSP im <meta>); hier nur das Einbetten verbieten */
        header("Content-Security-Policy: frame-ancestors 'none'");
        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit;
    }

    if ($a === 'deploy') {
        db();
        if (!githubBuildAllowed((string)($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? ''))) { sleep(2); fail('Nicht erlaubt', 403); }
        $html = (string)file_get_contents('php://input');
        $v = appVersion($html);
        if (strlen($html) > 5000000 || strpos($html, 'id="loginBg"') === false || $v < 1) fail('Das ist keine gültige App-Version', 400);
        db();
        $cur = appVersion(currentApp());
        if ($v <= $cur) out(['version' => $cur, 'unchanged' => true]);
        $tmp = appFile() . '.tmp';
        if (file_put_contents($tmp, $html) === false || !rename($tmp, appFile())) fail('App-Version konnte nicht gespeichert werden', 500);
        out(['version' => $v]);
    }

    if ($a === 'status') out(['setup' => meta('password') === null || (resetRequested() && fromHomeNetwork()), 'reset' => meta('password') !== null && resetRequested() && fromHomeNetwork(), 'rev' => (int)(meta('rev') ?? 0)]);

    if ($a === 'setup') {
        $reset = meta('password') !== null && resetRequested();
        if (meta('password') !== null && !$reset) fail('Passwort ist schon festgelegt', 409);
        if (!fromHomeNetwork()) fail('Das Passwort kann nur im Heimnetz festgelegt werden', 403);
        if ($reset) {
            db()->exec('DELETE FROM tokens');
            foreach (['totp', 'totp_pending', 'totp_recovery', 'fails'] as $k) setMeta($k, '');
            @unlink(__DIR__ . '/passwort-zuruecksetzen.txt');
        }
        $pw = (string)(body()['password'] ?? '');
        if (mb_strlen($pw) < 8) fail('Das Passwort braucht mindestens 8 Zeichen', 400);
        setMeta('password', password_hash($pw, PASSWORD_DEFAULT));
        out(['token' => newToken()]);
    }

    if ($a === 'login') {
        $wait = loginLocked();
        if ($wait > 0) { $m = max(1, (int)ceil($wait / 60)); fail('Zu viele falsche Versuche – bitte in ' . $m . ($m === 1 ? ' Minute' : ' Minuten') . ' noch einmal', 429); }
        $pw = (string)(body()['password'] ?? '');
        if (!checkPassword($pw)) { loginFailed(); sleep(2); fail('Falsches Passwort', 403); }
        if (totpOn()) {
            $code = (string)(body()['code'] ?? '');
            if ($code === '') out(['need2fa' => true], 401);
            if (!totpCheck((string)meta('totp'), $code)) { loginFailed(); sleep(2); fail('Der Code stimmt nicht', 403); }
        }
        loginOk();
        out(['token' => newToken()]);
    }

    requireAuth();

    if ($a === 'pull') {
        $since = max(0, (int)($_GET['since'] ?? 0));
        $s = db()->prepare('SELECT col, id, data, rev FROM docs WHERE rev > ? ORDER BY rev');
        $s->execute([$since]);
        $docs = [];
        foreach ($s as $r) {
            $docs[] = ['col' => $r['col'], 'id' => $r['id'], 'data' => $r['data'] === null ? null : json_decode($r['data'], true), 'rev' => (int)$r['rev']];
        }
        out(['rev' => (int)(meta('rev') ?? 0), 'docs' => $docs, 'bad' => (int)(meta('bad') ?? 0), 'bad_t' => (int)(meta('bad_t') ?? 0)]);
    }

    if ($a === 'push') {
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 30000000) fail('Zu viele Daten auf einmal', 413);
        $ops = body()['ops'] ?? null;
        if (!is_array($ops) || count($ops) > 5000) fail('Ungültige Anfrage', 400);
        $pdo = db();
        $pdo->exec('BEGIN IMMEDIATE');
        $rev = (int)(meta('rev') ?? 0);
        $put = $pdo->prepare('INSERT INTO docs (col, id, data, rev) VALUES (?, ?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, rev = excluded.rev');
        foreach ($ops as $op) {
            $col = (string)($op['col'] ?? ''); $id = (string)($op['id'] ?? '');
            if (!in_array($col, ALLOWED_COLS, true) || $id === '' || strlen($id) > 200) continue;
            $data = array_key_exists('data', $op) && $op['data'] !== null ? json_encode($op['data'], JSON_UNESCAPED_UNICODE) : null;
            if ($data !== null && strlen($data) > 3000000) continue;
            $rev++;
            $put->execute([$col, $id, $data, $rev]);
        }
        setMeta('rev', (string)$rev);
        $pdo->exec('COMMIT');
        out(['rev' => $rev]);
    }

    if ($a === 'twofa') {
        out(['on' => totpOn(), 'recovery' => count(json_decode((string)(meta('totp_recovery') ?? '[]'), true) ?: [])]);
    }

    if ($a === 'twofaStart') {
        if (!checkPassword((string)(body()['password'] ?? ''))) { loginFailed(); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        $secret = b32encode(random_bytes(20));
        setMeta('totp_pending', $secret);
        out(['secret' => $secret, 'uri' => 'otpauth://totp/Haushaltsbuch?secret=' . $secret . '&issuer=Haushaltsbuch&digits=6&period=30']);
    }

    if ($a === 'twofaEnable') {
        $secret = (string)(meta('totp_pending') ?? '');
        if ($secret === '' || !totpCheck($secret, (string)(body()['code'] ?? ''), 'totp_pending_used')) { sleep(1); fail('Der Code stimmt nicht – Uhrzeit am Handy prüfen und den aktuellen Code eingeben', 403); }
        $codes = []; $hashes = [];
        for ($i = 0; $i < 8; $i++) {
            $c = strtoupper(substr(b32encode(random_bytes(8)), 0, 10));
            $codes[] = substr($c, 0, 5) . '-' . substr($c, 5);
            $hashes[] = password_hash($c, PASSWORD_DEFAULT);
        }
        setMeta('totp', $secret); setMeta('totp_pending', ''); setMeta('totp_recovery', json_encode($hashes));
        setMeta('totp_used', (string)(meta('totp_pending_used') ?? '0'));
        out(['recovery' => $codes]);
    }

    if ($a === 'twofaDisable') {
        $b = body();
        if (!checkPassword((string)($b['password'] ?? ''))) { loginFailed(); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        if (totpOn() && !totpCheck((string)meta('totp'), (string)($b['code'] ?? ''))) { loginFailed(); sleep(2); fail('Der Code stimmt nicht', 403); }
        foreach (['totp', 'totp_pending', 'totp_recovery'] as $k) setMeta($k, '');
        out(['ok' => true]);
    }

    if ($a === 'verify') {
        if (loginLocked() > 0) fail('Zu viele falsche Versuche – bitte später noch einmal', 429);
        if (!checkPassword((string)(body()['password'] ?? ''))) { loginFailed(); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        loginOk();
        out(['ok' => true]);
    }

    if ($a === 'logoutAll') {
        db()->exec('DELETE FROM tokens');
        out(['ok' => true]);
    }

    if ($a === 'password') {
        $b = body();
        if (!checkPassword((string)($b['old'] ?? ''))) { loginFailed(); sleep(2); fail('Das bisherige Passwort stimmt nicht', 403); }
        $new = (string)($b['new'] ?? '');
        if (mb_strlen($new) < 10) fail('Das neue Passwort braucht mindestens 10 Zeichen', 400);
        setMeta('password', password_hash($new, PASSWORD_DEFAULT));
        db()->exec('DELETE FROM tokens');
        out(['token' => newToken()]);
    }

    if ($a === 'logout') {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($h), $m)) db()->prepare('DELETE FROM tokens WHERE hash = ?')->execute([hash('sha256', strtolower($m[1]))]);
        out(['ok' => true]);
    }

    fail('Unbekannte Aktion', 404);
} catch (Throwable $e) {
    try { if (db()->inTransaction()) db()->exec('ROLLBACK'); } catch (Throwable $ignored) {}
    error_log('Haushaltsbuch: ' . $e->getMessage());
    fail('Serverfehler', 500);
}
