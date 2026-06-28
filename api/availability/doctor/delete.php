<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";
require_once __DIR__ . "/../../helpers/auth.php";

$user = requireSuperAdmin();

// Super admin required - no additional role check

$body = json_decode(file_get_contents("php://input"), true);
$id = isset($body['id']) ? (int)$body['id'] : 0;
if (!$id) {
    jsonResponse(false, "Missing id", null, 422);
}

try {
$q = $pdo->prepare("DELETE FROM doctor_availability WHERE id = :id");
    $q->execute([':id' => $id]);

    jsonResponse(true, "Doctor slot deleted");
} catch (Throwable $e) {
    jsonResponse(false, "Failed to delete doctor slot", ["error" => $e->getMessage()], 500);
}

