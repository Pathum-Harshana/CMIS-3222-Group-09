<?php
$pdo = new PDO('mysql:host=localhost;dbname=aurahub', 'root', '');
$stmt = $pdo->prepare("UPDATE users SET role = 'doctor' WHERE email = 'admin1@aurahub.local'");
if($stmt->execute()) {
    echo "Success. Rows affected: " . $stmt->rowCount();
} else {
    echo "Failed: "; print_r($stmt->errorInfo());
}
?>
