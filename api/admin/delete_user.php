<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

$admin = requireSuperAdmin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Invalid request method", null, 405);
}

$in = json_decode(file_get_contents("php://input"), true);
$id = (int)($in["id"] ?? 0);

if ($id <= 0) {
    jsonResponse(false, "Valid user id required", null, 422);
}
if ($id === (int)$admin["id"]) {
    jsonResponse(false, "You cannot remove your own super admin account", null, 422);
}

function tableExists(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare("SHOW TABLES LIKE :table_name");
    $stmt->execute([":table_name" => $table]);
    return (bool)$stmt->fetchColumn();
}

function deleteIfTableExists(PDO $pdo, string $table, string $column, int $userId): void {
    if (!tableExists($pdo, $table)) return;
    $stmt = $pdo->prepare("DELETE FROM `$table` WHERE `$column` = :id");
    $stmt->execute([":id" => $userId]);
}

try {
    $check = $pdo->prepare("SELECT id, role FROM users WHERE id = :id LIMIT 1");
    $check->execute([":id" => $id]);
    $target = $check->fetch();

    if (!$target) {
        jsonResponse(false, "User not found", null, 404);
    }

    if (($target["role"] ?? "") === "super_admin") {
        $count = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'")->fetchColumn();
        if ($count <= 1) {
            jsonResponse(false, "At least one super admin account must remain", null, 422);
        }
    }

    $pdo->beginTransaction();

    deleteIfTableExists($pdo, "comments", "user_id", $id);
    deleteIfTableExists($pdo, "posts", "user_id", $id);
    deleteIfTableExists($pdo, "talent_profiles", "user_id", $id);
    deleteIfTableExists($pdo, "resource_requests", "user_id", $id);
    deleteIfTableExists($pdo, "doctor_availability", "doctor_id", $id);
    deleteIfTableExists($pdo, "mentor_availability", "lecturer_id", $id);
    deleteIfTableExists($pdo, "lecturer_availability", "lecturer_id", $id);
    deleteIfTableExists($pdo, "session_bookings", "mentor_id", $id);
    deleteIfTableExists($pdo, "session_bookings", "student_id", $id);
    deleteIfTableExists($pdo, "slots", "user_id", $id);

    $deleteUser = $pdo->prepare("DELETE FROM users WHERE id = :id");
    $deleteUser->execute([":id" => $id]);

    $pdo->commit();

    jsonResponse(true, "User removed", ["id" => $id]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, "Failed to remove user", ["error" => $e->getMessage()], 500);
}
