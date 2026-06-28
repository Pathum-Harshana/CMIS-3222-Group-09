<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";
require_once __DIR__ . "/../../helpers/auth.php";

$user = requireLogin();

if (!in_array($user["role"] ?? "", ["doctor", "admin", "super_admin"], true)) {
    jsonResponse(false, "Doctor access required", null, 403);
}

$mine = (($_GET['mine'] ?? '') === '1');
$all = (($_GET['all'] ?? '') === '1');

try {
    $params = [];
    $where = "WHERE ma.is_active = 1";

    if ($mine && $user['role'] === 'doctor') {
        $where .= " AND ma.doctor_id = :uid";
        $params[':uid'] = (int)$user['id'];
    } elseif (!$all && $user['role'] !== 'admin' && $user['role'] !== 'super_admin') {
        $where .= " AND ma.doctor_id = :uid";
        $params[':uid'] = (int)$user['id'];
    }

    $stmt = $pdo->prepare("SELECT ma.id, ma.doctor_id, ma.doctor_id AS lecturer_id,
                                   ma.available_date, ma.start_time, ma.end_time, ma.note, ma.is_active,
                                   u.full_name AS doctor_name, u.email AS doctor_email,
                                   u.full_name AS lecturer_name, u.email AS lecturer_email
                            FROM doctor_availability ma
                            JOIN users u ON u.id = ma.doctor_id AND u.role = 'doctor'
                            $where
                            ORDER BY ma.available_date ASC, ma.start_time ASC");
    $stmt->execute($params);

    jsonResponse(true, "Doctor slots fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch doctor slots", ["error" => $e->getMessage()], 500);
}

