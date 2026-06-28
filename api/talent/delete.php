<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
$user = requireSuperAdmin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") jsonResponse(false, "Invalid request method", null, 405);

$in = json_decode(file_get_contents("php://input"), true);
$id = intval($in["id"] ?? 0);
if ($id <= 0) jsonResponse(false, "Valid profile id is required", null, 422);

try {
    $q = $pdo->prepare("SELECT user_id FROM talent_profiles WHERE id=:id LIMIT 1");
    $q->execute([":id"=>$id]);
    $row = $q->fetch();
    if (!$row) jsonResponse(false, "Talent profile not found", null, 404);

// Deletion now restricted to super admin only; no additional role checks

    $d = $pdo->prepare("DELETE FROM talent_profiles WHERE id=:id LIMIT 1");
    $d->execute([":id"=>$id]);

    jsonResponse(true, "Talent profile deleted", ["id"=>$id]);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to delete talent profile", ["error"=>$e->getMessage()], 500);
}