<?php
require_once __DIR__ . '/api/config/db.php';

$email = 'admin@aurahub.local';
$pass = 'Admin@123';

$q = $pdo->prepare('SELECT email, role, password_hash FROM users WHERE email = :e LIMIT 1');
$q->execute([':e' => $email]);
$u = $q->fetch(PDO::FETCH_ASSOC);

if (!$u) {
    echo "user_not_found";
    exit;
}

echo password_verify($pass, $u['password_hash']) ? 'match' : 'no_match';
