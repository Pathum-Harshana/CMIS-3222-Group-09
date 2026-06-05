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
// Only lecturers and admins can add availability
if (!in_array($user["role"], ["lecturer", "admin"], true)) {
    jsonResponse(false, "Lecturer access required", null, 403);
}

// Get input data from the request body (JSON)
$in = json_decode(file_get_contents("php://input"), true);
$lecturerId = (int)($in["lecturer_id"] ?? $user["id"]); // Default to current user
$date = trim($in["available_date"] ?? "");
$start = trim($in["start_time"] ?? "");
$end = trim($in["end_time"] ?? "");
$note = trim($in["note"] ?? "");

// Only admin can set lecturer_id for others; lecturers can only set their own
if ($user["role"] !== "admin") $lecturerId = (int)$user["id"];

// --- Input validation ---
if ($lecturerId <= 0 || $date === "" || $start === "" || $end === "") {
    jsonResponse(false, "Lecturer, date, start time, and end time are required", null, 422);
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
    // Check that the lecturer exists in the users table
    $check = $pdo->prepare("SELECT id FROM users WHERE id = :id AND role IN ('lecturer','admin') LIMIT 1");
    $check->execute([":id" => $lecturerId]);
    if (!$check->fetch()) jsonResponse(false, "Selected lecturer not found", null, 404);

    // Check for conflicting booked sessions in this time slot
    $conflict = $pdo->prepare("
        SELECT id FROM session_bookings
        WHERE mentor_id = :mentor_id
          AND session_date = :session_date
          AND status = 'booked'
          AND ((start_time < :end_time AND end_time > :start_time))
        LIMIT 1
    ");
    $conflict->execute([
        ":mentor_id" => $lecturerId,
        ":session_date" => $date,
        ":start_time" => $start,
        ":end_time" => $end
    ]);
    if ($conflict->fetch()) {
        jsonResponse(false, "Cannot update availability: mentor has booked sessions in this time slot.", null, 409);
    }

    // Insert the new availability slot
    $stmt = $pdo->prepare("
      INSERT INTO mentor_availability (lecturer_id, available_date, start_time, end_time, note)
      VALUES (:lecturer_id, :available_date, :start_time, :end_time, :note)
    ");
    $stmt->execute([
      ":lecturer_id" => $lecturerId,
      ":available_date" => $date,
      ":start_time" => $start,
      ":end_time" => $end,
      ":note" => $note
    ]);

    // Return success with the new slot's ID
    jsonResponse(true, "Availability saved", ["id" => (int)$pdo->lastInsertId()], 201);
} catch (Throwable $e) {
    // If something goes wrong, return an error message
    jsonResponse(false, "Failed to save availability", ["error" => $e->getMessage()], 500);
}
