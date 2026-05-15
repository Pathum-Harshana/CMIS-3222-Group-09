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
$postId = intval($input["post_id"] ?? 0);
$content = trim($input["content"] ?? "");

if ($postId <= 0) jsonResponse(false, "Valid post_id is required", null, 422);
if ($content === "") jsonResponse(false, "Comment content is required", null, 422);
if (mb_strlen($content) > 500) jsonResponse(false, "Comment too long (max 500 chars)", null, 422);

try {
    $check = $pdo->prepare("SELECT id FROM posts WHERE id=:id LIMIT 1");
    $check->execute([":id"=>$postId]);
    if (!$check->fetch()) jsonResponse(false, "Post not found", null, 404);

    $ins = $pdo->prepare("INSERT INTO comments (post_id,user_id,content) VALUES (:post_id,:uid,:content)");
    $ins->execute([
        ":post_id"=>$postId,
        ":uid"=>$user["id"],
        ":content"=>$content
    ]);

    $id = (int)$pdo->lastInsertId();
    $get = $pdo->prepare("SELECT id,post_id,user_id,content,created_at FROM comments WHERE id=:id LIMIT 1");
    $get->execute([":id"=>$id]);
    jsonResponse(true, "Comment created", $get->fetch(), 201);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to create comment", ["error"=>$e->getMessage()], 500);
}