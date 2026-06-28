<?php
// Set session cookie path for subdirectory and start session before any output
if (session_status() === PHP_SESSION_NONE) {
	// Derive cookie path from the current request so it matches the deployed base URL.
	$reqPath = $_SERVER['REQUEST_URI'] ?? '/';
	$baseDir = '/';
	if (is_string($reqPath)) {
		if (preg_match('#^/[^/]+/#', $reqPath, $m)) {
			$baseDir = rtrim($m[0], '/') . '/';
		}
	}
	session_set_cookie_params([
		'path' => $baseDir,
		'httponly' => true,
		'samesite' => 'Lax'
	]);
	session_start();
}
// Allow credentials and set correct origin for CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
	header("Access-Control-Allow-Origin: $origin");
} else {
	header("Access-Control-Allow-Origin: http://localhost"); // fallback for dev
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

session_unset();
session_destroy();
jsonResponse(true, "Logged out");