<?php
$data = json_encode(["id" => 2, "role" => "doctor"]);
$ch = curl_init('http://localhost/AuraHub/api/admin/set_role.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));

// Since it requires super admin, we must mock the session
session_start();
$_SESSION["user"] = [
    "id" => 19, // superadmin ID
    "role" => "super_admin",
    "email" => "superadmin@aurahub.local"
];
$session_id = session_id();
session_write_close();

curl_setopt($ch, CURLOPT_COOKIE, "PHPSESSID=" . $session_id);

$result = curl_exec($ch);
echo "Result: " . $result;
?>
