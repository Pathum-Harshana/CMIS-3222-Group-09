<?php
// Manual debug endpoint: test DB + php session + basic connectivity.
// Usage: open in browser: /Aurahub/tmp_test_auth.php
header("Content-Type: text/plain; charset=UTF-8");

session_start();

echo "tmp_test_auth.php\n";

try {
    require_once __DIR__ . "/api/config/db.php";
    echo "DB: OK\n";
    $v = $pdo->query("SELECT VERSION() AS v")->fetch();
    $db = $pdo->query("SELECT DATABASE() AS db")->fetch();
    echo "MySQL: " . ($v["v"] ?? "") . "\n";
    echo "Database: " . ($db["db"] ?? "") . "\n";
} catch (Throwable $e) {
    echo "DB: FAIL\n";
    echo $e->getMessage() . "\n";
    exit;
}

echo "Session user set: " . (isset($_SESSION['user']) ? 'yes' : 'no') . "\n";

