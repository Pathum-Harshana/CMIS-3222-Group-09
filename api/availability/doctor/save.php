<?php
// Save a doctor (medical) availability slot.
// Uses dedicated doctor_availability table.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";
require_once __DIR__ . "/../../helpers/auth.php";

$user = requireLogin();

if (!in_array($user['role'] ?? '', ['doctor', 'admin', 'super_admin'], true)) {
  jsonResponse(false, 'Doctor access required', null, 403);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  jsonResponse(false, 'Invalid JSON body', null, 400);
}

$available_date = $body['available_date'] ?? null;
$start_time = $body['start_time'] ?? null;
$end_time = $body['end_time'] ?? null;
$note = $body['note'] ?? '';

if (!$available_date || !$start_time || !$end_time) {
  jsonResponse(false, 'Missing required fields', null, 422);
}

try {
  $doctorId = null;
  if ($user['role'] === 'doctor') {
    $doctorId = (int)$user['id'];
  } else {
    // admin assigns
    $doctorId = isset($body['doctor_id']) ? (int)$body['doctor_id'] : null;
  }

  if (!$doctorId) {
    jsonResponse(false, 'doctor_id required for admin', null, 422);
  }

  $check = $pdo->prepare("SELECT id FROM users WHERE id = :id AND role = 'doctor' LIMIT 1");
  $check->execute([':id' => $doctorId]);
  if (!$check->fetch()) {
    jsonResponse(false, 'Selected doctor not found', null, 404);
  }

  $q = $pdo->prepare("INSERT INTO doctor_availability (doctor_id, available_date, start_time, end_time, note, is_active)
                       VALUES (:uid, :d, :st, :et, :n, 1)");
  $q->execute([
    ':uid' => $doctorId,
    ':d' => $available_date,
    ':st' => $start_time,
    ':et' => $end_time,
    ':n' => $note,
  ]);

  jsonResponse(true, 'Doctor slot saved', ['id' => (int)$pdo->lastInsertId()]);
} catch (Throwable $e) {
  jsonResponse(false, 'Failed to save doctor slot', ['error' => $e->getMessage()], 500);
}

