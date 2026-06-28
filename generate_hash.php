<?php
if ($argc < 2) {
    echo "Usage: php generate_hash.php <password>\n";
    exit(1);
}
$pass = $argv[1];
$hash = password_hash($pass, PASSWORD_BCRYPT);
echo $hash . PHP_EOL;
?>
