<?php
// Haushaltsbuch im Browser (PC): liefert immer die neueste App-Version aus
$_GET['a'] = 'app';
$_GET['web'] = '1';
require __DIR__ . '/api.php';
