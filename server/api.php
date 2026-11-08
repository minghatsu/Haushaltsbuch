<?php
/*
 * Haushaltsbuch – Abgleich-Server (eine Person, mehrere Geräte)
 *
 * Speichert die Dokumente der App (Buchungen, Fixkosten, Monate, Schulden, Einstellungen)
 * in einer SQLite-Datei und verteilt Änderungen an alle Geräte.
 *
 *   GET  api.php?a=status              -> {setup:bool}
 *   POST api.php?a=setup  {password}   -> {token}   (nur solange noch kein Passwort existiert)
 *   POST api.php?a=login  {password}   -> {token}
 *   GET  api.php?a=pull&since=N        -> {rev, docs:[{col,id,data,rev}]}   (Authorization: Bearer <token>)
 *   POST api.php?a=push   {ops:[{col,id,data}]} -> {rev}                    (data null = löschen)
 *   POST api.php?a=logout
 *   POST api.php?a=logoutAll           -> alle Geräte abmelden
 *   POST api.php?a=password {old,new}  -> {token}  (neues Passwort, alle anderen Geräte werden abgemeldet)
 *
 *   App-Updates (neue Versionen kommen über die Synology auf PC und Handy):
 *   GET  api.php?a=version             -> {version}
 *   GET  api.php?a=app[&web=1]         -> die aktuelle App (HTML)
 *   POST api.php?a=deploy  (X-Deploy-Token, Body = HTML) -> {version}
 *        Nur der GitHub-Build von minghatsu/Haushaltsbuch (Branch main) darf das: er schickt ein von GitHub
 *        signiertes Kurzzeit-Token (OIDC), das hier mit GitHubs öffentlichen Schlüsseln geprüft wird.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Private-Network: true');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

// Datenordner mit zufälligem Namen, damit die Datenbank-Datei nicht erraten und heruntergeladen werden kann.
const DATA_DIR = __DIR__ . '/data-__DATA_SUFFIX__';
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
    // devices that were not used for half a year are logged out
    if (random_int(1, 50) === 1) db()->prepare('DELETE FROM tokens WHERE used < ?')->execute([time() - 180 * 86400]);
}
function appVersion(string $html): int {
    return preg_match('/name="hb-version" content="(\d+)"/', $html, $m) ? (int)$m[1] : 0;
}
function appFile(): string { return DATA_DIR . '/app.html'; }
function currentApp(): string { return is_file(appFile()) ? (string)file_get_contents(appFile()) : ''; }
/* ---- GitHub OIDC token check (for automatic updates from the GitHub build) ---- */
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

/* ---- protection against password guessing: after 5 wrong tries the login is locked, each round longer (1, 5, 15, 60 min) ---- */
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
}
function loginOk(): void { setMeta('fails', '{}'); }
/** Setting the first password is only allowed from the home network, so nobody from outside can take over a fresh server. */
function fromHomeNetwork(): bool {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if ($ip === '' ) return false;
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) return true;  // private or loopback
    return false;
}

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
        if (!empty($_GET['web'])) { // web copy on the NAS: sync with this server, installable on the PC
            $html = preg_replace('/<meta name="hb-server" content="[^"]*">/', '<meta name="hb-server" content="api.php">', $html, 1);
            $html = preg_replace('/<meta charset="utf-8">/', '<meta charset="utf-8"><link rel="manifest" href="manifest.json"><meta name="theme-color" content="#147A5B">', $html, 1);
        }
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

    if ($a === 'status') out(['setup' => meta('password') === null, 'rev' => (int)(meta('rev') ?? 0)]);

    if ($a === 'setup') {
        if (meta('password') !== null) fail('Passwort ist schon festgelegt', 409);
        if (!fromHomeNetwork()) fail('Das erste Passwort kann nur im Heimnetz festgelegt werden', 403);
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
        out(['rev' => (int)(meta('rev') ?? 0), 'docs' => $docs]);
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
            if ($data !== null && strlen($data) > 3000000) continue;   // one document (e.g. a receipt photo) at most 3 MB
            $rev++;
            $put->execute([$col, $id, $data, $rev]);
        }
        setMeta('rev', (string)$rev);
        $pdo->exec('COMMIT');
        out(['rev' => $rev]);
    }

    if ($a === 'logoutAll') {   // e.g. after a phone was lost: every device has to log in again
        db()->exec('DELETE FROM tokens');
        out(['ok' => true]);
    }

    if ($a === 'password') {    // change the password; all other devices are logged out
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
    fail('Serverfehler', 500);   // no details for outsiders
}
