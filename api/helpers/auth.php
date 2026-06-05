<?php
if (session_status() === PHP_SESSION_NONE) session_start();

// Function to ensure the user is logged in.
// If not logged in, it sends a JSON response indicating unauthorized access.
function requireLogin() {
    if (empty($_SESSION["user"])) {
        jsonResponse(false, "Unauthorized", null, 401);
    }
    return $_SESSION["user"];
}

// Function to ensure the logged-in user has admin privileges.
// If the user is not an admin, it sends a JSON response indicating forbidden access.
function requireAdmin() {
    $u = requireLogin();
    if (($u["role"] ?? "") !== "admin") {
        jsonResponse(false, "Forbidden: admin only", null, 403);
    }
    return $u;
}