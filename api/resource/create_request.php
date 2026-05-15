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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Invalid request method", null, 405);
}

$in = json_decode(file_get_contents("php://input"), true);
$requestType = trim(strtolower($in["request_type"] ?? ""));
$requesterEmail = trim(strtolower($in["requester_email"] ?? ""));

if ($requestType === "" || $requesterEmail === "") {
    jsonResponse(false, "request_type and requester_email are required", null, 422);
}
if (!in_array($requestType, ["counselling", "medical"], true)) {
    jsonResponse(false, "Invalid request_type", null, 422);
}
if (!filter_var($requesterEmail, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, "Valid email required", null, 422);
}

try {
    $stmt = $pdo->prepare("
      INSERT INTO resource_requests (user_id, request_type, requester_email, status)
      VALUES (:uid, :rtype, :email, 'pending')
    ");
    $stmt->execute([
      ":uid" => $user["id"],
      ":rtype" => $requestType,
      ":email" => $requesterEmail
    ]);

    $id = (int)$pdo->lastInsertId();

    $get = $pdo->prepare("
      SELECT id, user_id, request_type, requester_email, status, created_at
      FROM resource_requests
      WHERE id = :id
      LIMIT 1
    ");
    $get->execute([":id" => $id]);

    jsonResponse(true, "Resource request saved", $get->fetch(), 201);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to save request", ["error" => $e->getMessage()], 500);
}