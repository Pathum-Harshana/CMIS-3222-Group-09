<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

requireAdmin();

try {
    $stmt = $pdo->query("
      SELECT rr.id, rr.user_id, rr.request_type, rr.requester_email, rr.status, rr.created_at, u.full_name
      FROM resource_requests rr
      JOIN users u ON u.id = rr.user_id
      ORDER BY rr.created_at DESC
    ");
    jsonResponse(true, "Resource requests fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch resource requests", ["error"=>$e->getMessage()], 500);
}