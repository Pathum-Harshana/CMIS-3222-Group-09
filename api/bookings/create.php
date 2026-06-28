<?php
// -----------------------------------------------------------------------------
// create.php
// Creates a mentor session booking for the selected availability slot.
// The chat feature uses this booking ID to keep messages attached to a session.
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
$providerType = strtolower(trim($in["provider_type"] ?? "mentor"));
$mentorId = (int)($in["mentor_id"] ?? $in["doctor_id"] ?? 0);
$slotId = (int)($in["slot_id"] ?? 0);

if ($mentorId <= 0 || $slotId <= 0) {
    jsonResponse(false, "provider id and slot_id are required", null, 422);
}
if (!in_array($providerType, ["mentor", "doctor"], true)) {
    jsonResponse(false, "Invalid provider_type", null, 422);
}

try {
    if ($providerType === "doctor") {
        $slot = $pdo->prepare("
            SELECT da.id, da.doctor_id AS provider_id, da.available_date, da.start_time, da.end_time, u.full_name AS provider_name
            FROM doctor_availability da
            JOIN users u ON u.id = da.doctor_id
            WHERE da.id = :slot_id
              AND da.doctor_id = :mentor_id
              AND da.is_active = 1
              AND u.role = 'doctor'
            LIMIT 1
        ");
    } else {
        $slot = $pdo->prepare("
            SELECT ma.id, ma.lecturer_id AS provider_id, ma.available_date, ma.start_time, ma.end_time, u.full_name AS provider_name
            FROM mentor_availability ma
            JOIN users u ON u.id = ma.lecturer_id
            WHERE ma.id = :slot_id
              AND ma.lecturer_id = :mentor_id
              AND ma.is_active = 1
              AND u.role = 'lecturer'
            LIMIT 1
        ");
    }
    $slot->execute([
        ":slot_id" => $slotId,
        ":mentor_id" => $mentorId
    ]);
    $row = $slot->fetch();

    if (!$row) {
        jsonResponse(false, "Selected slot was not found", null, 404);
    }

    $conflict = $pdo->prepare("
        SELECT id
        FROM session_bookings
        WHERE mentor_id = :mentor_id
          AND session_date = :session_date
          AND status = 'booked'
          AND start_time < :end_time
          AND end_time > :start_time
        LIMIT 1
    ");
    $conflict->execute([
        ":mentor_id" => $mentorId,
        ":session_date" => $row["available_date"],
        ":start_time" => $row["start_time"],
        ":end_time" => $row["end_time"]
    ]);

    if ($conflict->fetch()) {
        jsonResponse(false, "This time slot is already booked", null, 409);
    }

    $insert = $pdo->prepare("
        INSERT INTO session_bookings (mentor_id, student_id, session_date, start_time, end_time, status)
        VALUES (:mentor_id, :student_id, :session_date, :start_time, :end_time, 'booked')
    ");
    $insert->execute([
        ":mentor_id" => $mentorId,
        ":student_id" => (int)$user["id"],
        ":session_date" => $row["available_date"],
        ":start_time" => $row["start_time"],
        ":end_time" => $row["end_time"]
    ]);

    $bookingId = (int)$pdo->lastInsertId();
    jsonResponse(true, "Booking confirmed", [
        "id" => $bookingId,
        "mentor_id" => $mentorId,
        "mentor_name" => $row["provider_name"],
        "provider_type" => $providerType,
        "student_id" => (int)$user["id"],
        "session_date" => $row["available_date"],
        "start_time" => $row["start_time"],
        "end_time" => $row["end_time"],
        "status" => "booked"
    ], 201);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to create booking", ["error" => $e->getMessage()], 500);
}
