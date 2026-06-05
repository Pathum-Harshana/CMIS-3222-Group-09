<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";
requireAdmin();

try {
    $users = (int)$pdo->query("SELECT COUNT(*) c FROM users")->fetch()["c"];
    $lecturers = (int)$pdo->query("SELECT COUNT(*) c FROM users WHERE role='lecturer'")->fetch()["c"];
    $posts = (int)$pdo->query("SELECT COUNT(*) c FROM posts")->fetch()["c"];
    $comments = (int)$pdo->query("SELECT COUNT(*) c FROM comments")->fetch()["c"];
    $talentProfiles = (int)$pdo->query("SELECT COUNT(*) c FROM talent_profiles")->fetch()["c"];
    $resourceRequests = (int)$pdo->query("SELECT COUNT(*) c FROM resource_requests")->fetch()["c"];
    $availability = (int)$pdo->query("SELECT COUNT(*) c FROM mentor_availability WHERE is_active=1")->fetch()["c"];

    jsonResponse(true, "Admin stats", [
        "users"=>$users,
        "lecturers"=>$lecturers,
        "posts"=>$posts,
        "comments"=>$comments,
        "talent_profiles"=>$talentProfiles,
        "resource_requests"=>$resourceRequests,
        "availability"=>$availability
    ]);
} catch (Throwable $e) {
    jsonResponse(false, "Failed", ["error"=>$e->getMessage()], 500);
}
