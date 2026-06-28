<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
requireAdmin();

$stmt = $pdo->query("
SELECT p.id,p.content,p.mood,p.is_anonymous,p.created_at,u.full_name,u.email
FROM posts p
JOIN users u ON u.id = p.user_id
ORDER BY p.created_at DESC
");
jsonResponse(true, "Posts", $stmt->fetchAll());