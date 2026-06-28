<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../helpers/response.php";
require_once __DIR__ . "/../../helpers/auth.php";

$user = requireLogin();
$role = $user['role'] ?? '';

if (!in_array($role, ['student', 'lecturer', 'doctor', 'admin', 'super_admin'], true)) {
  jsonResponse(false, 'Access denied', null, 403);
}

$mine = (($_GET['mine'] ?? '') === '1');
$all = (($_GET['all'] ?? '') === '1');
$grouped = (($_GET['grouped'] ?? '') === '1');

try {
  if ($grouped && !$mine && $role !== 'doctor') {
    $doctorsStmt = $pdo->query("SELECT id AS doctor_id, full_name AS doctor_name, email AS doctor_email
                                FROM users
                                WHERE role = 'doctor'
                                ORDER BY full_name ASC, id ASC");
    $doctors = $doctorsStmt->fetchAll();

    $slotsStmt = $pdo->query("SELECT da.id, da.doctor_id, da.available_date, da.start_time, da.end_time, da.note, da.is_active
                              FROM doctor_availability da
                              JOIN users u ON u.id = da.doctor_id AND u.role = 'doctor'
                              WHERE da.is_active = 1 AND da.available_date >= CURDATE()
                              ORDER BY da.available_date ASC, da.start_time ASC");
    $slotsByDoctor = [];
    foreach ($slotsStmt->fetchAll() as $slot) {
      $slotsByDoctor[$slot['doctor_id']][] = $slot;
    }

    foreach ($doctors as &$doctor) {
      $doctor['slots'] = $slotsByDoctor[$doctor['doctor_id']] ?? [];
    }

    jsonResponse(true, 'Doctors and availability fetched', $doctors);
  }

  $params = [];
  $where = 'WHERE da.is_active = 1';

  if ($mine || $role === 'doctor') {
    // For doctor role, only show their own slots
    $where .= ' AND da.doctor_id = :uid';
    $params[':uid'] = (int)$user['id'];
  } elseif (!$all || !in_array($role, ['admin', 'super_admin'], true)) {
    $where .= ' AND da.available_date >= CURDATE()';
  }

  $stmt = $pdo->prepare("SELECT da.id, da.doctor_id, da.available_date, da.start_time, da.end_time, da.note, da.is_active,
                                 u.full_name AS doctor_name, u.email AS doctor_email
                          FROM doctor_availability da
                          JOIN users u ON u.id = da.doctor_id AND u.role = 'doctor'
                          $where
                          ORDER BY da.available_date ASC, da.start_time ASC");
  $stmt->execute($params);

  jsonResponse(true, 'Doctor availability fetched', $stmt->fetchAll());
} catch (Throwable $e) {
  jsonResponse(false, 'Failed to fetch doctor availability', ['error' => $e->getMessage()], 500);
}

