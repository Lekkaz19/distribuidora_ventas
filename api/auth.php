<?php
/**
 * API de Autenticación
 * Manejo de login y logout (RF-01, RF-02, RF-03)
 */

require_once '../config/database.php';
require_once '../config/utils.php';

// Configurar headers CORS y JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Iniciar sesión segura
Utils::startSecureSession();

switch ($action) {
    case 'login':
        if ($method === 'POST') {
            login();
        }
        break;
        
    case 'logout':
        if ($method === 'POST' || $method === 'GET') {
            logout();
        }
        break;
        
    case 'check':
        if ($method === 'GET') {
            checkSession();
        }
        break;
        
    default:
        Utils::sendJsonResponse(false, null, 'Acción no válida', 400);
}

/**
 * RF-01: Login de usuario
 */
function login() {
    try {
        // Obtener datos del POST
        $input = json_decode(file_get_contents('php://input'), true);
        
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        
        // Validar datos
        if (empty($username) || empty($password)) {
            Utils::sendJsonResponse(false, null, 'Usuario y contraseña son requeridos', 400);
        }
        
        // Conectar a la base de datos
        $database = new Database();
        $conn = $database->getConnection();
        
        if (!$conn) {
            Utils::sendJsonResponse(false, null, 'Error de conexión a la base de datos', 500);
        }
        
        // Buscar usuario por username (sin filtrar por estado aquí para poder informar si está inactivo)
        $sql = "SELECT u.*, r.nombre_rol, v.id_vendedor, v.codigo_vendedor 
                FROM usuarios u 
                INNER JOIN roles r ON u.id_rol = r.id_rol 
                LEFT JOIN vendedores v ON u.id_usuario = v.id_usuario 
                WHERE u.username = :username";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();
        
        if (!$user) {
            Utils::sendJsonResponse(false, null, 'Usuario o contraseña incorrectos', 401);
        }

        // Si el usuario existe pero está inactivo, denegar acceso con mensaje claro
        if (isset($user['estado']) && $user['estado'] !== 'activo') {
            Utils::sendJsonResponse(false, null, 'Usuario inactivo. Contacte al administrador.', 403);
        }

        // Verificación normal de contraseña con bcrypt
        $passwordValid = Utils::verifyPassword($password, $user['password_hash']);
        
        if (!$passwordValid) {
            Utils::sendJsonResponse(false, null, 'Usuario o contraseña incorrectos', 401);
        }
        
        // Crear sesión
        $_SESSION['user_id'] = $user['id_usuario'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['nombre_completo'] = $user['nombre_completo'];
        $_SESSION['rol'] = $user['nombre_rol'];
        $_SESSION['id_vendedor'] = $user['id_vendedor'];
        $_SESSION['codigo_vendedor'] = $user['codigo_vendedor'];
        
        // Actualizar último acceso
        $updateSql = "UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = :id";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->execute([':id' => $user['id_usuario']]);
        
        // Registrar en auditoría
        Utils::registrarAuditoria($conn, 'usuarios', 'LOGIN', $user['id_usuario'], null, ['username' => $username]);
        
        // Preparar respuesta
        $userData = [
            'id_usuario' => $user['id_usuario'],
            'username' => $user['username'],
            'nombre_completo' => $user['nombre_completo'],
            'email' => $user['email'],
            'rol' => $user['nombre_rol'],
            'id_vendedor' => $user['id_vendedor'],
            'codigo_vendedor' => $user['codigo_vendedor']
        ];
        
        Utils::sendJsonResponse(true, $userData, 'Inicio de sesión exitoso', 200);
        
    } catch (Exception $e) {
        error_log("Error en login: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al procesar la solicitud', 500);
    }
}

/**
 * RF-03: Logout de usuario
 */
function logout() {
    try {
        $user = Utils::getCurrentUser();
        
        if ($user) {
            // Registrar logout en auditoría
            $database = new Database();
            $conn = $database->getConnection();
            
            if ($conn) {
                Utils::registrarAuditoria($conn, 'usuarios', 'LOGOUT', $user['id_usuario'], null, ['username' => $user['username']]);
            }
        }
        
        // Cerrar sesión
        Utils::logout();
        
        Utils::sendJsonResponse(true, null, 'Sesión cerrada exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en logout: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al cerrar sesión', 500);
    }
}

/**
 * Verificar sesión activa
 */
function checkSession() {
    try {
        if (Utils::isAuthenticated()) {
            $user = Utils::getCurrentUser();
            Utils::sendJsonResponse(true, $user, 'Sesión activa', 200);
        } else {
            Utils::sendJsonResponse(false, null, 'No hay sesión activa', 401);
        }
    } catch (Exception $e) {
        error_log("Error en checkSession: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al verificar sesión', 500);
    }
}
