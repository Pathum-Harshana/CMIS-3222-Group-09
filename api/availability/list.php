<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

$user = requireLogin();
$mine = ($_GET["mine"] ?? "") === "1";
$all = ($_GET["all"] ?? "") === "1";

try {
    $params = [];
    $where = "WHERE ma.is_active = 1";

    if ($mine) {
        // Allow doctors to fetch their own availability when "type=doctor"
        $type = $_GET["type"] ?? "";
        $allowedRoles = $type === "doctor" ? ["doctor", "admin", "super_admin"] : ["lecturer", "admin", "super_admin"];
        if (!in_array($user["role"], $allowedRoles, true)) {
            jsonResponse(false, "Access denied", null, 403);
        }
        if ($type === "doctor" && $user["role"] === "doctor") {
            $where .= " AND ma.doctor_id = :uid";
            $params[":uid"] = $user["id"];
        } elseif ($type !== "doctor" && $user["role"] === "lecturer") {
            $where .= " AND ma.lecturer_id = :uid";
            $params[":uid"] = $user["id"];
        }
    } elseif (!$all || ($user["role"] !== "admin" && $user["role"] !== "super_admin")) {
        $where .= " AND ma.available_date >= CURDATE()";
    }

    // Determine which table to query based on "type" parameter (default mentor)
    $type = $_GET["type"] ?? "";
    $table = $type === "doctor" ? "doctor_availability" : "mentor_availability";
    $idField = $type === "doctor" ? "doctor_id" : "lecturer_id";
    $roleFilter = $type === "doctor" ? " AND u.role = 'doctor'" : " AND u.role = 'lecturer'";

    $stmt = $pdo->prepare(
      "
        SELECT ma.id, ma.$idField AS lecturer_id, ma.available_date, ma.start_time, ma.end_time, ma.note, ma.is_active,
               u.full_name AS lecturer_name, u.email AS lecturer_email
        FROM $table ma
        JOIN users u ON u.id = ma.$idField $roleFilter
        $where
        ORDER BY ma.available_date ASC, ma.start_time ASC
      "
    );
    $stmt->execute($params);
    jsonResponse(true, "Availability fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch availability", ["error" => $e->getMessage()], 500);
}
