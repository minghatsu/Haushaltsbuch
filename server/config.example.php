<?php
// Kopie als config.php neben cloud.php ablegen und anpassen.
return [
    'mail_from'    => 'Finanz MAMI <noreply@deine-domain.de>',   // Absender der E-Mails (Adresse deiner Domain)
    'app_name'     => 'Finanz MAMI',
    'feedback_to'  => '',        // Feedback aus der App zusätzlich per E-Mail hierhin (leer = nur im Datenordner unter feedback/)
    // E-Mails über dein eigenes Postfach verschicken (ohne Angabe: PHP mail(), das auf der Synology meist nicht geht)
    // 'smtp_host'   => 'smtp.dein-anbieter.de',
    // 'smtp_port'   => 465,          // 465 = SSL, 587 = STARTTLS
    // 'smtp_secure' => 'ssl',        // 'ssl' oder 'tls'
    // 'smtp_user'   => 'kontakt@deine-domain.de',
    // 'smtp_pass'   => '…',          // Passwort des Postfachs – nur hier auf dem Server
    'signup'       => true,      // false = keine neuen Konten (z. B. während der Testphase nur Einladungen)
    'max_accounts' => 1000,
    // 'data_dir'   => '/pfad/ausserhalb/des/webordners',   // ohne Angabe: Ordner cloud-<zufall> neben cloud.php
];
