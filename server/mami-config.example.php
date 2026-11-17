<?php
// Umbenennen in mami-config.php und neben mami.php auf den Server legen.
// Den Schlüssel bekommst du auf console.anthropic.com unter "API Keys". Er bleibt nur hier auf dem Server.
return [
    'anthropic_key' => 'HIER-DEINEN-SCHLUESSEL-EINFUEGEN',
    'mami_dev_day'  => 15,     // max. Briefe pro Gerät und Tag
    'mami_ip_day'   => 40,     // max. Briefe pro Internet-Anschluss und Tag
    'mami_all_day'  => 3000,   // max. Briefe für alle zusammen pro Tag (Kostenbremse, ca. 1,50 $)
];
