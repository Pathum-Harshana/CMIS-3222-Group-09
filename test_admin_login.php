<?php
require_once __DIR__ . '/api/config/db.php';

header('Content-Type: application/json; charset=UTF-8');

$email = 'admin@aurahub.local';
$pass  = 'Admin@123';

try {
  $q = $pdo->prepare('SELECT id, email, password_hash, role FROM users WHERE email = :e LIMIT 1');
  $q->execute([':e'=>$email]);
  $u = $q->fetch();
  if (!$u) {
    echo json_encode(['success'=>false,'message'=>'User not found','email'=>$email]);
    exit;
  }

  $ok = password_verify($pass, $u['password_hash']);
  echo json_encode([
    'success'=>true,
    'email'=>$u['email'],
    'role'=>$u['role'],
    'hash_matches_input_password'=>$ok,
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Error','error'=>$e->getMessage()]);
}

