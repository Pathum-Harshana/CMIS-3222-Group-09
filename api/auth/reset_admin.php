<?php
header("Content-Type: application/json; charset=UTF-8");

$remoteAddr = $_SERVER["REMOTE_ADDR"] ?? "";
$isCli = PHP_SAPI === "cli";
$isLocalRequest = in_array($remoteAddr, ["127.0.0.1", "::1"], true);

if (!$isCli && !$isLocalRequest) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Admin reset is only available locally"
    ]);
    exit;
}

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
            "email" => $email
        ]);
    } else {
        $i = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES ('System Admin', :email, :hash, 'admin')");
        $i->execute([":email" => $email, ":hash" => $hash]);
        echo json_encode([
            "success" => true,
            "message" => "Admin account created",
            "email" => $email
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
