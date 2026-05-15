<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";

$email = "admin@aurahub.local";
$plainPassword = "Admin@123";
$hash = password_hash($plainPassword, PASSWORD_BCRYPT);

try {
    $q = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $q->execute([":email" => $email]);
    $existing = $q->fetch();

    if ($existing) {
        $u = $pdo->prepare("UPDATE users SET password_hash = :hash, role = 'admin', full_name='System Admin' WHERE email = :email");
        $u->execute([":hash" => $hash, ":email" => $email]);
        echo json_encode([
            "success" => true,
            "message" => "Admin account updated",
            "email" => $email,
            "password" => $plainPassword
        ]);
    } else {
        $i = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES ('System Admin', :email, :hash, 'admin')");
        $i->execute([":email" => $email, ":hash" => $hash]);
        echo json_encode([
            "success" => true,
            "message" => "Admin account created",
            "email" => $email,
            "password" => $plainPassword
        ]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to reset admin",
        "error" => $e->getMessage()
    ]);
}