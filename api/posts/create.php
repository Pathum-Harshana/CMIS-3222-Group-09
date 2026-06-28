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
$content = trim($input["content"] ?? "");
$mood = trim($input["mood"] ?? "");
$isAnonymous = filter_var($input["is_anonymous"] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

if ($content === "") jsonResponse(false, "Post content is required", null, 422);
if (mb_strlen($content) > 600) jsonResponse(false, "Post too long (max 600 chars)", null, 422);

if ($isAnonymous === null) {
    $isAnonymous = true;
}

try {
    $stmt = $pdo->prepare("INSERT INTO posts (user_id, content, mood, is_anonymous) VALUES (:uid,:content,:mood,:anon)");
    $stmt->execute([
        ":uid" => $user["id"],
        ":content" => $content,
        ":mood" => ($mood !== "" ? $mood : null),
        ":anon" => $isAnonymous ? 1 : 0
    ]);

    $id = (int)$pdo->lastInsertId();
    $get = $pdo->prepare("SELECT id,user_id,content,mood,is_anonymous,is_flagged,is_reviewed,created_at FROM posts WHERE id=:id LIMIT 1");
    $get->execute([":id"=>$id]);

    jsonResponse(true, "Post created successfully", $get->fetch(), 201);
} catch (Throwable $e) {
    jsonResponse(false, "DB insert failed", ["error"=>$e->getMessage()], 500);
}