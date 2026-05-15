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
if ($id <= 0) jsonResponse(false, "Valid post id is required", null, 422);

try {
    $check = $pdo->prepare("SELECT user_id FROM posts WHERE id=:id LIMIT 1");
    $check->execute([":id"=>$id]);
    $row = $check->fetch();
    if (!$row) jsonResponse(false, "Post not found", null, 404);

    if ($user["role"] !== "admin" && (int)$row["user_id"] !== (int)$user["id"]) {
        jsonResponse(false, "Forbidden", null, 403);
    }

    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM comments WHERE post_id=:post_id")->execute([":post_id"=>$id]);
    $pdo->prepare("DELETE FROM posts WHERE id=:id LIMIT 1")->execute([":id"=>$id]);
    $pdo->commit();

    jsonResponse(true, "Post and related comments permanently deleted", ["id"=>$id]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(false, "Failed to delete post", ["error"=>$e->getMessage()], 500);
}