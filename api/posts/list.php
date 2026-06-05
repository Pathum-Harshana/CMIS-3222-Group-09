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

try {
    $stmt = $pdo->query("
        SELECT p.id,p.user_id,p.content,p.mood,p.is_flagged,p.is_reviewed,p.created_at,u.full_name
        FROM posts p
        JOIN users u ON u.id=p.user_id
        ORDER BY p.created_at DESC
    ");
    jsonResponse(true, "Posts fetched successfully", $stmt->fetchAll());
} catch (Exception $e) {
    jsonResponse(false, "Failed to fetch posts", ["error"=>$e->getMessage()], 500);
}