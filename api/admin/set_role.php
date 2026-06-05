<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

$admin = requireAdmin();
$in = json_decode(file_get_contents("php://input"), true);
$id = (int)($in["id"] ?? 0);
$role = trim(strtolower($in["role"] ?? ""));

if ($id <= 0) jsonResponse(false, "Valid user id required", null, 422);
if (!in_array($role, ["student", "lecturer", "admin"], true)) {
    jsonResponse(false, "Invalid role", null, 422);
}
if ($id === (int)$admin["id"] && $role !== "admin") {
    jsonResponse(false, "You cannot remove your own admin role", null, 422);
}

try {
    $stmt = $pdo->prepare("UPDATE users SET role = :role WHERE id = :id");
    $stmt->execute([":role" => $role, ":id" => $id]);
    jsonResponse(true, "Role updated", ["id" => $id, "role" => $role]);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to update role", ["error" => $e->getMessage()], 500);
}
