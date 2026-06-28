<?php
$pdo = new PDO('mysql:host=localhost;dbname=aurahub', 'root', '');
$stmt = $pdo->query('SELECT id, email, role FROM users');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
