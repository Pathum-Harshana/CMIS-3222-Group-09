<?php
// -----------------------------------------------------------------------------
// mentors_with_availability.php
// Returns all lecturers and their available time slots for booking sessions.
// Used by the Book a Session page to show mentors and their availability.
// -----------------------------------------------------------------------------

// Allow cross-origin requests and set JSON response type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Include database connection, JSON response helper, and authentication
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

// Only allow access if the user is logged in
$user = requireLogin();

try {
    // 1. Get all users with the 'lecturer' role
    //    - We want to show all lecturers, even if they have no available slots
    $stmt = $pdo->query('
        SELECT id AS lecturer_id, full_name AS lecturer_name, email AS lecturer_email
        FROM users
        WHERE role = "lecturer"
    ');
    $lecturers = $stmt->fetchAll();

    // 2. Get all active, future availability slots from mentor_availability table
    //    - Only slots that are active and in the future are included
    $slotsStmt = $pdo->query('SELECT * FROM mentor_availability WHERE is_active = 1 AND available_date >= CURDATE()');
    $slots = $slotsStmt->fetchAll();

    // 3. Group slots by lecturer_id for easy lookup
    $slotsByLecturer = [];
    foreach ($slots as $slot) {
        $slotsByLecturer[$slot['lecturer_id']][] = $slot;
    }

    // 4. Attach slots to each lecturer
    //    - If the lecturer has slots, attach them; otherwise, attach an empty array
    foreach ($lecturers as &$lecturer) {
        $lecturer['slots'] = $slotsByLecturer[$lecturer['lecturer_id']] ?? [];
    }

    // 5. Return the list of lecturers and their slots as JSON
    jsonResponse(true, "Lecturers and availability fetched", $lecturers);
} catch (Throwable $e) {
    // If something goes wrong, return an error message
    jsonResponse(false, "Failed to fetch lecturers", ["error" => $e->getMessage()], 500);
}
