<?php

header_remove('X-Powered-By'); /* PHP-Version nicht verraten */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
header('X-Permitted-Cross-Domain-Policies: none');
header('Strict-Transport-Security: max-age=31536000');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

$CFG = ['mail_from' => 'Finanz MAMI <noreply@localhost>', 'app_name' => 'Finanz MAMI', 'signup' => true, 'max_accounts' => 1000, 'data_dir' => ''];
if (is_file(__DIR__ . '/config.php')) $CFG = array_merge($CFG, (array)(include __DIR__ . '/config.php'));
define('DATA_DIR', $CFG['data_dir'] !== '' ? $CFG['data_dir'] : (function (): string {
    foreach (['/cloud-*', '/data-*'] as $pat) {
        $found = array_values(array_filter(glob(__DIR__ . $pat, GLOB_ONLYDIR) ?: [], 'is_writable'));
        if ($found) { usort($found, fn($a, $b) => filemtime($b) <=> filemtime($a)); return $found[0]; }
    }
    return __DIR__ . '/cloud-' . bin2hex(random_bytes(12));
})());
const DEPLOY_REPO = 'minghatsu/haushaltsbuch';
const DEPLOY_AUD = 'haushaltsbuch-deploy';
const GH_ISSUER = 'https://token.actions.githubusercontent.com';
const ALLOWED_COLS = ['tx', 'txb', 'fixed', 'months', 'debts', 'app'];

function out($data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code): void { out(['error' => $msg], $code); }
function body(): array { static $b = null; if ($b === null) { $j = json_decode(file_get_contents('php://input') ?: '{}', true); $b = is_array($j) ? $j : []; } return $b; }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!is_dir(DATA_DIR)) {
        if (!@mkdir(DATA_DIR, 0700, true)) fail('Datenordner kann nicht angelegt werden', 500);
        @file_put_contents(DATA_DIR . '/.htaccess', "Require all denied\nDeny from all\n");
        @file_put_contents(DATA_DIR . '/index.html', '');
    }
    $pdo = new PDO('sqlite:' . DATA_DIR . '/konten.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode=WAL'); $pdo->exec('PRAGMA busy_timeout=5000'); $pdo->exec('PRAGMA foreign_keys=ON');
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL, created INTEGER, rev INTEGER NOT NULL DEFAULT 0,
        totp TEXT, totp_pending TEXT, totp_recovery TEXT, totp_used INTEGER DEFAULT 0, fails INTEGER DEFAULT 0, rounds INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0,
        reset_hash TEXT, reset_until INTEGER DEFAULT 0, reset_tries INTEGER DEFAULT 0)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created INTEGER, used INTEGER)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS docs (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, col TEXT NOT NULL, id TEXT NOT NULL, data TEXT, rev INTEGER NOT NULL, PRIMARY KEY (user_id, col, id))');
    $pdo->exec('CREATE INDEX IF NOT EXISTS docs_rev ON docs(user_id, rev)');
    try { $pdo->exec('ALTER TABLE users ADD COLUMN bad INTEGER DEFAULT 0'); } catch (Throwable $e) { }
    try { $pdo->exec('ALTER TABLE users ADD COLUMN bad_t INTEGER DEFAULT 0'); } catch (Throwable $e) { }
    $pdo->exec('CREATE TABLE IF NOT EXISTS ipfails (ip TEXT PRIMARY KEY, n INTEGER, since INTEGER)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function normEmail(string $e): string { return strtolower(trim($e)); }
function validEmail(string $e): bool { return strlen($e) <= 200 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false; }
function ip(): string { return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64); }

/* Limits */
function ipBlocked(): bool {
    $r = q('SELECT n, since FROM ipfails WHERE ip = ?', [ip()])->fetch();
    return $r && (int)$r['since'] > time() - 3600 && (int)$r['n'] >= 30;
}
function ipFail(): void {
    $r = q('SELECT n, since FROM ipfails WHERE ip = ?', [ip()])->fetch();
    if (!$r || (int)$r['since'] < time() - 3600) q('INSERT OR REPLACE INTO ipfails (ip, n, since) VALUES (?, 1, ?)', [ip(), time()]);
    else q('UPDATE ipfails SET n = n + 1 WHERE ip = ?', [ip()]);
}
function userFail(array $u): void {
    $n = (int)$u['fails'] + 1; $r = (int)$u['rounds']; $until = 0;
    if ($n >= 5) { $r++; $until = time() + [60, 300, 900, 3600][min(3, $r - 1)]; $n = 0; }
    q('UPDATE users SET fails = ?, rounds = ?, locked_until = ?, bad = COALESCE(bad, 0) + 1, bad_t = ? WHERE id = ?', [$n, $r, $until, time(), $u['id']]);
    ipFail();
}
function userOk(array $u): void { q('UPDATE users SET fails = 0, rounds = 0, locked_until = 0 WHERE id = ?', [$u['id']]); }
function lockedMsg(array $u): void {
    $w = (int)$u['locked_until'] - time();
    if ($w > 0) { $m = max(1, (int)ceil($w / 60)); fail('Zu viele falsche Versuche – bitte in ' . $m . ($m === 1 ? ' Minute' : ' Minuten') . ' noch einmal', 429); }
}
function userByEmail(string $e): ?array { $r = q('SELECT * FROM users WHERE email = ?', [normEmail($e)])->fetch(PDO::FETCH_ASSOC); return $r ?: null; }
function newToken(int $uid): string {
    $t = bin2hex(random_bytes(32));
    q('INSERT INTO tokens (hash, user_id, created, used) VALUES (?, ?, ?, ?)', [hash('sha256', $t), $uid, time(), time()]);
    return $t;
}
function authUser(): array {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    if (!preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($h), $m)) fail('Nicht angemeldet', 401);
    $hash = hash('sha256', strtolower($m[1]));
    $u = q('SELECT users.* FROM tokens JOIN users ON users.id = tokens.user_id WHERE tokens.hash = ?', [$hash])->fetch(PDO::FETCH_ASSOC);
    if (!$u) fail('Nicht angemeldet', 401);
    q('UPDATE tokens SET used = ? WHERE hash = ?', [time(), $hash]);
    if (random_int(1, 50) === 1) q('DELETE FROM tokens WHERE used < ?', [time() - 180 * 86400]);
    $u['token_hash'] = $hash;
    return $u;
}
function meta(string $k): ?string { $v = q('SELECT v FROM meta WHERE k = ?', [$k])->fetchColumn(); return $v === false ? null : $v; }
function setMeta(string $k, string $v): void { q('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', [$k, $v]); }
function sendMail(string $to, string $subject, string $text): bool {
    global $CFG;
    $headers = 'From: ' . $CFG['mail_from'] . "\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit";
    if (!empty($CFG['mail_log'])) { @file_put_contents($CFG['mail_log'], "To: $to\nSubject: $subject\n\n$text\n----\n", FILE_APPEND); return true; }
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers);
}
function checkPw(array $u, string $pw): bool { return password_verify($pw, (string)$u['pw']); }
function goodPassword(string $pw): ?string { return mb_strlen($pw) < 10 ? 'Das Passwort braucht mindestens 10 Zeichen' : null; }

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
function totpCheckRaw(string $secret, string $code, int $last, ?array &$recovery, int &$usedStep): bool {
    $code = preg_replace('/\s+/', '', $code);
    if (preg_match('/^\d{6}$/', $code)) {
        $now = intdiv(time(), 30);
        for ($d = -1; $d <= 1; $d++) {
            $st = $now + $d;
            if ($st > $last && hash_equals(totpAt($secret, $st), $code)) { $usedStep = $st; return true; }
        }
        return false;
    }
    $norm = strtr(strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code)), ['0' => 'O', '1' => 'I', '8' => 'B']);
    if (strlen($norm) !== 10) return false;
    if ($recovery === null) return false;
    foreach ($recovery as $i => $h) {
        if (password_verify($norm, $h)) { array_splice($recovery, $i, 1); return true; }
    }
    return false;
}

function userCode(array $u, string $code): bool {
    if ((string)$u['totp'] === '') return true;
    $rec = json_decode((string)($u['totp_recovery'] ?? '[]'), true) ?: [];
    $step = 0;
    if (!totpCheckRaw((string)$u['totp'], $code, (int)$u['totp_used'], $rec, $step)) return false;
    q('UPDATE users SET totp_used = MAX(totp_used, ?), totp_recovery = ? WHERE id = ?', [$step, json_encode($rec), $u['id']]);
    return true;
}

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


function appVersion(string $html): int { return preg_match('/name="hb-version" content="(\d+)"/', $html, $m) ? (int)$m[1] : 0; }
function appFile(): string { return DATA_DIR . '/app.html'; }
function currentApp(): string { return is_file(appFile()) ? (string)file_get_contents(appFile()) : ''; }

try {
    $a = $_GET['a'] ?? '';

    if ($a === 'version') { db(); out(['version' => appVersion(currentApp())]); }
    if ($a === 'app') {
        db(); $html = currentApp();
        if ($html === '') fail('Noch keine App-Version hochgeladen', 404);
        header('Content-Type: text/html; charset=utf-8'); echo $html; exit;
    }
    if ($a === 'deploy') {
        db();
        if (!githubBuildAllowed((string)($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? ''))) { sleep(2); fail('Nicht erlaubt', 403); }
        $html = (string)file_get_contents('php://input'); $v = appVersion($html);
        if (strlen($html) > 5000000 || strpos($html, 'id="loginBg"') === false || $v < 1) fail('Das ist keine gültige App-Version', 400);
        $cur = appVersion(currentApp());
        if ($v <= $cur) out(['version' => $cur, 'unchanged' => true]);
        $tmp = appFile() . '.tmp';
        if (file_put_contents($tmp, $html) === false || !rename($tmp, appFile())) fail('App-Version konnte nicht gespeichert werden', 500);
        out(['version' => $v]);
    }

    if ($a === 'status') { db(); out(['cloud' => true, 'signup' => (bool)$CFG['signup'], 'setup' => false]); }

    if (in_array($a, ['register', 'login', 'forgot', 'reset'], true) && ipBlocked()) fail('Zu viele Versuche von dieser Verbindung – bitte in einer Stunde noch einmal', 429);

    if ($a === 'register') {
        if (!$CFG['signup']) fail('Neue Konten sind gerade nicht möglich', 403);
        $b = body(); $email = normEmail((string)($b['email'] ?? '')); $pw = (string)($b['password'] ?? '');
        if (!validEmail($email)) fail('Bitte eine gültige E-Mail-Adresse eingeben', 400);
        if ($e = goodPassword($pw)) fail($e, 400);
        if ((int)q('SELECT COUNT(*) FROM users')->fetchColumn() >= (int)$CFG['max_accounts']) fail('Gerade können keine neuen Konten angelegt werden', 503);
        if (userByEmail($email)) { ipFail(); sleep(1); fail('Für diese E-Mail gibt es schon ein Konto – bitte anmelden', 409); }
        q('INSERT INTO users (email, pw, created) VALUES (?, ?, ?)', [$email, password_hash($pw, PASSWORD_DEFAULT), time()]);
        $uid = (int)db()->lastInsertId();
        sendMail($email, 'Willkommen bei ' . $CFG['app_name'], "Hallo,

dein Konto für {$CFG['app_name']} ist angelegt. Melde dich auf Handy und PC mit dieser E-Mail-Adresse an – deine Daten gleichen sich dann automatisch ab.

Warst du das nicht? Dann antworte bitte auf diese E-Mail.
");
        out(['token' => newToken($uid)]);
    }

    if ($a === 'login') {
        $b = body(); $u = userByEmail((string)($b['email'] ?? ''));
        if (!$u) { ipFail(); password_verify('x', password_hash('y', PASSWORD_DEFAULT));  sleep(2); fail('E-Mail oder Passwort stimmt nicht', 403); }
        lockedMsg($u);
        if (!checkPw($u, (string)($b['password'] ?? ''))) { userFail($u); sleep(2); fail('E-Mail oder Passwort stimmt nicht', 403); }
        if ((string)$u['totp'] !== '') {
            $code = (string)($b['code'] ?? '');
            if ($code === '') out(['need2fa' => true], 401);
            if (!userCode($u, $code)) { userFail($u); sleep(2); fail('Der Code stimmt nicht', 403); }
        }
        userOk($u);
        out(['token' => newToken((int)$u['id'])]);
    }

    if ($a === 'forgot') {
        $u = userByEmail((string)(body()['email'] ?? ''));
        if ($u && (int)$u['reset_until'] < time() + 14 * 60) {
            $code = strtoupper(substr(b32encode(random_bytes(8)), 0, 8));
            q('UPDATE users SET reset_hash = ?, reset_until = ?, reset_tries = 0 WHERE id = ?', [password_hash($code, PASSWORD_DEFAULT), time() + 15 * 60, $u['id']]);
            sendMail((string)$u['email'], 'Dein Code zum Zurücksetzen', "Hallo,

dein Code zum Zurücksetzen des Passworts:

    " . substr($code, 0, 4) . '-' . substr($code, 4) . "

Er gilt 15 Minuten. Hast du das nicht angefordert, kannst du diese E-Mail ignorieren – dein Passwort bleibt dann wie es ist.
");
        }
        if (!$u) ipFail();
        out(['ok' => true]);
    }

    if ($a === 'reset') {
        $b = body(); $u = userByEmail((string)($b['email'] ?? ''));
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($b['code'] ?? '')));
        if (!$u || (string)$u['reset_hash'] === '' || (int)$u['reset_until'] < time() || (int)$u['reset_tries'] >= 5) { ipFail(); sleep(2); fail('Der Code ist ungültig oder abgelaufen – bitte neu anfordern', 403); }
        if (!password_verify($code, (string)$u['reset_hash'])) { q('UPDATE users SET reset_tries = reset_tries + 1 WHERE id = ?', [$u['id']]); ipFail(); sleep(2); fail('Der Code stimmt nicht', 403); }
        $pw = (string)($b['password'] ?? '');
        if ($e = goodPassword($pw)) fail($e, 400);
        q('UPDATE users SET pw = ?, reset_hash = NULL, reset_until = 0, totp = NULL, totp_pending = NULL, totp_recovery = NULL, fails = 0, rounds = 0, locked_until = 0 WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
        q('DELETE FROM tokens WHERE user_id = ?', [$u['id']]);
        sendMail((string)$u['email'], 'Dein Passwort wurde geändert', "Hallo,

das Passwort deines Kontos bei {$CFG['app_name']} wurde gerade zurückgesetzt. Alle Geräte wurden abgemeldet, die Zwei-Faktor-Anmeldung ist aus.

Warst du das nicht? Dann antworte bitte sofort auf diese E-Mail.
");
        out(['token' => newToken((int)$u['id'])]);
    }

    $u = authUser(); $uid = (int)$u['id'];

    if ($a === 'pull') {
        $since = max(0, (int)($_GET['since'] ?? 0));
        $s = q('SELECT col, id, data, rev FROM docs WHERE user_id = ? AND rev > ? ORDER BY rev', [$uid, $since]);
        $docs = [];
        foreach ($s as $r) $docs[] = ['col' => $r['col'], 'id' => $r['id'], 'data' => $r['data'] === null ? null : json_decode($r['data'], true), 'rev' => (int)$r['rev']];
        $ur = q('SELECT rev, COALESCE(bad, 0) AS bad, COALESCE(bad_t, 0) AS bad_t FROM users WHERE id = ?', [$uid])->fetch();
        out(['rev' => (int)$ur['rev'], 'docs' => $docs, 'bad' => (int)$ur['bad'], 'bad_t' => (int)$ur['bad_t']]);
    }

    if ($a === 'push') {
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 30000000) fail('Zu viele Daten auf einmal', 413);
        $ops = body()['ops'] ?? null;
        if (!is_array($ops) || count($ops) > 5000) fail('Ungültige Anfrage', 400);
        $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
        $rev = (int)q('SELECT rev FROM users WHERE id = ?', [$uid])->fetchColumn();
        $put = $pdo->prepare('INSERT INTO docs (user_id, col, id, data, rev) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, col, id) DO UPDATE SET data = excluded.data, rev = excluded.rev');
        foreach ($ops as $op) {
            $col = (string)($op['col'] ?? ''); $id = (string)($op['id'] ?? '');
            if (!in_array($col, ALLOWED_COLS, true) || $id === '' || strlen($id) > 200) continue;
            $data = array_key_exists('data', $op) && $op['data'] !== null ? json_encode($op['data'], JSON_UNESCAPED_UNICODE) : null;
            if ($data !== null && strlen($data) > 3000000) continue;
            $rev++; $put->execute([$uid, $col, $id, $data, $rev]);
        }
        q('UPDATE users SET rev = ? WHERE id = ?', [$rev, $uid]);
        $pdo->exec('COMMIT');
        out(['rev' => $rev]);
    }

    if ($a === 'account') {
        $rec = json_decode((string)($u['totp_recovery'] ?? '[]'), true) ?: [];
        out(['email' => $u['email'], 'created' => (int)$u['created'], 'twofa' => (string)$u['totp'] !== '', 'recovery' => count($rec)]);
    }
    if ($a === 'twofa') { $rec = json_decode((string)($u['totp_recovery'] ?? '[]'), true) ?: []; out(['on' => (string)$u['totp'] !== '', 'recovery' => count($rec)]); }

    if ($a === 'verify') {
        lockedMsg($u);
        if (!checkPw($u, (string)(body()['password'] ?? ''))) { userFail($u); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        userOk($u); out(['ok' => true]);
    }

    if ($a === 'password') {
        $b = body(); lockedMsg($u);
        if (!checkPw($u, (string)($b['old'] ?? ''))) { userFail($u); sleep(2); fail('Das bisherige Passwort stimmt nicht', 403); }
        $new = (string)($b['new'] ?? ''); if ($e = goodPassword($new)) fail($e, 400);
        q('UPDATE users SET pw = ? WHERE id = ?', [password_hash($new, PASSWORD_DEFAULT), $uid]);
        q('DELETE FROM tokens WHERE user_id = ?', [$uid]);
        out(['token' => newToken($uid)]);
    }

    if ($a === 'twofaStart') {
        lockedMsg($u);
        if (!checkPw($u, (string)(body()['password'] ?? ''))) { userFail($u); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        $secret = b32encode(random_bytes(20));
        q('UPDATE users SET totp_pending = ? WHERE id = ?', [$secret, $uid]);
        $label = rawurlencode($CFG['app_name'] . ':' . $u['email']);
        out(['secret' => $secret, 'uri' => 'otpauth://totp/' . $label . '?secret=' . $secret . '&issuer=' . rawurlencode($CFG['app_name']) . '&digits=6&period=30']);
    }
    if ($a === 'twofaEnable') {
        $secret = (string)($u['totp_pending'] ?? ''); $none = null; $step = 0;
        if ($secret === '' || !totpCheckRaw($secret, (string)(body()['code'] ?? ''), 0, $none, $step)) { sleep(1); fail('Der Code stimmt nicht – Uhrzeit am Handy prüfen und den aktuellen Code eingeben', 403); }
        $codes = []; $hashes = [];
        for ($i = 0; $i < 8; $i++) { $c = strtoupper(substr(b32encode(random_bytes(8)), 0, 10)); $codes[] = substr($c, 0, 5) . '-' . substr($c, 5); $hashes[] = password_hash($c, PASSWORD_DEFAULT); }
        q('UPDATE users SET totp = ?, totp_pending = NULL, totp_recovery = ?, totp_used = ? WHERE id = ?', [$secret, json_encode($hashes), $step, $uid]);
        out(['recovery' => $codes]);
    }
    if ($a === 'twofaDisable') {
        $b = body(); lockedMsg($u);
        if (!checkPw($u, (string)($b['password'] ?? ''))) { userFail($u); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        if (!userCode($u, (string)($b['code'] ?? ''))) { userFail($u); sleep(2); fail('Der Code stimmt nicht', 403); }
        q('UPDATE users SET totp = NULL, totp_pending = NULL, totp_recovery = NULL WHERE id = ?', [$uid]);
        out(['ok' => true]);
    }

    if ($a === 'logoutAll') { q('DELETE FROM tokens WHERE user_id = ?', [$uid]); out(['ok' => true]); }
    if ($a === 'logout') { q('DELETE FROM tokens WHERE hash = ?', [$u['token_hash']]); out(['ok' => true]); }

    if ($a === 'deleteAccount') {
        lockedMsg($u);
        if (!checkPw($u, (string)(body()['password'] ?? ''))) { userFail($u); sleep(2); fail('Das Passwort stimmt nicht', 403); }
        q('DELETE FROM docs WHERE user_id = ?', [$uid]); q('DELETE FROM tokens WHERE user_id = ?', [$uid]); q('DELETE FROM users WHERE id = ?', [$uid]);
        out(['ok' => true]);
    }

    fail('Unbekannte Aktion', 404);
} catch (Throwable $e) {
    try { if (db()->inTransaction()) db()->exec('ROLLBACK'); } catch (Throwable $ignored) {}
    error_log('Haushaltsbuch: ' . $e->getMessage());
    fail('Serverfehler', 500);
}
