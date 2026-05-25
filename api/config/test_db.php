<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";

try {
    $version = $pdo->query("SELECT VERSION() AS v")->fetch();
    $dbName = $pdo->query("SELECT DATABASE() AS db")->fetch();

    echo json_encode([
        "success" => true,
        "message" => "Database connection OK",
        "version" => $version["v"] ?? null,
        "database" => $dbName["db"] ?? null,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "DB connected but query failed",
        "error" => $e->getMessage()
    ]);
}

