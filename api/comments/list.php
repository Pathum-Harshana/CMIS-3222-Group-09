<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost");
}
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
requireLogin();

$postId = intval($_GET["post_id"] ?? 0);
if ($postId <= 0) jsonResponse(false, "Valid post_id is required", null, 422);

try {
    $stmt = $pdo->prepare("
        SELECT c.id,c.post_id,c.user_id,c.content,c.created_at,u.full_name
        FROM comments c
        JOIN users u ON u.id=c.user_id
        WHERE c.post_id=:post_id
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([":post_id"=>$postId]);
    jsonResponse(true, "Comments fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch comments", ["error"=>$e->getMessage()], 500);
}