<?php
// -----------------------------------------------------------------------------
// list.php
// Returns chat messages for a booked mentor session.
// Only the two booking participants can read the session chat.
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
$bookingId = (int)($_GET["booking_id"] ?? 0);

if ($bookingId <= 0) {
    jsonResponse(false, "booking_id is required", null, 422);
}

try {
    $booking = $pdo->prepare("
        SELECT id, mentor_id, student_id
        FROM session_bookings
        WHERE id = :id
        LIMIT 1
    ");
    $booking->execute([":id" => $bookingId]);
    $row = $booking->fetch();

    if (!$row) {
        jsonResponse(false, "Booking not found", null, 404);
    }

    $canRead = (int)$row["student_id"] === (int)$user["id"]
        || (int)$row["mentor_id"] === (int)$user["id"];

    if (!$canRead) {
        jsonResponse(false, "Forbidden", null, 403);
    }

    $stmt = $pdo->prepare("
        SELECT
            cm.id,
            cm.booking_id,
            cm.sender_id,
            cm.receiver_id,
            cm.message,
            cm.created_at,
            sender.full_name,
            sender.role,
            receiver.full_name AS receiver_name
        FROM chat_messages cm
        JOIN users sender ON sender.id = cm.sender_id
        LEFT JOIN users receiver ON receiver.id = cm.receiver_id
        WHERE cm.booking_id = :booking_id
          AND (cm.sender_id = :user_id OR cm.receiver_id = :user_id)
        ORDER BY cm.created_at ASC, cm.id ASC
    ");
    $stmt->execute([
        ":booking_id" => $bookingId,
        ":user_id" => (int)$user["id"]
    ]);

    jsonResponse(true, "Messages fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to load messages", ["error" => $e->getMessage()], 500);
}
