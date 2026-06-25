<?php
require __DIR__ . '/api/config/db.php'; // includes $pdo
$hashes = [
    'superadmin@aurahub.local' => '$2y$10$Bl1Nnjjf/MamSsnFqhsofesKiDksX7O.9DlO7fHhCoPd8eHukDhZW',
    'admin1@aurahub.local' => '$2y$10$o2GSTJDkW5f8Gcd.OyNN/.Z1K99bnym.1dPKBT05B8d5hZF.pwGEe',
    'admin2@aurahub.local' => '$2y$10$3S3iVHHv/y416id7cZCkTeLdzJMWGiEZ9tgRwXEriC.DMGMbsAqAu',
];
foreach ($hashes as $email => $hash) {
    $stmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE email = :email');
    $stmt->execute([':hash' => $hash, ':email' => $email]);
    echo "Updated $email\n";
}
?>
