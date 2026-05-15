<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
requireLogin();

$q = trim($_GET["q"] ?? "");
$category = trim($_GET["category"] ?? "");

try {
    $sql = "
      SELECT id, user_id, student_name, skill_name, description, skill_category, contact_email, created_at
      FROM talent_profiles
      WHERE 1=1
    ";
    $params = [];

    if ($q !== "") {
        $sql .= " AND (student_name LIKE :q OR skill_name LIKE :q OR description LIKE :q OR skill_category LIKE :q)";
        $params[":q"] = "%" . $q . "%";
    }
    if ($category !== "") {
        $sql .= " AND skill_category = :category";
        $params[":category"] = $category;
    }

    $sql .= " ORDER BY created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(true, "Talent profiles fetched", $stmt->fetchAll());
} catch (Throwable $e) {
    jsonResponse(false, "Failed to fetch talent profiles", ["error"=>$e->getMessage()], 500);
}