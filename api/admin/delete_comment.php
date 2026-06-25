<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

requireSuperAdmin();

$in = json_decode(file_get_contents("php://input"), true);
$id = (int)($in["id"] ?? 0);
if ($id <= 0) jsonResponse(false, "Valid comment id is required", null, 422);

try {
    $stmt = $pdo->prepare("DELETE FROM comments WHERE id = :id");
    $stmt->execute([":id" => $id]);
    jsonResponse(true, "Comment deleted", ["id" => $id]);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to delete comment", ["error" => $e->getMessage()], 500);
}
