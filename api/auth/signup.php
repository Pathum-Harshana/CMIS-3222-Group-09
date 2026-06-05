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
$name = trim($in["full_name"] ?? "");
$email = trim(strtolower($in["email"] ?? ""));
$pass = $in["password"] ?? "";
$role = strtolower(trim($in["role"] ?? "student"));

// Prevent self-assigning admin during public signup
$allowed_roles = ["student", "lecturer"];
if (!in_array($role, $allowed_roles, true)) $role = "student";


if ($name === "" || $email === "" || $pass === "") jsonResponse(false, "All fields are required", null, 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(false, "Invalid email", null, 422);
if (strlen($pass) < 6) jsonResponse(false, "Password must be at least 6 chars", null, 422);

try {
    $chk = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $chk->execute([":email"=>$email]);
    if ($chk->fetch()) jsonResponse(false, "Email already registered", null, 409);

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $ins = $pdo->prepare("INSERT INTO users (full_name,email,password_hash,role) VALUES (:n,:e,:p,:r)");
    $ins->execute([":n"=>$name,":e"=>$email,":p"=>$hash,":r"=>$role]);

    $_SESSION["user"] = [
        "id" => (int)$pdo->lastInsertId(),
        "full_name" => $name,
        "email" => $email,
        "role" => $role
    ];
    jsonResponse(true, "Signup successful", $_SESSION["user"], 201);
} catch (Throwable $e) {
    jsonResponse(false, "Signup failed", ["error"=>$e->getMessage()], 500);
}