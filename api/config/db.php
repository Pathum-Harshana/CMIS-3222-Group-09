<?php
// -----------------------------------------------------------------------------
// db.php
// Sets up the database connection for the AuraHub application using PDO.
// -----------------------------------------------------------------------------

$DB_HOST = "127.0.0.1"; // Database server address
$DB_NAME = "aurahub";   // Database name
$DB_USER = "root";      // Database username
$DB_PASS = "";          // Database password (empty for local dev)

try {
    // Create a PDO connection to the MySQL database
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,      // Throw exceptions on errors
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Fetch results as associative arrays
            PDO::ATTR_TIMEOUT => 3                            // 3 second connection timeout
        ]
    );

    // Ensure the 'role' column in users table supports 'lecturer' (for legacy DBs)
    try {
        $roleColumn = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
        if ($roleColumn && strpos($roleColumn["Type"] ?? "", "lecturer") === false) {
            $pdo->exec("ALTER TABLE users MODIFY role ENUM('student','lecturer','admin') NOT NULL DEFAULT 'student'");
        }
    } catch (Throwable $e) {
        // Ignore errors if already migrated or not needed
    }

    // Create mentor_availability table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS mentor_availability (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lecturer_id INT NOT NULL,
          available_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          note VARCHAR(255) NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_availability_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
} catch (PDOException $e) {
    // If connection fails, return a JSON error and exit
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed",
        "error" => $e->getMessage()
    ]);
    exit;
}
