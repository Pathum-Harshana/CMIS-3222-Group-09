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
if (!in_array($user["role"], ["lecturer", "admin"], true)) {
    jsonResponse(false, "Lecturer access required", null, 403);
}

$in = json_decode(file_get_contents("php://input"), true);
$id = (int)($in["id"] ?? 0);
if ($id <= 0) jsonResponse(false, "Valid availability id is required", null, 422);

try {
    $params = [":id" => $id];
    $where = "id = :id";
    if ($user["role"] === "lecturer") {
        $where .= " AND lecturer_id = :uid";
        $params[":uid"] = $user["id"];
    }
    $stmt = $pdo->prepare("UPDATE mentor_availability SET is_active = 0 WHERE $where");
    $stmt->execute($params);
    jsonResponse(true, "Availability removed", ["id" => $id]);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to remove availability", ["error" => $e->getMessage()], 500);
}
