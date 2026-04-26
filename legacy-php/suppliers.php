<?php

header('Content-Type: application/json');

$suppliers = [
    [
        'legacy_supplier_id' => 'LEG-SUP-001',
        'name' => 'Pacific Fresh Foods',
        'country' => 'Canada',
        'category' => 'Fresh Food',
        'contact_email' => 'contact@pacificfresh.example',
        'status' => 'ACTIVE'
    ],
    [
        'legacy_supplier_id' => 'LEG-SUP-002',
        'name' => 'East Asia Imports',
        'country' => 'Japan',
        'category' => 'Imported Snacks',
        'contact_email' => 'contact@eastasia.example',
        'status' => 'ACTIVE'
    ],
    [
        'legacy_supplier_id' => 'LEG-SUP-003',
        'name' => 'K-Food Distribution',
        'country' => 'South Korea',
        'category' => 'Fermented Foods',
        'contact_email' => 'contact@kfood.example',
        'status' => 'ACTIVE'
    ]
];

echo json_encode($suppliers);