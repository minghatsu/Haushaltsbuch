<?php
// Kopie als config.php neben cloud.php ablegen und anpassen.
return [
    'mail_from'    => 'Finanz MAMI <noreply@deine-domain.de>',   // Absender der E-Mails (Adresse deiner Domain)
    'app_name'     => 'Finanz MAMI',
    'feedback_to'  => '',        // Feedback aus der App zusätzlich per E-Mail hierhin (leer = nur im Datenordner unter feedback/)
    'signup'       => true,      // false = keine neuen Konten (z. B. während der Testphase nur Einladungen)
    'max_accounts' => 1000,
    // 'data_dir'   => '/pfad/ausserhalb/des/webordners',   // ohne Angabe: Ordner cloud-<zufall> neben cloud.php
];
