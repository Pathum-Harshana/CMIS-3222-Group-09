<?php
$hash = '$2b$12$bKnE5WxcZcaJgoTd6uMkQeWN4igD4efYURVgMH.d9AG8VXhF5j3wa';
$password = 'Admin1@123';
var_dump(password_verify($password, $hash));
?>
