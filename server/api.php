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
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

// Datenordner mit zufälligem Namen, damit die Datenbank-Datei nicht erraten und heruntergeladen werden kann.
const DATA_DIR = __DIR__ . '/data-__DATA_SUFFIX__';
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
}
function checkPassword(string $pw): bool {
    $hash = meta('password');
    return $hash !== null && password_verify($pw, $hash);
}

try {
    $a = $_GET['a'] ?? '';

    if ($a === 'status') out(['setup' => meta('password') === null, 'rev' => (int)(meta('rev') ?? 0)]);

    if ($a === 'setup') {
        if (meta('password') !== null) fail('Passwort ist schon festgelegt', 409);
        $pw = (string)(body()['password'] ?? '');
        if (mb_strlen($pw) < 8) fail('Das Passwort braucht mindestens 8 Zeichen', 400);
        setMeta('password', password_hash($pw, PASSWORD_DEFAULT));
        out(['token' => newToken()]);
    }

    if ($a === 'login') {
        $pw = (string)(body()['password'] ?? '');
        if (!checkPassword($pw)) { sleep(2); fail('Falsches Passwort', 403); }
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
        $ops = body()['ops'] ?? null;
        if (!is_array($ops)) fail('Ungültige Anfrage', 400);
        $pdo = db();
        $pdo->exec('BEGIN IMMEDIATE');
        $rev = (int)(meta('rev') ?? 0);
        $put = $pdo->prepare('INSERT INTO docs (col, id, data, rev) VALUES (?, ?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, rev = excluded.rev');
        foreach ($ops as $op) {
            $col = (string)($op['col'] ?? ''); $id = (string)($op['id'] ?? '');
            if (!in_array($col, ALLOWED_COLS, true) || $id === '' || strlen($id) > 200) continue;
            $data = array_key_exists('data', $op) && $op['data'] !== null ? json_encode($op['data'], JSON_UNESCAPED_UNICODE) : null;
            $rev++;
            $put->execute([$col, $id, $data, $rev]);
        }
        setMeta('rev', (string)$rev);
        $pdo->exec('COMMIT');
        out(['rev' => $rev]);
    }

    if ($a === 'logout') {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($h), $m)) db()->prepare('DELETE FROM tokens WHERE hash = ?')->execute([hash('sha256', strtolower($m[1]))]);
        out(['ok' => true]);
    }

    fail('Unbekannte Aktion', 404);
} catch (Throwable $e) {
    try { if (db()->inTransaction()) db()->exec('ROLLBACK'); } catch (Throwable $ignored) {}
    fail('Serverfehler: ' . $e->getMessage(), 500);
}
