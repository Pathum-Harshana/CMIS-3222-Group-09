<?php
if (session_status() === PHP_SESSION_NONE) session_start();

function requireLogin() {
    if (empty($_SESSION["user"])) {
        jsonResponse(false, "Unauthorized", null, 401);
    }
    return $_SESSION["user"];
}

function requireAdmin() {
    $u = requireLogin();
    if (($u["role"] ?? "") !== "admin") {
        jsonResponse(false, "Forbidden: admin only", null, 403);
    }
    return $u;
}