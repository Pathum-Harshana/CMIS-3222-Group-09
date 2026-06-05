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
        if (!in_array($user["role"], ["lecturer", "admin"], true)) {
            jsonResponse(false, "Lecturer access required", null, 403);
        }
        if ($user["role"] === "lecturer") {
            $where .= " AND ma.lecturer_id = :uid";
            $params[":uid"] = $user["id"];
        }
    } elseif (!$all || $user["role"] !== "admin") {
        $where .= " AND ma.available_date >= CURDATE()";
    }

    $stmt = $pdo->prepare("
      SELECT ma.id, ma.lecturer_id, ma.available_date, ma.start_time, ma.end_time, ma.note, ma.is_active,
             u.full_name AS lecturer_name, u.email AS lecturer_email
      FROM mentor_availability ma
      JOIN users u ON u.id = ma.lecturer_id
      $where
      ORDER BY ma.available_date ASC, ma.start_time ASC
    ");
    $stmt->execute($params);
    jsonResponse(true, "Availability fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch availability", ["error" => $e->getMessage()], 500);
}
