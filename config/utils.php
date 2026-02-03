<?php
/**
 * Clase de utilidades para el sistema
 * Manejo de sesiones, validaciones y seguridad
 */

class Utils {
    
    /**
     * Iniciar sesión de forma segura
     */
    public static function startSecureSession() {
        if (session_status() === PHP_SESSION_NONE) {
            // Configuración segura de sesión
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            ini_set('session.cookie_secure', 0); // Cambiar a 1 en producción con HTTPS
            
            session_start();
            
            // Regenerar ID de sesión para prevenir session fixation
            if (!isset($_SESSION['initiated'])) {
                session_regenerate_id(true);
                $_SESSION['initiated'] = true;
            }
        }
    }

    /**
     * Verificar si el usuario está autenticado
     * @return bool
     */
    public static function isAuthenticated() {
        self::startSecureSession();
        return isset($_SESSION['user_id']) && isset($_SESSION['username']);
    }

    /**
     * Verificar si el usuario es administrador
     * @return bool
     */
    public static function isAdmin() {
        self::startSecureSession();
        return self::isAuthenticated() && $_SESSION['rol'] === 'administrador';
    }

    /**
     * Verificar si el usuario es vendedor
     * @return bool
     */
    public static function isVendedor() {
        self::startSecureSession();
        return self::isAuthenticated() && $_SESSION['rol'] === 'vendedor';
    }

    /**
     * Obtener datos del usuario actual
     * @return array|null
     */
    public static function getCurrentUser() {
        self::startSecureSession();
        if (!self::isAuthenticated()) {
            return null;
        }
        
        return [
            'id_usuario' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'nombre_completo' => $_SESSION['nombre_completo'],
            'rol' => $_SESSION['rol'],
            'id_vendedor' => $_SESSION['id_vendedor'] ?? null
        ];
    }

    /**
     * Hashear contraseña usando bcrypt
     * @param string $password
     * @return string
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    }

    /**
     * Verificar contraseña
     * @param string $password
     * @param string $hash
     * @return bool
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }

    /**
     * Sanitizar entrada de datos
     * @param string $data
     * @return string
     */
    public static function sanitizeInput($data) {
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
        return $data;
    }

    /**
     * Validar email
     * @param string $email
     * @return bool
     */
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Generar código único
     * @param string $prefix
     * @param int $length
     * @return string
     */
    public static function generateCode($prefix = '', $length = 6) {
        $number = str_pad(rand(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
        return $prefix . $number;
    }

    /**
     * Enviar respuesta JSON
     * @param bool $success
     * @param mixed $data
     * @param string $message
     * @param int $statusCode
     */
    public static function sendJsonResponse($success, $data = null, $message = '', $statusCode = 200) {
        // Limpiar buffer de salida para evitar que warnings contaminen el JSON
        if (ob_get_length()) ob_clean();
        
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        
        $response = [
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * Registrar en auditoría
     * @param PDO $conn
     * @param string $tabla
     * @param string $accion
     * @param int $id_registro
     * @param array $datos_anteriores
     * @param array $datos_nuevos
     */
    public static function registrarAuditoria($conn, $tabla, $accion, $id_registro = null, $datos_anteriores = null, $datos_nuevos = null) {
        try {
            $user = self::getCurrentUser();
            $id_usuario = $user ? $user['id_usuario'] : null;
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
            
            $sql = "INSERT INTO auditoria (tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos, id_usuario, ip_address) 
                    VALUES (:tabla, :accion, :id_registro, :datos_anteriores, :datos_nuevos, :id_usuario, :ip_address)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':tabla' => $tabla,
                ':accion' => $accion,
                ':id_registro' => $id_registro,
                ':datos_anteriores' => $datos_anteriores ? json_encode($datos_anteriores, JSON_UNESCAPED_UNICODE) : null,
                ':datos_nuevos' => $datos_nuevos ? json_encode($datos_nuevos, JSON_UNESCAPED_UNICODE) : null,
                ':id_usuario' => $id_usuario,
                ':ip_address' => $ip_address
            ]);
        } catch (Exception $e) {
            error_log("Error al registrar auditoría: " . $e->getMessage());
        }
    }

    /**
     * Validar fecha
     * @param string $date
     * @param string $format
     * @return bool
     */
    public static function validateDate($date, $format = 'Y-m-d') {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }

    /**
     * Formatear número a moneda
     * @param float $amount
     * @return string
     */
    public static function formatCurrency($amount) {
        return 'S/ ' . number_format($amount, 2, '.', ',');
    }

    /**
     * Cerrar sesión
     */
    public static function logout() {
        self::startSecureSession();
        
        // Destruir todas las variables de sesión
        $_SESSION = array();
        
        // Destruir la cookie de sesión
        if (isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time() - 3600, '/');
        }
        
        // Destruir la sesión
        session_destroy();
    }
}
