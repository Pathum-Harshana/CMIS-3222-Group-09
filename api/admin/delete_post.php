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
if ($id <= 0) jsonResponse(false, "Valid post id is required", null, 422);

try {
    $pdo->beginTransaction();

    $comments = $pdo->prepare("DELETE FROM comments WHERE post_id = :id");
    $comments->execute([":id" => $id]);

    $post = $pdo->prepare("DELETE FROM posts WHERE id = :id");
    $post->execute([":id" => $id]);

    $pdo->commit();
    jsonResponse(true, "Post deleted", ["id" => $id]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, "Failed to delete post", ["error" => $e->getMessage()], 500);
}
