<?php
header("Access-Control-Allow-Origin: *");

header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/auth.php";

if (empty($_SESSION["user"])) jsonResponse(false, "Not logged in", null, 401);
jsonResponse(true, "OK", $_SESSION["user"]);