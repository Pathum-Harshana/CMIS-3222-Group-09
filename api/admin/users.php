<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

requireAdmin();

try {
    $stmt = $pdo->query("
      SELECT id, full_name, email, role, created_at
      FROM users
      ORDER BY created_at DESC, id DESC
    ");
    jsonResponse(true, "Users fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch users", ["error" => $e->getMessage()], 500);
}
