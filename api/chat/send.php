<?php
// -----------------------------------------------------------------------------
// send.php
// Saves a message in a booked mentor session chat.
// -----------------------------------------------------------------------------

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

$user = requireLogin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Invalid request method", null, 405);
}

$in = json_decode(file_get_contents("php://input"), true);
$bookingId = (int)($in["booking_id"] ?? 0);
$message = trim($in["message"] ?? "");

if ($bookingId <= 0) {
    jsonResponse(false, "booking_id is required", null, 422);
}
if ($message === "") {
    jsonResponse(false, "Message is required", null, 422);
}
if (mb_strlen($message) > 500) {
    jsonResponse(false, "Message too long (max 500 characters)", null, 422);
}

try {
    $booking = $pdo->prepare("
        SELECT id, mentor_id, student_id, status
        FROM session_bookings
        WHERE id = :id
        LIMIT 1
    ");
    $booking->execute([":id" => $bookingId]);
    $row = $booking->fetch();

    if (!$row) {
        jsonResponse(false, "Booking not found", null, 404);
    }
    if (($row["status"] ?? "") !== "booked") {
        jsonResponse(false, "Chat is only available for booked sessions", null, 409);
    }

    $senderId = (int)$user["id"];
    $studentId = (int)$row["student_id"];
    $mentorId = (int)$row["mentor_id"];

    if ($senderId === $studentId) {
        $receiverId = $mentorId;
    } elseif ($senderId === $mentorId) {
        $receiverId = $studentId;
    } else {
        jsonResponse(false, "Forbidden", null, 403);
    }

    $insert = $pdo->prepare("
        INSERT INTO chat_messages (booking_id, sender_id, receiver_id, message)
        VALUES (:booking_id, :sender_id, :receiver_id, :message)
    ");
    $insert->execute([
        ":booking_id" => $bookingId,
        ":sender_id" => $senderId,
        ":receiver_id" => $receiverId,
        ":message" => $message
    ]);

    $id = (int)$pdo->lastInsertId();
    $get = $pdo->prepare("
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
        JOIN users receiver ON receiver.id = cm.receiver_id
        WHERE cm.id = :id
        LIMIT 1
    ");
    $get->execute([":id" => $id]);

    jsonResponse(true, "Message sent", $get->fetch(), 201);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to send message", ["error" => $e->getMessage()], 500);
}
