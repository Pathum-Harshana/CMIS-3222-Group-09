<?php
header("Access-Control-Allow-Origin: *");

header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

if (empty($_SESSION["user"])) jsonResponse(false, "Not logged in", null, 401);

try {
    require_once __DIR__ . "/../config/db.php";
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = :id LIMIT 1");
    $stmt->execute([":id" => $_SESSION["user"]["id"]]);
    if ($u = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $_SESSION["user"]["role"] = $u["role"];
    } else {
        session_destroy();
        jsonResponse(false, "User not found", null, 401);
    }
} catch (Throwable $e) {}

jsonResponse(true, "OK", $_SESSION["user"]);