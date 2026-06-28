<?php
// -----------------------------------------------------------------------------
// test_db.php
// Simple script to test the database connection for development purposes.
// -----------------------------------------------------------------------------

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php"; // Use main DB connection config

try {
    // Query the MySQL version and current database name
    $version = $pdo->query("SELECT VERSION() AS v")->fetch();
    $dbName = $pdo->query("SELECT DATABASE() AS db")->fetch();

    // Return a JSON response with connection info
    echo json_encode([
        "success" => true,
        "message" => "Database connection OK",
        "version" => $version["v"] ?? null,
        "database" => $dbName["db"] ?? null,
    ]);
} catch (Throwable $e) {
    // If query fails, return a JSON error
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "DB connected but query failed",
        "error" => $e->getMessage()
    ]);
}

