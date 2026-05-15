<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
requireAdmin();

$stmt = $pdo->query("
SELECT c.id,c.post_id,c.content,c.created_at,u.full_name,u.email
FROM comments c
JOIN users u ON u.id = c.user_id
ORDER BY c.created_at DESC
");
jsonResponse(true, "Comments", $stmt->fetchAll());