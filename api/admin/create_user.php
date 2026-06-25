<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

requireAdmin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Invalid request method", null, 405);
}

$in = json_decode(file_get_contents("php://input"), true);
if (!is_array($in)) {
    jsonResponse(false, "Invalid JSON payload", null, 400);
}

$name = trim($in["full_name"] ?? "");
$email = trim(strtolower($in["email"] ?? ""));
$password = $in["password"] ?? "";
$role = trim(strtolower($in["role"] ?? ""));

if ($name === "" || $email === "" || $password === "" || $role === "") {
    jsonResponse(false, "Name, email, password, and role are required", null, 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, "Invalid email", null, 422);
}
if (strlen($password) < 6) {
    jsonResponse(false, "Password must be at least 6 chars", null, 422);
}
if (!in_array($role, ["lecturer", "doctor"], true)) {
    jsonResponse(false, "Admins can only add lecturers and doctors here", null, 422);
}

try {
    $chk = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $chk->execute([":email" => $email]);
    if ($chk->fetch()) {
        jsonResponse(false, "Email already registered", null, 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("
        INSERT INTO users (full_name, email, password_hash, role, guardian_name, guardian_phone)
        VALUES (:name, :email, :hash, :role, '', '')
    ");
    $stmt->execute([
        ":name" => $name,
        ":email" => $email,
        ":hash" => $hash,
        ":role" => $role
    ]);

    jsonResponse(true, "User created", [
        "id" => (int)$pdo->lastInsertId(),
        "full_name" => $name,
        "email" => $email,
        "role" => $role
    ], 201);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to create user", ["error" => $e->getMessage()], 500);
}
