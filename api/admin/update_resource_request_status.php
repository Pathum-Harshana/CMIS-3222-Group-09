<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

requireAdmin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Invalid request method", null, 405);
}

$in = json_decode(file_get_contents("php://input"), true);
$id = intval($in["id"] ?? 0);
$status = trim(strtolower($in["status"] ?? ""));

if ($id <= 0) jsonResponse(false, "Valid request id is required", null, 422);
if (!in_array($status, ["pending","processing","completed"], true)) {
    jsonResponse(false, "Invalid status", null, 422);
}

try {
    $check = $pdo->prepare("SELECT id FROM resource_requests WHERE id=:id LIMIT 1");
    $check->execute([":id"=>$id]);
    if (!$check->fetch()) jsonResponse(false, "Request not found", null, 404);

    $up = $pdo->prepare("UPDATE resource_requests SET status=:status WHERE id=:id");
    $up->execute([":status"=>$status, ":id"=>$id]);

    $get = $pdo->prepare("
      SELECT rr.id, rr.user_id, rr.request_type, rr.requester_email, rr.status, rr.created_at, u.full_name
      FROM resource_requests rr
      JOIN users u ON u.id = rr.user_id
      WHERE rr.id = :id
      LIMIT 1
    ");
    $get->execute([":id"=>$id]);

    jsonResponse(true, "Resource request status updated", $get->fetch());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to update request status", ["error"=>$e->getMessage()], 500);
}