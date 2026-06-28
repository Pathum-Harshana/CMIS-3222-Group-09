<?php
// Alias/adapter for medical doctor availability.
// If you already store doctor slots in `mentor_availability` table,
// this endpoint reuses the same data but returns it as "doctors".
//
// If you later introduce a dedicated `doctor_availability` table,
// update the SQL accordingly.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

$user = requireLogin();

try {
    // Allow roles: doctor/admin.
    // (You can still store doctor availability using the existing mentor_availability table.)
if (!in_array($user["role"] ?? "", ["doctor", "admin", "super_admin"], true)) {
        jsonResponse(false, "Doctor access required", null, 403);
    }

    $params = [];
    $where = "WHERE ma.is_active = 1 AND ma.available_date >= CURDATE()";

    if ($user["role"] === "doctor" || $user["role"] === "lecturer") {
        $where .= " AND ma.doctor_id = :uid";
        $params[":uid"] = $user["id"];
    }

    $stmt = $pdo->prepare("SELECT ma.id, ma.doctor_id, ma.available_date, ma.start_time, ma.end_time, ma.note, ma.is_active,
u.full_name AS doctor_name, u.email AS doctor_email
FROM doctor_availability ma
JOIN users u ON u.id = ma.doctor_id AND u.role = 'doctor'
                            $where
                            ORDER BY ma.available_date ASC, ma.start_time ASC");
    $stmt->execute($params);

    // For UI compatibility, group by lecturer_id and return as a list.
    $rows = $stmt->fetchAll();
    $grouped = [];
    foreach ($rows as $r) {
        $lid = $r['doctor_id'];
        if (!isset($grouped[$lid])) {
            $grouped[$lid] = [
                'doctor_id' => $lid,
'doctor_name' => $r['doctor_name'],
'doctor_email' => $r['doctor_email'],
                'slots' => []
            ];
        }
        // Keep DB columns naming aligned with app.js slotLabel() usage
$grouped[$lid]['slots'][] = [
            'id' => $r['id'],
            'lecturer_id' => $r['doctor_id'],
            'available_date' => $r['available_date'],
            'start_time' => $r['start_time'],
            'end_time' => $r['end_time'],
            'note' => $r['note'],
        ];
    }

    jsonResponse(true, "Doctor availability fetched", array_values($grouped));
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch doctor availability", ["error" => $e->getMessage()], 500);
}

