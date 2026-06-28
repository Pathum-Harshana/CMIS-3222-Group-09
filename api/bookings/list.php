<?php
// -----------------------------------------------------------------------------
// list.php
// Lists booked sessions for the logged-in student, lecturer, or doctor.
// Provider dashboards use this to show student chats.
// -----------------------------------------------------------------------------

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

$user = requireLogin();
$role = $user["role"] ?? "";
$userId = (int)$user["id"];

try {
    if (in_array($role, ["lecturer", "doctor"], true)) {
        $where = "sb.mentor_id = :uid";
    } else {
        $where = "sb.student_id = :uid";
    }

    $stmt = $pdo->prepare("
        SELECT
            sb.id,
            sb.mentor_id,
            sb.student_id,
            sb.session_date,
            sb.start_time,
            sb.end_time,
            sb.status,
            mentor.full_name AS mentor_name,
            mentor.role AS mentor_role,
            student.full_name AS student_name,
            student.email AS student_email,
            (
                SELECT cm.message
                FROM chat_messages cm
                WHERE cm.booking_id = sb.id
                ORDER BY cm.created_at DESC, cm.id DESC
                LIMIT 1
            ) AS last_message,
            (
                SELECT cm.created_at
                FROM chat_messages cm
                WHERE cm.booking_id = sb.id
                ORDER BY cm.created_at DESC, cm.id DESC
                LIMIT 1
            ) AS last_message_at
        FROM session_bookings sb
        JOIN users mentor ON mentor.id = sb.mentor_id
        JOIN users student ON student.id = sb.student_id
        WHERE $where
          AND sb.status = 'booked'
        ORDER BY sb.session_date DESC, sb.start_time DESC, sb.id DESC
    ");
    $stmt->execute([":uid" => $userId]);

    jsonResponse(true, "Bookings fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to load bookings", ["error" => $e->getMessage()], 500);
}
