<?php
// -----------------------------------------------------------------------------
// save.php
// Allows a lecturer (or admin) to add a new available time slot for booking sessions.
// Checks for conflicts with existing bookings and validates all input.
// -----------------------------------------------------------------------------

// Allow cross-origin requests and set JSON response type
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

// Include database connection, JSON response helper, and authentication
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

// Only allow access if the user is logged in
$user = requireLogin();
// Lecturers/doctors can manage their own slots; admins can assign slots to any
// lecturer or doctor.
if (!in_array($user["role"], ["lecturer", "admin", "super_admin", "doctor"], true)) {
    jsonResponse(false, "Lecturer access required", null, 403);
}

// Get input data from the request body (JSON)
$in = json_decode(file_get_contents("php://input"), true);
$lecturerId = (int)($in["lecturer_id"] ?? 0);
$doctor_id = (int)($in["doctor_id"] ?? 0);
$date = trim($in["available_date"] ?? "");
$start = trim($in["start_time"] ?? "");
$end = trim($in["end_time"] ?? "");
$note = trim($in["note"] ?? "");
$d_date = $date;
$d_start = $start;
$d_end = $end;
$d_note = $note;
$isAdmin = in_array($user["role"], ["admin", "super_admin"], true);
$isDoctor = ($user["role"] === "doctor") || ($isAdmin && array_key_exists("doctor_id", $in));

if ($isDoctor) {
    $doctor_id = $isAdmin ? $doctor_id : (int)$user["id"];
} else {
    $lecturerId = $isAdmin ? $lecturerId : (int)$user["id"];
}

// --- Input validation ---
if (($isDoctor && $doctor_id <= 0) || (!$isDoctor && $lecturerId <= 0) || $date === "" || $start === "" || $end === "") {
    jsonResponse(false, "User, date, start time, and end time are required", null, 422);
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    jsonResponse(false, "Invalid date format", null, 422);
}
if (!preg_match('/^\d{2}:\d{2}$/', $start) || !preg_match('/^\d{2}:\d{2}$/', $end)) {
    jsonResponse(false, "Invalid time format", null, 422);
}
if ($start >= $end) {
    jsonResponse(false, "End time must be after start time", null, 422);
}

try {
    // Verify that the user (lecturer or doctor) exists
    if ($isDoctor) {
        // Doctor existence check
        $check = $pdo->prepare("SELECT id FROM users WHERE id = :id AND role = 'doctor' LIMIT 1");
        $check->execute([":id" => $doctor_id]);
        if (!$check->fetch()) jsonResponse(false, "Selected doctor not found", null, 404);
    } else {
        // Mentor availability must belong to a lecturer account.
        $check = $pdo->prepare("SELECT id FROM users WHERE id = :id AND role = 'lecturer' LIMIT 1");
        $check->execute([":id" => $lecturerId]);
        if (!$check->fetch()) jsonResponse(false, "Selected lecturer not found", null, 404);
    }

    // Conflict check only relevant for mentor slots
    if (!$isDoctor && in_array($user["role"], ["lecturer", "admin"])) {
        $conflict = $pdo->prepare(
            "SELECT id FROM session_bookings\n            WHERE mentor_id = :mentor_id\n              AND session_date = :session_date\n              AND status = 'booked'\n              AND ((start_time < :end_time AND end_time > :start_time))\n            LIMIT 1"
        );
        $conflict->execute([
            ":mentor_id" => $lecturerId,
            ":session_date" => $date,
            ":start_time" => $start,
            ":end_time" => $end
        ]);
        if ($conflict->fetch()) {
            jsonResponse(false, "Cannot update availability: mentor has booked sessions in this time slot.", null, 409);
        }
    }

    if ($isDoctor) {
        // Doctor availability (doctor_id)
        $stmt = $pdo->prepare(
            "INSERT INTO doctor_availability (doctor_id, available_date, start_time, end_time, note)\n            VALUES (:doctor_id, :available_date, :start_time, :end_time, :note)"
        );
        $stmt->execute([
            ":doctor_id" => $doctor_id,
            ":available_date" => $d_date,
            ":start_time" => $d_start,
            ":end_time" => $d_end,
            ":note" => $d_note
        ]);
    } else {
        // Mentor availability (lecturer_id)
        $stmt = $pdo->prepare(
            "INSERT INTO mentor_availability (lecturer_id, available_date, start_time, end_time, note)\n            VALUES (:lecturer_id, :available_date, :start_time, :end_time, :note)"
        );
        $stmt->execute([
            ":lecturer_id" => $lecturerId,
            ":available_date" => $date,
            ":start_time" => $start,
            ":end_time" => $end,
            ":note" => $note
        ]);
    }

    // Return success with the new slot's ID
    jsonResponse(true, "Availability saved", ["id" => (int)$pdo->lastInsertId()], 201);
} catch (Throwable $e) {
    // If something goes wrong, return an error message
    jsonResponse(false, "Failed to save availability", ["error" => $e->getMessage()], 500);
}
