<?php
/**
 * API de Vendedores
 * Gestión de vendedores (RF-09, RF-10)
 */

require_once '../config/database.php';
require_once '../config/utils.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

Utils::startSecureSession();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if (!Utils::isAuthenticated()) {
    Utils::sendJsonResponse(false, null, 'No autenticado', 401);
}

switch ($action) {
    case 'list':
        if ($method === 'GET') {
            listarVendedores();
        }
        break;
        
    case 'get':
        if ($method === 'GET') {
            obtenerVendedor();
        }
        break;
        
    case 'create':
        if ($method === 'POST') {
            if (!Utils::isAdmin()) {
                Utils::sendJsonResponse(false, null, 'Acceso denegado. Solo administradores', 403);
            }
            crearVendedor();
        }
        break;
        
    case 'update':
        if ($method === 'POST' || $method === 'PUT') {
            if (!Utils::isAdmin()) {
                Utils::sendJsonResponse(false, null, 'Acceso denegado. Solo administradores', 403);
            }
            actualizarVendedor();
        }
        break;
        
    case 'delete':
        if ($method === 'DELETE') {
            if (!Utils::isAdmin()) {
                Utils::sendJsonResponse(false, null, 'Acceso denegado. Solo administradores', 403);
            }
            eliminarVendedor();
        }
        break;

    default:
        Utils::sendJsonResponse(false, null, 'Acción no válida', 400);
}

/**
 * RF-10: Listar vendedores
 */
function listarVendedores() {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        // Mostrar TODOS los vendedores (activos, inactivos, vacaciones)
        $sql = "SELECT v.*, u.nombre_completo, u.email, u.telefono, u.username, u.estado as estado_usuario
                FROM vendedores v
                INNER JOIN usuarios u ON v.id_usuario = u.id_usuario
                ORDER BY v.estado ASC, u.nombre_completo ASC";
        
        $stmt = $conn->query($sql);
        $vendedores = $stmt->fetchAll();
        
        Utils::sendJsonResponse(true, $vendedores, 'Vendedores obtenidos exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en listarVendedores: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener vendedores', 500);
    }
}

/**
 * Obtener un vendedor específico
 */
function obtenerVendedor() {
    try {
        $id = $_GET['id'] ?? 0;
        
        if (!$id) {
            Utils::sendJsonResponse(false, null, 'ID de vendedor requerido', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        $sql = "SELECT v.*, u.nombre_completo, u.email, u.telefono, u.username
                FROM vendedores v
                INNER JOIN usuarios u ON v.id_usuario = u.id_usuario
                WHERE v.id_vendedor = :id";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([':id' => $id]);
        $vendedor = $stmt->fetch();
        
        if (!$vendedor) {
            Utils::sendJsonResponse(false, null, 'Vendedor no encontrado', 404);
        }
        
        Utils::sendJsonResponse(true, $vendedor, 'Vendedor obtenido exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en obtenerVendedor: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener vendedor', 500);
    }
}

/**
 * RF-09: Crear vendedor
 */
function crearVendedor() {
    try {
        // Log de inicio
        error_log("=== INICIO crearVendedor ===");
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Log del input recibido
        error_log("Input recibido: " . json_encode($input));
        
        $nombre_completo = $input['nombre_completo'] ?? '';
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        $email = $input['email'] ?? '';
        $telefono = $input['telefono'] ?? '';
        $codigo_vendedor = $input['codigo_vendedor'] ?? '';
        $comision = $input['comision_porcentaje'] ?? 5.00;
        $meta_mensual = $input['meta_mensual'] ?? 0;
        $fecha_contratacion = $input['fecha_contratacion'] ?? date('Y-m-d');
        
        // Validaciones
        if (empty($nombre_completo) || empty($username) || empty($password)) {
            error_log("Error: Campos requeridos vacíos");
            Utils::sendJsonResponse(false, null, 'Nombre, usuario y contraseña son requeridos', 400);
        }
        
        if (!empty($email) && !Utils::validateEmail($email)) {
            error_log("Error: Email no válido: " . $email);
            Utils::sendJsonResponse(false, null, 'Email no válido', 400);
        }
        
        error_log("Validaciones pasadas. Conectando a BD...");
        
        $database = new Database();
        $conn = $database->getConnection();
        
        if (!$conn) {
            error_log("Error: No se pudo conectar a la base de datos");
            Utils::sendJsonResponse(false, null, 'Error de conexión a la base de datos', 500);
        }
        
        error_log("Conexión exitosa. Verificando username...");
        
        // Verificar si el username ya existe
        $checkSql = "SELECT COUNT(*) as count FROM usuarios WHERE username = :username";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([':username' => $username]);
        $result = $checkStmt->fetch();
        
        if ($result['count'] > 0) {
            error_log("Error: Username ya existe: " . $username);
            Utils::sendJsonResponse(false, null, 'El nombre de usuario ya existe', 400);
        }
        
        error_log("Username disponible. Generando código vendedor...");
        
        // Generar código de vendedor si no se proporciona
        if (empty($codigo_vendedor)) {
            $codigo_vendedor = Utils::generateCode('VEN', 4);
            error_log("Código generado: " . $codigo_vendedor);
        }
        
        // Verificar código único
        $checkCodeSql = "SELECT COUNT(*) as count FROM vendedores WHERE codigo_vendedor = :codigo";
        $checkCodeStmt = $conn->prepare($checkCodeSql);
        $checkCodeStmt->execute([':codigo' => $codigo_vendedor]);
        $codeResult = $checkCodeStmt->fetch();
        
        if ($codeResult['count'] > 0) {
            error_log("Error: Código vendedor ya existe: " . $codigo_vendedor);
            Utils::sendJsonResponse(false, null, 'El código de vendedor ya existe', 400);
        }
        
        error_log("Código disponible. Iniciando transacción...");
        
        // Iniciar transacción
        $conn->beginTransaction();
        
        try {
            // Crear usuario
            $passwordHash = Utils::hashPassword($password);
            error_log("Password hasheado. Insertando usuario...");
            
            $userSql = "INSERT INTO usuarios (username, password_hash, nombre_completo, email, telefono, id_rol, estado) 
                        VALUES (:username, :password, :nombre, :email, :telefono, 2, 'activo')"; // 2 = rol vendedor
            
            $userStmt = $conn->prepare($userSql);
            $userStmt->execute([
                ':username' => $username,
                ':password' => $passwordHash,
                ':nombre' => $nombre_completo,
                ':email' => $email,
                ':telefono' => $telefono
            ]);
            
            $id_usuario = $conn->lastInsertId();
            error_log("Usuario creado con ID: " . $id_usuario);
            
            // Crear vendedor
            error_log("Insertando vendedor en tabla...");
            
            // Usamos DEFAULT para el estado
            $vendedorSql = "INSERT INTO vendedores (id_usuario, codigo_vendedor, comision_porcentaje, meta_mensual, fecha_contratacion) 
                            VALUES (:id_usuario, :codigo, :comision, :meta, :fecha)";
            
            $vendedorStmt = $conn->prepare($vendedorSql);
            $vendedorStmt->execute([
                ':id_usuario' => $id_usuario,
                ':codigo' => $codigo_vendedor,
                ':comision' => $comision,
                ':meta' => $meta_mensual,
                ':fecha' => $fecha_contratacion
            ]);
            
            $id_vendedor = $conn->lastInsertId();
            error_log("Vendedor creado con ID: " . $id_vendedor);
            
            // Registrar en auditoría
            error_log("Registrando auditoría...");
            Utils::registrarAuditoria($conn, 'vendedores', 'INSERT', $id_vendedor, null, [
                'codigo' => $codigo_vendedor,
                'nombre' => $nombre_completo
            ]);
            
            $conn->commit();
            error_log("Transacción completada exitosamente");
            
            Utils::sendJsonResponse(true, ['id_vendedor' => $id_vendedor, 'id_usuario' => $id_usuario], 
                                   'Vendedor creado exitosamente', 201);
            
        } catch (Exception $e) {
            $conn->rollBack();
            error_log("Error en transacción: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error FATAL en crearVendedor: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        Utils::sendJsonResponse(false, null, 'Error al crear vendedor: ' . $e->getMessage(), 500);
    }
}

/**
 * Actualizar vendedor
 */
function actualizarVendedor() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id_vendedor = $input['id_vendedor'] ?? 0;
        $comision = $input['comision_porcentaje'] ?? 5.00;
        $meta_mensual = $input['meta_mensual'] ?? 0;
        $estado = $input['estado'] ?? 'activo';
        
        if (!$id_vendedor) {
            Utils::sendJsonResponse(false, null, 'ID de vendedor requerido', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        $sql = "UPDATE vendedores SET 
                comision_porcentaje = :comision,
                meta_mensual = :meta,
                estado = :estado
                WHERE id_vendedor = :id";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':comision' => $comision,
            ':meta' => $meta_mensual,
            ':estado' => $estado,
            ':id' => $id_vendedor
        ]);
        
        Utils::registrarAuditoria($conn, 'vendedores', 'UPDATE', $id_vendedor, null, [
            'comision' => $comision,
            'meta' => $meta_mensual,
            'estado' => $estado
        ]);
        
        Utils::sendJsonResponse(true, null, 'Vendedor actualizado exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en actualizarVendedor: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al actualizar vendedor', 500);
    }
}

/**
 * Eliminar vendedor (y usuario)
 */
function eliminarVendedor() {
    try {
        // Permitir ID por Query Param o Body
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? ($input['id'] ?? 0);
        
        if (!$id) {
            Utils::sendJsonResponse(false, null, 'ID de vendedor requerido', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // Obtener ID usuario para eliminar ambos
        $stmtGet = $conn->prepare("SELECT id_usuario FROM vendedores WHERE id_vendedor = :id");
        $stmtGet->execute([':id' => $id]);
        $vendedor = $stmtGet->fetch(PDO::FETCH_ASSOC);
        
        if (!$vendedor) {
            Utils::sendJsonResponse(false, null, 'Vendedor no encontrado', 404);
        }
        
        $conn->beginTransaction();
        
        try {
            // 1. Eliminar Vendedor
            $stmtDelV = $conn->prepare("DELETE FROM vendedores WHERE id_vendedor = :id");
            $stmtDelV->execute([':id' => $id]);
            
            // 2. Eliminar Usuario asociado
            $stmtDelU = $conn->prepare("DELETE FROM usuarios WHERE id_usuario = :uid");
            $stmtDelU->execute([':uid' => $vendedor['id_usuario']]);
            
            $conn->commit();
            Utils::sendJsonResponse(true, null, 'Vendedor eliminado exitosamente', 200);
            
        } catch (PDOException $e) {
            $conn->rollBack();
            // Error de integridad referencial (Ventas asociadas)
            if ($e->getCode() == '23000') {
                Utils::sendJsonResponse(false, null, 'No se puede eliminar: El vendedor tiene ventas registradas. Intente desactivarlo (Editar -> Estado: Inactivo).', 409);
            }
            throw $e;
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error en eliminarVendedor: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al eliminar vendedor: ' . $e->getMessage(), 500);
    }
}
