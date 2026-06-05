<?php
// Set session cookie path for subdirectory and start session before any output
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'path' => '/Aurahub/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}
// Allow credentials and set correct origin for CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// You can restrict this to your frontend URL in production
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost"); // fallback for dev
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") jsonResponse(false, "Invalid request method", null, 405);

$in = json_decode(file_get_contents("php://input"), true);
$email = trim(strtolower($in["email"] ?? ""));
$pass = $in["password"] ?? "";

if ($email === "" || $pass === "") jsonResponse(false, "Email and password required", null, 422);

try {
    $q = $pdo->prepare("SELECT id,full_name,email,password_hash,role FROM users WHERE email = :e LIMIT 1");
    $q->execute([":e"=>$email]);
    $u = $q->fetch();

    if (!$u) jsonResponse(false, "Invalid credentials", null, 401);

    $ok = password_verify($pass, $u["password_hash"]);

    // fallback migration support (if old non-bcrypt hash/plain accidentally exists)
    if (!$ok && $pass === $u["password_hash"]) {
        $ok = true;
        $newHash = password_hash($pass, PASSWORD_BCRYPT);
        $up = $pdo->prepare("UPDATE users SET password_hash = :h WHERE id = :id");
        $up->execute([":h"=>$newHash, ":id"=>$u["id"]]);
    }

    if (!$ok) jsonResponse(false, "Invalid credentials", null, 401);

    $_SESSION["user"] = [
        "id" => (int)$u["id"],
        "full_name" => $u["full_name"],
        "email" => $u["email"],
        "role" => $u["role"]
    ];
    jsonResponse(true, "Login successful", $_SESSION["user"]);
} catch (Throwable $e) {
    jsonResponse(false, "Login failed", ["error"=>$e->getMessage()], 500);
}