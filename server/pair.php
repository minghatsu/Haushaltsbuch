<?php
/*
 * Finanz MAMI – Abgleich ohne Konto ("Geräte koppeln")
 *
 * Kein Name, keine E-Mail, kein Passwort. Geräte werden per QR-Code gekoppelt.
 * Alle Daten werden schon auf dem Gerät verschlüsselt (AES-256-GCM). Dieser Server sieht nur:
 *   - eine zufällige Tresor-Nummer (vault, 32 Hex-Zeichen)
 *   - die Prüfsumme eines Zugangsschlüssels (nicht den Schlüssel zum Entschlüsseln)
 *   - verschlüsselte Datenpakete unter zufällig aussehenden Namen (h)
 * Wer den Server betreibt, kann die Daten also nicht lesen.
 *
 *   GET  ?a=status                       -> {pair:true}
 *   POST ?a=create {vault, auth}         -> {ok}        legt einen neuen Tresor an (auth = 64 Hex-Zeichen)
 *   GET  ?a=pull&since=N                 -> {rev, docs:[{h,b,rev}]}      Authorization: Bearer <vault>.<auth>
 *   POST ?a=push {ops:[{h,b}]}           -> {rev}
 *   POST ?a=wipe                         -> {ok}        löscht den Tresor und alle Daten endgültig
 *   POST ?a=feedback {kind,text,images}  -> {ok}        Feedback aus der App (landet im Datenordner unter feedback/)
 *
 * Läuft auf normalem PHP 8 mit SQLite, z. B. auf der Synology (Web Station) neben api.php.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

const MAX_BLOB = 6000000;          // one encrypted package (e.g. a receipt photo) at most ~6 MB
const MAX_VAULT = 800000000;       // all data of one vault at most ~800 MB
const MAX_CREATE_PER_HOUR = 20;    // new vaults per IP address and hour
const MAX_CREATE_ALL_HOUR = 200;   // new vaults per hour from all addresses together
const MAX_TOTAL = 20000000000;     // all vaults together at most ~20 GB
const MIN_FREE = 2000000000;       // always leave at least ~2 GB free on the disk

// data folder with a random name, so the database can't be guessed and downloaded
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
    // the database gets a random file name: the web server (nginx on Synology) ignores .htaccess, so the name must not be guessable
    $dbs = glob(DATA_DIR . '/tresore-*.sqlite') ?: [];
    if ($dbs) $file = $dbs[0];
    else {
        $file = DATA_DIR . '/tresore-' . bin2hex(random_bytes(16)) . '.sqlite';
        if (is_file(DATA_DIR . '/tresore.sqlite')) {   // move the old, guessable file (and its journal) over
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

function ipCount(string $table, int $limit): bool {   // true = still allowed
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

try {
    $a = $_GET['a'] ?? '';
    // unused vaults are removed after two years without any device
    if (random_int(1, 200) === 1) {
        $old = q('SELECT id FROM vaults WHERE used < ?', [time() - 730 * 86400])->fetchAll(PDO::FETCH_COLUMN);
        foreach ($old as $id) { q('DELETE FROM docs WHERE vault = ?', [$id]); q('DELETE FROM vaults WHERE id = ?', [$id]); }
    }

    if ($a === 'status') out(['pair' => true]);

    // feedback straight from the app (no mail program needed): stored here, a copy goes out by mail if the server can send mail
    if ($a === 'feedback') {
        if (!ipCount('ipfeed', 10)) fail('Gerade zu viel Feedback von hier – bitte später noch einmal', 429);
        $b = body();
        $kind = in_array($b['kind'] ?? '', ['fehler', 'idee', 'lob'], true) ? $b['kind'] : 'idee';
        $text = trim(mb_substr((string)($b['text'] ?? ''), 0, 8000));
        if ($text === '') fail('Bitte etwas schreiben', 400);
        $imgs = [];
        foreach (array_slice(is_array($b['images'] ?? null) ? $b['images'] : [], 0, 5) as $u) {
            if (!is_string($u) || !preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', $u, $m)) continue;
            $bin = base64_decode($m[2], true); if ($bin === false || strlen($bin) > 3000000) continue;
            $imgs[] = [$m[1] === 'jpeg' ? 'jpg' : $m[1], $bin];
        }
        ipBump('ipfeed');
        $dir = DATA_DIR . '/feedback/' . date('Y-m-d_His') . '_' . $kind . '_' . bin2hex(random_bytes(3));
        if (!@mkdir($dir, 0700, true)) fail('Feedback konnte nicht gespeichert werden', 500);
        @file_put_contents($dir . '/feedback.txt', $text . "\n");
        foreach ($imgs as $i => [$ext, $bin]) @file_put_contents($dir . '/bild-' . ($i + 1) . '.' . $ext, $bin);
        $cfg = is_file(__DIR__ . '/config.php') ? (include __DIR__ . '/config.php') : [];
        $to = is_array($cfg) ? (string)($cfg['feedback_to'] ?? '') : '';
        if ($to !== '' && function_exists('mail')) {
            $from = (string)($cfg['mail_from'] ?? 'Finanz MAMI <noreply@localhost>');
            $bd = 'fm' . bin2hex(random_bytes(8));
            $msg = "--$bd\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n";
            foreach ($imgs as $i => [$ext, $bin]) $msg .= "--$bd\r\nContent-Type: image/$ext\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"bild-" . ($i + 1) . ".$ext\"\r\n\r\n" . chunk_split(base64_encode($bin)) . "\r\n";
            $msg .= "--$bd--\r\n";
            $subj = ['fehler' => 'Fehler', 'idee' => 'Idee', 'lob' => 'Lob'][$kind] . ' – Finanz MAMI';
            @mail($to, '=?UTF-8?B?' . base64_encode($subj) . '?=', $msg, "From: $from\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$bd\"");
        }
        out(['ok' => true]);
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
        // vaults that were created but never got any data are removed after a week
        if (random_int(1, 20) === 1) q('DELETE FROM vaults WHERE size = 0 AND rev = 0 AND created < ?', [time() - 7 * 86400]);
        q('INSERT INTO vaults (id, auth, created, used) VALUES (?, ?, ?, ?)', [$id, hash('sha256', $auth), time(), time()]);
        out(['ok' => true]);
    }

    if ($a === 'pull') {
        $v = authVault();
        $since = max(0, (int)($_GET['since'] ?? 0));
        $s = q('SELECT h, b, rev FROM docs WHERE vault = ? AND rev > ? ORDER BY rev LIMIT 2000', [$v['id'], $since]);
        // at most ~4 MB per answer – the rest comes with the next call (photos would otherwise make one huge answer that phones can't load)
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
