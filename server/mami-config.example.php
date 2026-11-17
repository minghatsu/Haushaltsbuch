<?php
// Umbenennen in mami-config.php und neben pair.php auf den Server legen.
// Den Schlüssel bekommst du auf console.anthropic.com unter "API Keys". Er bleibt nur hier auf dem Server.
return [
    'anthropic_key' => 'HIER-DEINEN-SCHLUESSEL-EINFUEGEN',
    'mami_dev_day'  => 15,     // max. Briefe pro Gerät und Tag
    'credit_usd'    => 100,    // Monatsguthaben in $ – KI stoppt automatisch, wenn es verbraucht ist (in der App änderbar)
    'credit_day'    => 27,     // an diesem Tag kommt das neue Guthaben
];
