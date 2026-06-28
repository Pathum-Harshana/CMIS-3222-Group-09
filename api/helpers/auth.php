<?php
// -----------------------------------------------------------------------------
// auth.php
// Session and role guard helpers for protected API endpoints.
// Pages call these functions before reading or changing private data.
// -----------------------------------------------------------------------------

if (session_status() === PHP_SESSION_NONE) session_start();

// Ensures a user is logged in before continuing.
function requireLogin() {
    if (empty($_SESSION["user"])) {
        jsonResponse(false, "Unauthorized", null, 401);
    }
    return $_SESSION["user"];
}

// Ensures only admins or super admins can access an endpoint.
function requireAdmin() {
    $u = requireLogin();
    $role = $u["role"] ?? "";
    if ($role !== "admin" && $role !== "super_admin") {
        jsonResponse(false, "Forbidden: admin only", null, 403);
    }
    return $u;
}

// Checks whether the current user has the highest admin role.
function isSuperAdmin($user) {
    return ($user["role"] ?? "") === "super_admin";
}

// Used for destructive actions such as deleting users.
function requireSuperAdmin() {
    $u = requireLogin();
    if (!isSuperAdmin($u)) {
        jsonResponse(false, "Forbidden: super admin only", null, 403);
    }
    return $u;
}
