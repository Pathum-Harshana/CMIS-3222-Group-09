<?php
// -----------------------------------------------------------------------------
// db.php
// Sets up the database connection for the AuraHub application using PDO.
// IMPORTANT:
// - This file should NOT run DDL (CREATE/ALTER) on every request.
// - Runtime schema changes can cause instability/crashes under load.
// -----------------------------------------------------------------------------

$DB_HOST = "127.0.0.1"; // Database server address
$DB_PORT = 3306;     // Database port (XAMPP)
$DB_NAME = "aurahub";   // Database name
$DB_USER = "root";      // Database username
$DB_PASS = "";          // Database password (empty for local dev)

// Set this to true temporarily (manual migration) if you want DDL to run.
// Do NOT keep enabled during normal usage.
$RUN_SCHEMA_MIGRATIONS = false;

try {
    // Create a PDO connection to the MySQL database
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 3
        ]
    );

    if ($RUN_SCHEMA_MIGRATIONS) {
        // ---- Schema migrations (manual only) ----

        // Helps diagnose intermittent connection resets/crashes.
        error_log("[db.php] RUN_SCHEMA_MIGRATIONS enabled; executing DDL");


        // Ensure the 'role' column in users table supports all current roles (for legacy DBs)
        try {
            $roleColumn = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
            $roleType = $roleColumn["Type"] ?? "";
            if ($roleColumn && (
                strpos($roleType, "lecturer") === false ||
                strpos($roleType, "doctor") === false ||
                strpos($roleType, "super_admin") === false
            )) {
                $pdo->exec("ALTER TABLE users MODIFY role ENUM('student','lecturer','doctor','admin','super_admin') NOT NULL DEFAULT 'student'");
            }
        } catch (Throwable $e) {
            error_log("[db.php] role column migration ignored: " . $e->getMessage());
        }

        // Create mentor_availability table if it doesn't exist
        try {
            $pdo->exec(
                "CREATE TABLE IF NOT EXISTS mentor_availability (".
                "  id INT AUTO_INCREMENT PRIMARY KEY,"
                ."  lecturer_id INT NOT NULL,"
                ."  available_date DATE NOT NULL,"
                ."  start_time TIME NOT NULL,"
                ."  end_time TIME NOT NULL,"
                ."  note VARCHAR(255) NULL,"
                ."  is_active TINYINT(1) NOT NULL DEFAULT 1,"
                ."  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
                ."  CONSTRAINT fk_availability_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE"
                .")"
            );
        } catch (Throwable $e) {
            error_log("[db.php] mentor_availability migration failed: " . $e->getMessage());
        }

        // Add anonymity support for wall posts on legacy databases.
        try {
            $postAnonColumn = $pdo->query("SHOW COLUMNS FROM posts LIKE 'is_anonymous'")->fetch();
            if (!$postAnonColumn) {
                $pdo->exec("ALTER TABLE posts ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 1 AFTER mood");
            }
        } catch (Throwable $e) {
            error_log("[db.php] posts.is_anonymous migration ignored: " . $e->getMessage());
        }
    }
} catch (PDOException $e) {
    // If connection fails, return a JSON error and exit
    error_log("[db.php] Database connection failed: " . $e->getMessage());
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed",
        "error" => $e->getMessage()
    ]);
    exit;
}
