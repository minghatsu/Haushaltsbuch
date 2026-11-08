<?php
// Kopie als config.php neben cloud.php ablegen und anpassen.
return [
    'mail_from'    => 'Finanz MAMI <noreply@deine-domain.de>',   // Absender der E-Mails (Adresse deiner Domain)
    'app_name'     => 'Finanz MAMI',
    'signup'       => true,      // false = keine neuen Konten (z. B. während der Testphase nur Einladungen)
    'max_accounts' => 1000,
    // 'data_dir'   => '/pfad/ausserhalb/des/webordners',   // ohne Angabe: Ordner cloud-<zufall> neben cloud.php
];
