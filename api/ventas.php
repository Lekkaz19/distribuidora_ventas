<?php
/**
 * API de Ventas
 * Gestión de ventas (RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17)
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
            listarVentas();
        }
        break;
        
    case 'get':
        if ($method === 'GET') {
            obtenerVenta();
        }
        break;
        
    case 'create':
        if ($method === 'POST') {
            crearVenta();
        }
        break;
        
    case 'reporte-vendedor':
        if ($method === 'GET') {
            reporteVentasPorVendedor();
        }
        break;
        
    case 'reporte-fecha':
        if ($method === 'GET') {
            reporteVentasPorFecha();
        }
        break;
        
    default:
        Utils::sendJsonResponse(false, null, 'Acción no válida', 400);
}

/**
 * RF-17: Listar ventas
 */
function listarVentas() {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        $user = Utils::getCurrentUser();
        $whereClauses = ["v.estado = 'completada'"];
        $params = [];
        
        // Si es vendedor, solo ver sus propias ventas
        if (Utils::isVendedor()) {
            $whereClauses[] = "v.id_vendedor = :id_vendedor";
            $params[':id_vendedor'] = $user['id_vendedor'];
        }
        
        // Filtros opcionales
        if (isset($_GET['fecha_inicio']) && isset($_GET['fecha_fin'])) {
            $whereClauses[] = "v.fecha_venta BETWEEN :fecha_inicio AND :fecha_fin";
            $params[':fecha_inicio'] = $_GET['fecha_inicio'];
            $params[':fecha_fin'] = $_GET['fecha_fin'];
        }
        
        if (isset($_GET['id_vendedor']) && Utils::isAdmin()) {
            $whereClauses[] = "v.id_vendedor = :id_vendedor_filtro";
            $params[':id_vendedor_filtro'] = $_GET['id_vendedor'];
        }
        
        $whereClause = implode(' AND ', $whereClauses);
        
        $sql = "SELECT v.*, 
                       u.nombre_completo as vendedor,
                       vd.codigo_vendedor,
                       IFNULL(c.nombre_cliente, 'Cliente General') as cliente
                FROM ventas v
                INNER JOIN vendedores vd ON v.id_vendedor = vd.id_vendedor
                INNER JOIN usuarios u ON vd.id_usuario = u.id_usuario
                LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
                WHERE $whereClause
                ORDER BY v.fecha_venta DESC, v.id_venta DESC
                LIMIT 100";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $ventas = $stmt->fetchAll();
        
        Utils::sendJsonResponse(true, $ventas, 'Ventas obtenidas exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en listarVentas: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener ventas', 500);
    }
}

/**
 * Obtener detalle de una venta
 */
function obtenerVenta() {
    try {
        $id = $_GET['id'] ?? 0;
        
        if (!$id) {
            Utils::sendJsonResponse(false, null, 'ID de venta requerido', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // Obtener venta
        $sql = "SELECT v.*, 
                       u.nombre_completo as vendedor,
                       vd.codigo_vendedor,
                       IFNULL(c.nombre_cliente, 'Cliente General') as cliente
                FROM ventas v
                INNER JOIN vendedores vd ON v.id_vendedor = vd.id_vendedor
                INNER JOIN usuarios u ON vd.id_usuario = u.id_usuario
                LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
                WHERE v.id_venta = :id";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([':id' => $id]);
        $venta = $stmt->fetch();
        
        if (!$venta) {
            Utils::sendJsonResponse(false, null, 'Venta no encontrada', 404);
        }
        
        // Obtener detalles
        $detalleSql = "SELECT dv.*, p.nombre_producto, p.codigo_producto, p.unidad_medida
                       FROM detalle_ventas dv
                       INNER JOIN productos p ON dv.id_producto = p.id_producto
                       WHERE dv.id_venta = :id";
        
        $detalleStmt = $conn->prepare($detalleSql);
        $detalleStmt->execute([':id' => $id]);
        $detalles = $detalleStmt->fetchAll();
        
        $venta['detalles'] = $detalles;
        
        Utils::sendJsonResponse(true, $venta, 'Venta obtenida exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en obtenerVenta: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al obtener venta', 500);
    }
}

/**
 * RF-11, RF-12, RF-13, RF-14: Crear venta
 */
function crearVenta() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id_vendedor = $input['id_vendedor'] ?? 0;
        $fecha_venta = $input['fecha_venta'] ?? date('Y-m-d');
        $productos = $input['productos'] ?? [];
        $observaciones = $input['observaciones'] ?? '';
        
        // Validaciones
        if (!$id_vendedor) {
            Utils::sendJsonResponse(false, null, 'Vendedor es requerido', 400);
        }
        
        if (empty($productos)) {
            Utils::sendJsonResponse(false, null, 'Debe agregar al menos un producto', 400);
        }
        
        if (!Utils::validateDate($fecha_venta)) {
            Utils::sendJsonResponse(false, null, 'Fecha no válida', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // Iniciar transacción
        $conn->beginTransaction();
        
        try {
            $user = Utils::getCurrentUser();
            
            // RF-14: Generar número único de venta
            $numero_venta = Utils::generateCode('V', 8);
            
            // Verificar que sea único
            $checkSql = "SELECT COUNT(*) as count FROM ventas WHERE numero_venta = :numero";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':numero' => $numero_venta]);
            $result = $checkStmt->fetch();
            
            if ($result['count'] > 0) {
                $numero_venta = Utils::generateCode('V', 10); // Generar uno más largo si hay colisión
            }
            
            // Crear venta
            $ventaSql = "INSERT INTO ventas (numero_venta, id_vendedor, fecha_venta, observaciones, id_usuario_registro) 
                         VALUES (:numero, :id_vendedor, :fecha, :obs, :id_usuario)";
            
            $ventaStmt = $conn->prepare($ventaSql);
            $ventaStmt->execute([
                ':numero' => $numero_venta,
                ':id_vendedor' => $id_vendedor,
                ':fecha' => $fecha_venta,
                ':obs' => $observaciones,
                ':id_usuario' => $user['id_usuario']
            ]);
            
            $id_venta = $conn->lastInsertId();
            
            $subtotal = 0;
            
            // Insertar detalles
            foreach ($productos as $producto) {
                $id_producto = $producto['id_producto'] ?? 0;
                $cantidad = $producto['cantidad'] ?? 0;
                
                if (!$id_producto || $cantidad <= 0) {
                    throw new Exception('Producto o cantidad no válidos');
                }
                
                // Obtener precio del producto y verificar stock
                $prodSql = "SELECT precio_unitario, stock_disponible, nombre_producto 
                            FROM productos WHERE id_producto = :id AND estado = 'activo'";
                $prodStmt = $conn->prepare($prodSql);
                $prodStmt->execute([':id' => $id_producto]);
                $prod = $prodStmt->fetch();
                
                if (!$prod) {
                    throw new Exception('Producto no encontrado o inactivo');
                }
                
                // Verificar stock disponible
                if ($prod['stock_disponible'] < $cantidad) {
                    throw new Exception("Stock insuficiente para {$prod['nombre_producto']}. Disponible: {$prod['stock_disponible']}");
                }
                
                $precio_unitario = $prod['precio_unitario'];
                
                // RF-12: Calcular monto automáticamente
                $subtotal_linea = $cantidad * $precio_unitario;
                $subtotal += $subtotal_linea;
                
                // Insertar detalle
                $detalleSql = "INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) 
                               VALUES (:id_venta, :id_producto, :cantidad, :precio)";
                
                $detalleStmt = $conn->prepare($detalleSql);
                $detalleStmt->execute([
                    ':id_venta' => $id_venta,
                    ':id_producto' => $id_producto,
                    ':cantidad' => $cantidad,
                    ':precio' => $precio_unitario
                ]);
                
                // RF-13: Descontar stock (el trigger lo hace automáticamente, pero lo hacemos explícito)
                // El trigger trg_detalle_ventas_insert ya lo hace, pero por seguridad:
                // Ya está manejado por el trigger
            }
            
            // Actualizar totales de la venta
            $updateSql = "UPDATE ventas SET subtotal = :subtotal, total = :total WHERE id_venta = :id";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->execute([
                ':subtotal' => $subtotal,
                ':total' => $subtotal,
                ':id' => $id_venta
            ]);
            
            // Registrar en auditoría
            Utils::registrarAuditoria($conn, 'ventas', 'INSERT', $id_venta, null, [
                'numero_venta' => $numero_venta,
                'total' => $subtotal,
                'productos_count' => count($productos)
            ]);
            
            $conn->commit();
            
            Utils::sendJsonResponse(true, [
                'id_venta' => $id_venta,
                'numero_venta' => $numero_venta,
                'total' => $subtotal
            ], 'Venta registrada exitosamente', 201);
            
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Error en crearVenta: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al crear venta: ' . $e->getMessage(), 500);
    }
}

/**
 * RF-15: Reporte de ventas por vendedor
 */
/**
 * RF-15: Reporte de ventas por vendedor
 */
function reporteVentasPorVendedor() {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        $params = [];
        $whereClause = "1=1";
        $vendedorFilter = "";
        
        // Si es vendedor, solo ver sus propias estadísticas
        if (Utils::isVendedor()) {
            $user = Utils::getCurrentUser();
            $vendedorFilter = "AND vd.id_vendedor = :current_vendedor";
            $params[':current_vendedor'] = $user['id_vendedor'];
        }

        // Filtro por fechas
        if (isset($_GET['fecha_inicio']) && isset($_GET['fecha_fin'])) {
            $whereClause .= " AND v.fecha_venta BETWEEN :fecha_inicio AND :fecha_fin";
            $params[':fecha_inicio'] = $_GET['fecha_inicio'];
            $params[':fecha_fin'] = $_GET['fecha_fin'];
        }
        
        $sql = "SELECT 
                    vd.id_vendedor,
                    u.nombre_completo as vendedor,
                    vd.codigo_vendedor,
                    COUNT(v.id_venta) as total_ventas,
                    IFNULL(SUM(v.total), 0) as monto_total_vendido,
                    IFNULL(AVG(v.total), 0) as promedio_venta,
                    IFNULL(SUM(v.total * vd.comision_porcentaje / 100), 0) as comision_total,
                    vd.comision_porcentaje
                FROM vendedores vd
                INNER JOIN usuarios u ON vd.id_usuario = u.id_usuario
                LEFT JOIN ventas v ON vd.id_vendedor = v.id_vendedor AND v.estado = 'completada' AND $whereClause
                WHERE vd.estado = 'activo' $vendedorFilter
                GROUP BY vd.id_vendedor, u.nombre_completo, vd.codigo_vendedor, vd.comision_porcentaje
                ORDER BY monto_total_vendido DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $reporte = $stmt->fetchAll();
        
        Utils::sendJsonResponse(true, $reporte, 'Reporte generado exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en reporteVentasPorVendedor: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al generar reporte', 500);
    }
}

/**
 * RF-16: Reporte de ventas por rango de fechas
 */
function reporteVentasPorFecha() {
    try {
        $fecha_inicio = $_GET['fecha_inicio'] ?? '';
        $fecha_fin = $_GET['fecha_fin'] ?? '';
        
        if (empty($fecha_inicio) || empty($fecha_fin)) {
            Utils::sendJsonResponse(false, null, 'Fechas de inicio y fin son requeridas', 400);
        }
        
        $database = new Database();
        $conn = $database->getConnection();
        
        // Filtro de vendedor
        $vendedorClause = "";
        $params = [
            ':fecha_inicio' => $fecha_inicio,
            ':fecha_fin' => $fecha_fin
        ];

        if (Utils::isVendedor()) {
            $user = Utils::getCurrentUser();
            $vendedorClause = "AND v.id_vendedor = :id_vendedor";
            $params[':id_vendedor'] = $user['id_vendedor'];
        }
        
        $sql = "SELECT 
                    v.fecha_venta,
                    COUNT(v.id_venta) as num_ventas,
                    SUM(v.total) as total_vendido,
                    AVG(v.total) as promedio_venta,
                    MIN(v.total) as venta_minima,
                    MAX(v.total) as venta_maxima
                FROM ventas v
                WHERE v.fecha_venta BETWEEN :fecha_inicio AND :fecha_fin
                AND v.estado = 'completada'
                $vendedorClause
                GROUP BY v.fecha_venta
                ORDER BY v.fecha_venta DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $reporte = $stmt->fetchAll();
        
        // Calcular totales generales
        $totalSql = "SELECT 
                        COUNT(v.id_venta) as total_ventas,
                        SUM(v.total) as total_general
                     FROM ventas v
                     WHERE v.fecha_venta BETWEEN :fecha_inicio AND :fecha_fin
                     AND v.estado = 'completada'
                     $vendedorClause"; // Reutilizamos el filtro
        
        // No necesitamos user params de nuevo si usamos bindValue o re-usamos array con cuidado
        // Como usamos execute($params), $params tiene id_vendedor si corresponde.
        // Pero OJO: $sql usaba 'v.', aqui la tabla es ventas directo, si uso alias v en updateSql...
        // Mejor quitamos 'v.' del alias en $vendedorClause si lo vamos a reusar o ajustamos la consulta.
        // La consulta de totales usa ventas SIN alias. Ajustemos el filtro.
        
        $vendedorClauseTotales = Utils::isVendedor() ? "AND id_vendedor = :id_vendedor" : "";
        
        $totalStmt = $conn->prepare($totalSql);
        $totalStmt->execute($params);
        $totales = $totalStmt->fetch();
        
        $resultado = [
            'reporte_diario' => $reporte,
            'totales' => $totales
        ];
        
        Utils::sendJsonResponse(true, $resultado, 'Reporte generado exitosamente', 200);
        
    } catch (Exception $e) {
        error_log("Error en reporteVentasPorFecha: " . $e->getMessage());
        Utils::sendJsonResponse(false, null, 'Error al generar reporte: ' . $e->getMessage(), 500);
    }
}
