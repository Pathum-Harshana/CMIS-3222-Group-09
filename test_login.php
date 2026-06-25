<?php
$payload = ['email' => 'admin1@aurahub.local', 'password' => 'Admin1@123'];
$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($payload),
        'ignore_errors' => true
    ]
];
$context = stream_context_create($options);
$result = file_get_contents('http://localhost/Aurahub/api/auth/login.php', false, $context);
if ($result === false) {
    echo "Request failed\n";
} else {
    echo $result;
}
?>
