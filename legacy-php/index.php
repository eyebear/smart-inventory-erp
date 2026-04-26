<?php

header('Content-Type: application/json');

echo json_encode([
    'service' => 'Legacy PHP Supplier Service',
    'status' => 'running'
]);