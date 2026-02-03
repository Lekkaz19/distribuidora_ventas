<?php
/**
 * API de Productos
 * Gestión de productos (RF-04, RF-05, RF-06, RF-07, RF-08)
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

// Verificar autenticación
if (!Utils::isAuthenticated()) {
    Utils::sendJsonResponse(false, null, 'No autenticado', 401);
}

switch ($action) {
    case 'list':
        if ($method === 'GET') {
            listarProductos();
        }
        break;
        
    case 'get':
        if ($method === 'GET') {
            obtenerProducto();
        }
        break;
        
    case 'create':
        if ($method === 'POST') {
            if (!Utils::isAdmin()) {
                Utils::sendJsonResponse(false, null, 'Acceso denegado. Solo administradores', 403);
            }
            crearProducto();
        }
        break;
        
    case 'update':
        if ($method === 'POST' || $method === 'PUT') {
            if (!Utils::isAdmin()) {
                Utils::sendJsonResponse(false, null, 'Acceso denegado. Solo administradores', 403);
            }
            actualizarProducto();
        }
        break;
        
    case 'delete':
        if ($method === 'POST' || $method === 'DELETE') {
            if (!Utils::isAdmin()) {
                Utils::sendJsonResponse(false, null, 'Acceso denegado. Solo administradores', 403);
            }
            eliminarProducto();
        }
        break;
        
    case 'grupos':
        if ($method === 'GET') {
            listarGrupos();
        }
        break;
        
    default:
        Utils::sendJsonResponse(false, null, 'Acción no válida', 400);
}

/**
 * RF-06: Listar productos
 */
function listarProductos() {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        $sql = "SELECT p.*, g.nombre_grupo 
                FROM productos p 
                INNER JOIN grupos_productos g ON p.id_grupo = g.id_grupo 
                WHERE p.estado = 'activo'
                ORDER BY p.nombre_producto ASC";
        
        $stmt = $conn->query($sql);
        $productos = $stmt->fetchAll();
        
        Utils::sendJsonResponse(true, $productos, 'Productos obtenidos exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en listarProductos: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener productos', 500);
    }
}

/**
 * Obtener un producto específico
 */
function obtenerProducto() {
    try {
        $id = $_GET['id'] ?? 0;
        
        if (!$id) {
            Utils::sendJsonResponse(false, null, 'ID de producto requerido', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        $sql = "SELECT p.*, g.nombre_grupo 
                FROM productos p 
                INNER JOIN grupos_productos g ON p.id_grupo = g.id_grupo 
                WHERE p.id_producto = :id";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([':id' => $id]);
        $producto = $stmt->fetch();
        
        if (!$producto) {
            Utils::sendJsonResponse(false, null, 'Producto no encontrado', 404);
        }
        
        Utils::sendJsonResponse(true, $producto, 'Producto obtenido exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en obtenerProducto: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener producto', 500);
    }
}

/**
 * RF-04: Crear producto
 * RF-07: Validar código único
 * RF-08: Validar precio > 0
 */
function crearProducto() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $codigo = $input['codigo_producto'] ?? '';
        $nombre = $input['nombre_producto'] ?? '';
        $id_grupo = $input['id_grupo'] ?? 0;
        $precio = $input['precio_unitario'] ?? 0;
        $stock = $input['stock_disponible'] ?? 0;
        $stock_minimo = $input['stock_minimo'] ?? 0;
        $unidad_medida = $input['unidad_medida'] ?? 'kg';
        
        // Validaciones
        if (empty($nombre)) {
            Utils::sendJsonResponse(false, null, 'El nombre del producto es requerido', 400);
        }
        
        if (!$id_grupo) {
            Utils::sendJsonResponse(false, null, 'El grupo del producto es requerido', 400);
        }
        
        // RF-08: Validar precio > 0
        if ($precio <= 0) {
            Utils::sendJsonResponse(false, null, 'El precio debe ser mayor a cero', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // RF-07: Validar código único
        if (!empty($codigo)) {
            $checkSql = "SELECT COUNT(*) as count FROM productos WHERE codigo_producto = :codigo";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':codigo' => $codigo]);
            $result = $checkStmt->fetch();
            
            if ($result['count'] > 0) {
                Utils::sendJsonResponse(false, null, 'El código del producto ya existe', 400);
            }
        } else {
            // Generar código automático si no se proporciona
            $codigo = Utils::generateCode('PROD', 6);
        }
        
        $user = Utils::getCurrentUser();
        
        $sql = "INSERT INTO productos (codigo_producto, nombre_producto, id_grupo, precio_unitario, 
                stock_disponible, stock_minimo, unidad_medida, fecha_alta, id_usuario_registro) 
                VALUES (:codigo, :nombre, :id_grupo, :precio, :stock, :stock_minimo, :unidad, CURDATE(), :id_usuario)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':codigo' => $codigo,
            ':nombre' => $nombre,
            ':id_grupo' => $id_grupo,
            ':precio' => $precio,
            ':stock' => $stock,
            ':stock_minimo' => $stock_minimo,
            ':unidad' => $unidad_medida,
            ':id_usuario' => $user['id_usuario']
        ]);
        
        $id_producto = $conn->lastInsertId();
        
        // Registrar en auditoría
        Utils::registrarAuditoria($conn, 'productos', 'INSERT', $id_producto, null, [
            'codigo' => $codigo,
            'nombre' => $nombre,
            'precio' => $precio
        ]);
        
        Utils::sendJsonResponse(true, ['id_producto' => $id_producto], 'Producto creado exitosamente', 201);
        
    } catch (Exception $e) {
        error_log("Error en crearProducto: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al crear producto', 500);
    }
}

/**
 * RF-05: Actualizar producto
 */
function actualizarProducto() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id_producto = $input['id_producto'] ?? 0;
        $codigo = $input['codigo_producto'] ?? '';
        $nombre = $input['nombre_producto'] ?? '';
        $id_grupo = $input['id_grupo'] ?? 0;
        $precio = $input['precio_unitario'] ?? 0;
        $stock = $input['stock_disponible'] ?? 0;
        $stock_minimo = $input['stock_minimo'] ?? 0;
        $unidad_medida = $input['unidad_medida'] ?? 'kg';
        
        if (!$id_producto) {
            Utils::sendJsonResponse(false, null, 'ID de producto requerido', 400);
        }
        
        if (empty($nombre)) {
            Utils::sendJsonResponse(false, null, 'El nombre del producto es requerido', 400);
        }
        
        // RF-08: Validar precio > 0
        if ($precio <= 0) {
            Utils::sendJsonResponse(false, null, 'El precio debe ser mayor a cero', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // Obtener datos anteriores para auditoría
        $oldSql = "SELECT * FROM productos WHERE id_producto = :id";
        $oldStmt = $conn->prepare($oldSql);
        $oldStmt->execute([':id' => $id_producto]);
        $oldData = $oldStmt->fetch();
        
        if (!$oldData) {
            Utils::sendJsonResponse(false, null, 'Producto no encontrado', 404);
        }
        
        // RF-07: Validar código único (si cambió)
        if (!empty($codigo) && $codigo !== $oldData['codigo_producto']) {
            $checkSql = "SELECT COUNT(*) as count FROM productos WHERE codigo_producto = :codigo AND id_producto != :id";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':codigo' => $codigo, ':id' => $id_producto]);
            $result = $checkStmt->fetch();
            
            if ($result['count'] > 0) {
                Utils::sendJsonResponse(false, null, 'El código del producto ya existe', 400);
            }
        }
        
        $sql = "UPDATE productos SET 
                codigo_producto = :codigo,
                nombre_producto = :nombre,
                id_grupo = :id_grupo,
                precio_unitario = :precio,
                stock_disponible = :stock,
                stock_minimo = :stock_minimo,
                unidad_medida = :unidad
                WHERE id_producto = :id";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':codigo' => $codigo,
            ':nombre' => $nombre,
            ':id_grupo' => $id_grupo,
            ':precio' => $precio,
            ':stock' => $stock,
            ':stock_minimo' => $stock_minimo,
            ':unidad' => $unidad_medida,
            ':id' => $id_producto
        ]);
        
        // Registrar en auditoría
        Utils::registrarAuditoria($conn, 'productos', 'UPDATE', $id_producto, $oldData, [
            'codigo' => $codigo,
            'nombre' => $nombre,
            'precio' => $precio
        ]);
        
        Utils::sendJsonResponse(true, null, 'Producto actualizado exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en actualizarProducto: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al actualizar producto', 500);
    }
}

/**
 * Eliminar producto (cambiar estado a inactivo)
 */
function eliminarProducto() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $id_producto = $input['id_producto'] ?? 0;
        
        if (!$id_producto) {
            Utils::sendJsonResponse(false, null, 'ID de producto requerido', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        $sql = "UPDATE productos SET estado = 'inactivo' WHERE id_producto = :id";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':id' => $id_producto]);
        
        Utils::registrarAuditoria($conn, 'productos', 'DELETE', $id_producto, null, ['estado' => 'inactivo']);
        
        Utils::sendJsonResponse(true, null, 'Producto eliminado exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en eliminarProducto: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al eliminar producto', 500);
    }
}

/**
 * Listar grupos de productos
 */
function listarGrupos() {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        $sql = "SELECT * FROM grupos_productos WHERE activo = 1 ORDER BY nombre_grupo ASC";
        $stmt = $conn->query($sql);
        $grupos = $stmt->fetchAll();
        
        Utils::sendJsonResponse(true, $grupos, 'Grupos obtenidos exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en listarGrupos: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener grupos', 500);
    }
}
