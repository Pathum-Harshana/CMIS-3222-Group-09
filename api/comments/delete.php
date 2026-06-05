<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
$user = requireLogin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") jsonResponse(false, "Invalid request method", null, 405);

$input = json_decode(file_get_contents("php://input"), true);
$id = intval($input["id"] ?? 0);
if ($id <= 0) jsonResponse(false, "Valid comment id is required", null, 422);

try {
    $check = $pdo->prepare("SELECT user_id FROM comments WHERE id=:id LIMIT 1");
    $check->execute([":id"=>$id]);
    $row = $check->fetch();
    if (!$row) jsonResponse(false, "Comment not found", null, 404);

    // Only admins can delete comments (prevents "own self" moderation).
    if ($user["role"] !== "admin") {
        jsonResponse(false, "Forbidden: admin only", null, 403);
    }


    $stmt = $pdo->prepare("DELETE FROM comments WHERE id=:id LIMIT 1");
    $stmt->execute([":id"=>$id]);

    jsonResponse(true, "Comment permanently deleted", ["id"=>$id]);

} catch (Throwable $e) {
    jsonResponse(false, "Failed to delete comment", ["error"=>$e->getMessage()], 500);
}

