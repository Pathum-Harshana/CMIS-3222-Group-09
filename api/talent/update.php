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
$id = intval($in["id"] ?? 0);
$skillName = trim($in["skill_name"] ?? "");
$description = trim($in["description"] ?? "");
$category = trim($in["skill_category"] ?? "");
$contactEmail = trim(strtolower($in["contact_email"] ?? ""));

if ($id <= 0) jsonResponse(false, "Valid profile id is required", null, 422);
if ($skillName === "" || $description === "" || $category === "" || $contactEmail === "") {
    jsonResponse(false, "All fields are required", null, 422);
}
if (!filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, "Valid contact email required", null, 422);
}

try {
    $q = $pdo->prepare("SELECT user_id FROM talent_profiles WHERE id=:id LIMIT 1");
    $q->execute([":id"=>$id]);
    $row = $q->fetch();
    if (!$row) jsonResponse(false, "Talent profile not found", null, 404);

    // Owner or admin only
    if (($user["role"] ?? "") !== "admin" && (int)$row["user_id"] !== (int)$user["id"]) {
        jsonResponse(false, "Forbidden", null, 403);
    }

    $up = $pdo->prepare(
        "UPDATE talent_profiles
         SET skill_name=:skill_name,
             description=:description,
             skill_category=:skill_category,
             contact_email=:contact_email
         WHERE id=:id LIMIT 1"
    );

    $up->execute([
        ":id" => $id,
        ":skill_name" => $skillName,
        ":description" => $description,
        ":skill_category" => $category,
        ":contact_email" => $contactEmail
    ]);

    $get = $pdo->prepare(
        "SELECT id, user_id, student_name, skill_name, description, skill_category, contact_email, created_at
         FROM talent_profiles
         WHERE id=:id LIMIT 1"
    );
    $get->execute([":id"=>$id]);
    $updated = $get->fetch();

    jsonResponse(true, "Talent profile updated", $updated, 200);
} catch (Throwable $e) {
    jsonResponse(false, "Failed to update talent profile", ["error"=>$e->getMessage()], 500);
}

