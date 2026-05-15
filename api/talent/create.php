<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
$user = requireLogin();

if ($_SERVER["REQUEST_METHOD"] !== "POST") jsonResponse(false, "Invalid request method", null, 405);

$in = json_decode(file_get_contents("php://input"), true);
$skillName = trim($in["skill_name"] ?? "");
$description = trim($in["description"] ?? "");
$category = trim($in["skill_category"] ?? "");
$contactEmail = trim(strtolower($in["contact_email"] ?? ""));

$studentName = $user["full_name"] ?? "";

if ($studentName === "" || $skillName === "" || $description === "" || $category === "" || $contactEmail === "") {
    jsonResponse(false, "All fields are required", null, 422);
}
if (!filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, "Valid contact email required", null, 422);
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO talent_profiles (user_id, student_name, skill_name, description, skill_category, contact_email)
        VALUES (:uid, :student_name, :skill_name, :description, :skill_category, :contact_email)
    ");
    $stmt->execute([
        ":uid" => $user["id"],
        ":student_name" => $studentName,
        ":skill_name" => $skillName,
        ":description" => $description,
        ":skill_category" => $category,
        ":contact_email" => $contactEmail
    ]);

    $id = (int)$pdo->lastInsertId();
    $get = $pdo->prepare("
        SELECT id, user_id, student_name, skill_name, description, skill_category, contact_email, created_at
        FROM talent_profiles
        WHERE id = :id LIMIT 1
    ");
    $get->execute([":id" => $id]);
    jsonResponse(true, "Talent profile created", $get->fetch(), 201);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to create talent profile", ["error"=>$e->getMessage()], 500);
}