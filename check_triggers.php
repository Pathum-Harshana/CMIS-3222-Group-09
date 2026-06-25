<?php
$pdo = new PDO('mysql:host=localhost;dbname=aurahub', 'root', '');
$stmt = $pdo->query("UPDATE users SET role = 'admin' WHERE email = 'admin1@aurahub.local'");
$stmt2 = $pdo->query("UPDATE users SET role = 'doctor' WHERE email = 'pathum3893e@gmail.com'");
echo "Updated roles.";
?>
