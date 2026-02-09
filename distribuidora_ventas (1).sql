-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 09-02-2026 a las 23:19:10
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `distribuidora_ventas`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_anular_venta` (IN `p_id_venta` INT, IN `p_motivo` TEXT, IN `p_id_usuario` INT)   BEGIN
    UPDATE ventas 
    SET estado = 'anulada',
        fecha_anulacion = NOW(),
        motivo_anulacion = p_motivo
    WHERE id_venta = p_id_venta;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (tabla_afectada, accion, id_registro, id_usuario, datos_nuevos)
    VALUES ('ventas', 'UPDATE', p_id_venta, p_id_usuario, JSON_OBJECT('motivo', p_motivo));
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_venta` (IN `p_id_vendedor` INT, IN `p_id_cliente` INT, IN `p_fecha_venta` DATE, IN `p_productos` JSON, IN `p_id_usuario` INT, OUT `p_numero_venta` VARCHAR(20), OUT `p_total` DECIMAL(12,2))   BEGIN
    DECLARE v_numero_venta VARCHAR(20);
    DECLARE v_id_venta INT;
    DECLARE v_subtotal DECIMAL(12,2) DEFAULT 0;
    DECLARE v_descuento DECIMAL(12,2) DEFAULT 0;
    DECLARE v_total DECIMAL(12,2) DEFAULT 0;
    DECLARE v_contador INT DEFAULT 0;
    DECLARE v_id_producto INT;
    DECLARE v_cantidad DECIMAL(10,2);
    DECLARE v_precio DECIMAL(10,2);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error al registrar venta';
    END;
    
    START TRANSACTION;
    
    -- Generar número de venta
    SET v_numero_venta = CONCAT('V', LPAD(FLOOR(RAND() * 999999), 6, '0'));
    
    -- Insertar venta
    INSERT INTO ventas (numero_venta, id_vendedor, id_cliente, fecha_venta, id_usuario_registro)
    VALUES (v_numero_venta, p_id_vendedor, p_id_cliente, p_fecha_venta, p_id_usuario);
    
    SET v_id_venta = LAST_INSERT_ID();
    
    -- Insertar detalles (simulado - en la práctica iterar JSON)
    -- Aquí deberías iterar el JSON de productos
    
    -- Actualizar totales
    UPDATE ventas SET 
        subtotal = v_subtotal,
        descuento = v_descuento,
        total = v_subtotal - v_descuento
    WHERE id_venta = v_id_venta;
    
    SET p_numero_venta = v_numero_venta;
    SET p_total = v_subtotal - v_descuento;
    
    COMMIT;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_reporte_ventas_periodo` (IN `p_fecha_inicio` DATE, IN `p_fecha_fin` DATE, IN `p_id_vendedor` INT)   BEGIN
    SELECT 
        v.numero_venta,
        v.fecha_venta,
        u.nombre_completo AS vendedor,
        IFNULL(c.nombre_cliente, 'Cliente General') AS cliente,
        v.total,
        v.estado
    FROM ventas v
    INNER JOIN vendedores vd ON v.id_vendedor = vd.id_vendedor
    INNER JOIN usuarios u ON vd.id_usuario = u.id_usuario
    LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
    WHERE v.fecha_venta BETWEEN p_fecha_inicio AND p_fecha_fin
    AND (p_id_vendedor IS NULL OR v.id_vendedor = p_id_vendedor)
    ORDER BY v.fecha_venta DESC;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auditoria`
--

CREATE TABLE `auditoria` (
  `id_auditoria` int(11) NOT NULL,
  `tabla_afectada` varchar(50) NOT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `datos_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_anteriores`)),
  `datos_nuevos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_nuevos`)),
  `id_usuario` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `fecha_accion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `auditoria`
--

INSERT INTO `auditoria` (`id_auditoria`, `tabla_afectada`, `accion`, `id_registro`, `datos_anteriores`, `datos_nuevos`, `id_usuario`, `ip_address`, `fecha_accion`) VALUES
(1, 'usuarios', '', 1, NULL, '{\"username\":\"admin\"}', 1, '::1', '2026-02-03 22:55:43'),
(2, 'vendedores', 'UPDATE', 5, NULL, '{\"comision\":6,\"meta\":12000,\"estado\":\"vacaciones\"}', 1, '::1', '2026-02-03 22:56:04'),
(3, 'vendedores', 'UPDATE', 5, NULL, '{\"comision\":6,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-03 22:56:12'),
(4, 'productos', 'INSERT', 15, NULL, '{\"codigo\":\"PROD950241\",\"nombre\":\"Manzana\",\"precio\":1}', 1, '::1', '2026-02-03 22:58:17'),
(5, 'productos', 'INSERT', 16, NULL, '{\"codigo\":\"PROD413803\",\"nombre\":\"zzzzz\",\"precio\":12}', 1, '::1', '2026-02-03 22:59:04'),
(6, 'vendedores', 'UPDATE', 3, NULL, '{\"comision\":6,\"meta\":10000,\"estado\":\"activo\"}', 1, '::1', '2026-02-03 23:00:24'),
(7, 'vendedores', 'UPDATE', 5, NULL, '{\"comision\":6,\"meta\":12000,\"estado\":\"vacaciones\"}', 1, '::1', '2026-02-03 23:03:15'),
(8, 'vendedores', 'UPDATE', 5, NULL, '{\"comision\":6,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-03 23:13:14'),
(9, 'ventas', 'INSERT', 1, NULL, '{\"numero_venta\":\"V39973597\",\"total\":784,\"productos_count\":2}', 1, '::1', '2026-02-03 23:27:13'),
(10, 'vendedores', 'INSERT', 7, NULL, '{\"codigo\":\"VEN1128\",\"nombre\":\"Fernando Lecca\"}', 1, '::1', '2026-02-03 23:28:48'),
(11, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"vacaciones\"}', 1, '::1', '2026-02-03 23:28:53'),
(12, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-03 23:28:57'),
(13, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:29:59'),
(14, 'ventas', 'INSERT', 2, NULL, '{\"numero_venta\":\"V62964252\",\"total\":32,\"productos_count\":1}', 1, '::1', '2026-02-03 23:32:09'),
(15, 'ventas', 'INSERT', 3, NULL, '{\"numero_venta\":\"V62693330\",\"total\":3,\"productos_count\":1}', 1, '::1', '2026-02-03 23:32:33'),
(16, 'ventas', 'INSERT', 4, NULL, '{\"numero_venta\":\"V21262505\",\"total\":128,\"productos_count\":1}', 9, '::1', '2026-02-03 23:35:59'),
(17, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:36:07'),
(18, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:36:59'),
(19, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:37:38'),
(20, 'vendedores', 'INSERT', 8, NULL, '{\"codigo\":\"VEN1098\",\"nombre\":\"ferrr\"}', 1, '::1', '2026-02-03 23:38:02'),
(21, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"activo\"}', 1, '::1', '2026-02-03 23:38:14'),
(22, 'usuarios', '', 1, NULL, '{\"username\":\"admin\"}', 1, '::1', '2026-02-03 23:38:16'),
(23, 'usuarios', '', 10, NULL, '{\"username\":\"fer321\"}', NULL, '::1', '2026-02-03 23:38:23'),
(24, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:38:32'),
(25, 'usuarios', '', 10, NULL, '{\"username\":\"fer321\"}', NULL, '::1', '2026-02-03 23:38:39'),
(26, 'usuarios', '', 1, NULL, '{\"username\":\"admin\"}', 1, '::1', '2026-02-03 23:44:46'),
(27, 'productos', 'UPDATE', 11, '{\"id_producto\":11,\"codigo_producto\":\"HOR004\",\"nombre_producto\":\"Berenjenas\",\"id_grupo\":2,\"precio_unitario\":\"3.00\",\"stock_disponible\":\"350.00\",\"stock_minimo\":\"0.00\",\"unidad_medida\":\"kg\",\"estado\":\"activo\",\"fecha_alta\":\"2004-03-15\",\"id_usuario_registro\":1,\"fecha_actualizacion\":\"2026-02-03 16:33:11\"}', '{\"codigo\":\"HOR004\",\"nombre\":\"Berenjenas\",\"precio\":4}', 1, '::1', '2026-02-03 23:44:55'),
(28, 'productos', 'DELETE', 16, NULL, '{\"estado\":\"inactivo\"}', 1, '::1', '2026-02-03 23:45:02'),
(29, 'vendedores', 'UPDATE', 5, NULL, '{\"comision\":6,\"meta\":12000,\"estado\":\"activo\"}', 1, '::1', '2026-02-03 23:45:32'),
(30, 'ventas', 'INSERT', 5, NULL, '{\"numero_venta\":\"V65573893\",\"total\":4,\"productos_count\":1}', 9, '::1', '2026-02-03 23:46:37'),
(31, 'productos', 'UPDATE', 13, '{\"id_producto\":13,\"codigo_producto\":\"VER002\",\"nombre_producto\":\"Lechugas\",\"id_grupo\":3,\"precio_unitario\":\"2.00\",\"stock_disponible\":\"400.00\",\"stock_minimo\":\"0.00\",\"unidad_medida\":\"kg\",\"estado\":\"activo\",\"fecha_alta\":\"2004-03-15\",\"id_usuario_registro\":1,\"fecha_actualizacion\":\"2026-02-03 16:33:11\"}', '{\"codigo\":\"VER002\",\"nombre\":\"Lechugas\",\"precio\":3}', 1, '::1', '2026-02-03 23:47:38'),
(32, 'productos', 'INSERT', 17, NULL, '{\"codigo\":\"PROD536461\",\"nombre\":\"AAAAAAA\",\"precio\":3}', 1, '::1', '2026-02-03 23:47:57'),
(33, 'ventas', 'INSERT', 8, NULL, '{\"numero_venta\":\"V26681692\",\"total\":128,\"productos_count\":1}', 1, '::1', '2026-02-03 23:48:25'),
(34, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:48:43'),
(35, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-03 23:52:19'),
(36, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:52:36'),
(37, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:52:42'),
(38, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-03 23:55:16'),
(39, 'usuarios', '', 1, NULL, '{\"username\":\"admin\"}', 1, '::1', '2026-02-04 00:00:31'),
(40, 'usuarios', '', 1, NULL, '{\"username\":\"admin\"}', 1, '::1', '2026-02-09 21:07:09'),
(41, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-09 21:08:08'),
(42, 'productos', 'DELETE', 17, NULL, '{\"estado\":\"inactivo\"}', 1, '::1', '2026-02-09 21:11:50'),
(43, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-09 21:14:44'),
(44, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"activo\"}', 1, '::1', '2026-02-09 21:14:57'),
(45, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-09 21:15:00'),
(46, 'ventas', 'INSERT', 10, NULL, '{\"numero_venta\":\"V03354131\",\"total\":52,\"productos_count\":2}', 9, '::1', '2026-02-09 21:25:01'),
(47, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-09 21:50:00'),
(48, 'vendedores', 'UPDATE', 8, NULL, '{\"comision\":5,\"meta\":20000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-09 21:50:12'),
(49, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-09 21:50:18'),
(50, 'vendedores', 'UPDATE', 7, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"activo\"}', 1, '::1', '2026-02-09 21:50:39'),
(51, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-09 21:50:41'),
(52, 'vendedores', 'UPDATE', 6, NULL, '{\"comision\":5,\"meta\":1000,\"estado\":\"activo\"}', 1, '::1', '2026-02-09 21:55:01'),
(53, 'vendedores', 'INSERT', 9, NULL, '{\"codigo\":\"VEN4200\",\"nombre\":\"Fernando Leccasss\"}', 1, '::1', '2026-02-09 22:07:13'),
(54, 'vendedores', 'UPDATE', 9, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-09 22:07:19'),
(55, 'vendedores', 'UPDATE', 9, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"activo\"}', 1, '::1', '2026-02-09 22:07:28'),
(56, 'usuarios', '', 9, NULL, '{\"username\":\"fer123\"}', 9, '::1', '2026-02-09 22:07:34'),
(57, 'usuarios', '', 11, NULL, '{\"username\":\"fer321\"}', 11, '::1', '2026-02-09 22:07:52'),
(58, 'ventas', 'INSERT', 11, NULL, '{\"numero_venta\":\"V79607855\",\"total\":12,\"productos_count\":1}', 11, '::1', '2026-02-09 22:08:52'),
(59, 'ventas', 'INSERT', 12, NULL, '{\"numero_venta\":\"V59749149\",\"total\":48,\"productos_count\":1}', 11, '::1', '2026-02-09 22:09:11'),
(60, 'usuarios', '', 11, NULL, '{\"username\":\"fer321\"}', 11, '::1', '2026-02-09 22:09:31'),
(61, 'vendedores', 'UPDATE', 9, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"inactivo\"}', 1, '::1', '2026-02-09 22:09:38'),
(62, 'vendedores', 'UPDATE', 9, NULL, '{\"comision\":5,\"meta\":12000,\"estado\":\"activo\"}', 1, '::1', '2026-02-09 22:09:55'),
(63, 'productos', 'INSERT', 18, NULL, '{\"codigo\":\"asdads\",\"nombre\":\"zzzzz\",\"precio\":122}', 1, '::1', '2026-02-09 22:10:13'),
(64, 'productos', 'UPDATE', 18, '{\"id_producto\":18,\"codigo_producto\":\"asdads\",\"nombre_producto\":\"zzzzz\",\"id_grupo\":1,\"precio_unitario\":\"122.00\",\"stock_disponible\":\"1221.00\",\"stock_minimo\":\"12.00\",\"unidad_medida\":\"unidad\",\"estado\":\"activo\",\"fecha_alta\":\"2026-02-09\",\"id_usuario_registro\":1,\"fecha_actualizacion\":\"2026-02-09 17:10:13\"}', '{\"codigo\":\"asdads\",\"nombre\":\"zzzzz\",\"precio\":122}', 1, '::1', '2026-02-09 22:10:21'),
(65, 'productos', 'DELETE', 18, NULL, '{\"estado\":\"inactivo\"}', 1, '::1', '2026-02-09 22:10:25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` int(11) NOT NULL,
  `nombre_cliente` varchar(150) NOT NULL,
  `ruc_dni` varchar(20) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `tipo_cliente` enum('mayorista','minorista') DEFAULT 'minorista',
  `descuento_porcentaje` decimal(5,2) DEFAULT 0.00,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id_cliente`, `nombre_cliente`, `ruc_dni`, `direccion`, `telefono`, `email`, `tipo_cliente`, `descuento_porcentaje`, `estado`, `fecha_registro`) VALUES
(4, 'Restaurante El Buen Sabor', '20123456789', 'Av. Principal 123, Lima', '014567890', 'ventas@buensabor.com', 'mayorista', 5.00, 'activo', '2026-02-03 22:48:21'),
(5, 'Mercado San José', '20987654321', 'Jr. Comercio 456, Lima', '014567891', 'compras@mercadosj.com', 'mayorista', 3.00, 'activo', '2026-02-03 22:48:21'),
(6, 'Bodega La Esquina', '10456789123', 'Calle Los Olivos 789, Lima', '987123456', NULL, 'minorista', 0.00, 'activo', '2026-02-03 22:48:21'),
(7, 'Supermercado Los Andes', '20555666777', 'Av. Los Andes 321, Lima', '014567892', 'compras@losandes.com', 'mayorista', 4.00, 'activo', '2026-02-03 22:48:21'),
(8, 'Minimarket Express', '10888999000', 'Jr. Progreso 654, Lima', '987654324', NULL, 'minorista', 0.00, 'activo', '2026-02-03 22:48:21');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_ventas`
--

CREATE TABLE `detalle_ventas` (
  `id_detalle` int(11) NOT NULL,
  `id_venta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`cantidad` * `precio_unitario`) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `detalle_ventas`
--

INSERT INTO `detalle_ventas` (`id_detalle`, `id_venta`, `id_producto`, `cantidad`, `precio_unitario`) VALUES
(5, 4, 5, 32.00, 4.00),
(6, 5, 1, 4.00, 1.00),
(8, 10, 5, 11.00, 4.00),
(9, 10, 2, 4.00, 2.00),
(10, 11, 12, 12.00, 1.00),
(11, 12, 5, 12.00, 4.00);

--
-- Disparadores `detalle_ventas`
--
DELIMITER $$
CREATE TRIGGER `trg_detalle_ventas_insert` AFTER INSERT ON `detalle_ventas` FOR EACH ROW BEGIN
    UPDATE productos 
    SET stock_disponible = stock_disponible - NEW.cantidad
    WHERE id_producto = NEW.id_producto;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupos_productos`
--

CREATE TABLE `grupos_productos` (
  `id_grupo` int(11) NOT NULL,
  `nombre_grupo` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `grupos_productos`
--

INSERT INTO `grupos_productos` (`id_grupo`, `nombre_grupo`, `descripcion`, `activo`, `fecha_creacion`) VALUES
(1, 'Frutas', 'Productos frutales frescos', 1, '2026-02-03 21:33:11'),
(2, 'Hortalizas', 'Hortalizas y vegetales varios', 1, '2026-02-03 21:33:11'),
(3, 'Verduras', 'Verduras de hoja y crucíferas', 1, '2026-02-03 21:33:11');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_precios`
--

CREATE TABLE `historial_precios` (
  `id_historial` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `precio_anterior` decimal(10,2) DEFAULT NULL,
  `precio_nuevo` decimal(10,2) NOT NULL,
  `id_usuario_cambio` int(11) DEFAULT NULL,
  `fecha_cambio` timestamp NOT NULL DEFAULT current_timestamp(),
  `motivo` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `historial_precios`
--

INSERT INTO `historial_precios` (`id_historial`, `id_producto`, `precio_anterior`, `precio_nuevo`, `id_usuario_cambio`, `fecha_cambio`, `motivo`) VALUES
(1, 11, 3.00, 4.00, NULL, '2026-02-03 23:44:55', NULL),
(2, 13, 2.00, 3.00, NULL, '2026-02-03 23:47:38', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `codigo_producto` varchar(50) DEFAULT NULL,
  `nombre_producto` varchar(100) NOT NULL,
  `id_grupo` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `stock_disponible` decimal(10,2) DEFAULT 0.00,
  `stock_minimo` decimal(10,2) DEFAULT 0.00,
  `unidad_medida` enum('kg','unidad','caja') DEFAULT 'kg',
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `fecha_alta` date NOT NULL,
  `id_usuario_registro` int(11) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo_producto`, `nombre_producto`, `id_grupo`, `precio_unitario`, `stock_disponible`, `stock_minimo`, `unidad_medida`, `estado`, `fecha_alta`, `id_usuario_registro`, `fecha_actualizacion`) VALUES
(1, 'FRU001', 'Naranjas', 1, 1.00, 964.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 23:46:37'),
(2, 'FRU002', 'Malocoton', 1, 2.00, 796.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-09 21:25:00'),
(3, 'FRU003', 'Melones', 1, 2.00, 500.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(4, 'FRU004', 'Mandarinas', 1, 4.00, 600.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(5, 'FRU005', 'Uvas', 1, 4.00, 313.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-09 22:09:11'),
(6, 'FRU006', 'Platanos', 1, 2.00, 900.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(7, 'FRU007', 'Manzana', 1, 4.00, 750.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(8, 'HOR001', 'Esparragos', 2, 1.00, 300.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(9, 'HOR002', 'Pimientos', 2, 0.50, 600.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(10, 'HOR003', 'Zanaorias', 2, 1.00, 397.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 23:32:33'),
(11, 'HOR004', 'Berenjenas', 2, 4.00, 350.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 23:44:55'),
(12, 'VER001', 'Tomates', 3, 1.00, 888.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-09 22:08:52'),
(13, 'VER002', 'Lechugas', 3, 3.00, 400.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 23:47:38'),
(14, 'VER003', 'Coles', 3, 1.00, 500.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(15, 'PROD950241', 'Manzana', 1, 1.00, 50.00, 10.00, 'kg', 'activo', '2026-02-03', 1, '2026-02-03 22:58:17'),
(16, 'PROD413803', 'zzzzz', 3, 12.00, 300.00, 0.10, 'unidad', 'inactivo', '2026-02-03', 1, '2026-02-03 23:45:02'),
(17, 'PROD536461', 'AAAAAAA', 2, 3.00, 2000.00, 1000.00, 'unidad', 'inactivo', '2026-02-03', 1, '2026-02-09 21:11:50'),
(18, 'asdads', 'zzzzz', 1, 122.00, 1221.00, 12.00, 'kg', 'inactivo', '2026-02-09', 1, '2026-02-09 22:10:25');

--
-- Disparadores `productos`
--
DELIMITER $$
CREATE TRIGGER `trg_productos_update` AFTER UPDATE ON `productos` FOR EACH ROW BEGIN
    IF OLD.precio_unitario != NEW.precio_unitario THEN
        INSERT INTO historial_precios (id_producto, precio_anterior, precio_nuevo)
        VALUES (NEW.id_producto, OLD.precio_unitario, NEW.precio_unitario);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`, `fecha_creacion`) VALUES
(1, 'administrador', 'Acceso total al sistema', '2026-02-03 21:33:10'),
(2, 'vendedor', 'Puede registrar ventas', '2026-02-03 21:33:10'),
(3, 'supervisor', 'Puede ver reportes y gestionar vendedores', '2026-02-03 21:33:10');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre_completo` varchar(150) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `id_rol` int(11) NOT NULL,
  `estado` enum('activo','inactivo','bloqueado') DEFAULT 'activo',
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombre_completo`, `email`, `telefono`, `id_rol`, `estado`, `ultimo_acceso`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'admin', '$2y$10$DDEeOMlonrYEPnBtbEuveeHmzHzI3Y1P4TFXjpOnM4IAgUV8q65qK', 'Administrador Sistema', 'admin@distribuidora.com', NULL, 1, 'activo', '2026-02-09 21:07:09', '2026-02-03 21:33:11', '2026-02-09 21:07:09'),
(9, 'fer123', '$2y$10$qlhiQIgzrMs7kLiIzm0x4eexhDN6wQ9BpD/adSR2k2HEvVrDOfnu.', 'Fernando Lecca', 'fer@example.com', '322332', 2, 'activo', '2026-02-09 21:50:41', '2026-02-03 23:28:48', '2026-02-09 21:50:41'),
(11, 'fer321', '$2y$10$vCZlH7eXfGhI491VzAmeDO3.WVqePg9tCh1KtN0FO5Z6ic/RdYVbW', 'Fernando Leccasss', 'fer@exams.com', '12345432', 2, 'activo', '2026-02-09 22:07:52', '2026-02-09 22:07:13', '2026-02-09 22:07:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vendedores`
--

CREATE TABLE `vendedores` (
  `id_vendedor` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `codigo_vendedor` varchar(20) DEFAULT NULL,
  `comision_porcentaje` decimal(5,2) DEFAULT 5.00,
  `meta_mensual` decimal(12,2) DEFAULT 0.00,
  `estado` enum('activo','inactivo','vacaciones') DEFAULT 'activo',
  `fecha_contratacion` date NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `vendedores`
--

INSERT INTO `vendedores` (`id_vendedor`, `id_usuario`, `codigo_vendedor`, `comision_porcentaje`, `meta_mensual`, `estado`, `fecha_contratacion`, `fecha_creacion`) VALUES
(7, 9, 'VEN1128', 5.00, 12000.00, 'activo', '2026-02-03', '2026-02-03 23:28:48'),
(9, 11, 'VEN4200', 5.00, 12000.00, 'activo', '2026-02-09', '2026-02-09 22:07:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` int(11) NOT NULL,
  `numero_venta` varchar(20) NOT NULL,
  `id_vendedor` int(11) NOT NULL,
  `id_cliente` int(11) DEFAULT NULL,
  `fecha_venta` date NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `descuento` decimal(12,2) DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `estado` enum('completada','anulada','pendiente') DEFAULT 'completada',
  `observaciones` text DEFAULT NULL,
  `id_usuario_registro` int(11) DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_anulacion` timestamp NULL DEFAULT NULL,
  `motivo_anulacion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id_venta`, `numero_venta`, `id_vendedor`, `id_cliente`, `fecha_venta`, `subtotal`, `descuento`, `total`, `estado`, `observaciones`, `id_usuario_registro`, `fecha_registro`, `fecha_anulacion`, `motivo_anulacion`) VALUES
(4, 'V21262505', 7, NULL, '2026-02-03', 128.00, 0.00, 128.00, 'completada', 'asad', 9, '2026-02-03 23:35:59', NULL, NULL),
(5, 'V65573893', 7, NULL, '2026-02-03', 4.00, 0.00, 4.00, 'completada', 'sd', 9, '2026-02-03 23:46:37', NULL, NULL),
(10, 'V03354131', 7, NULL, '2026-02-09', 52.00, 0.00, 52.00, 'completada', 'dsdsfsdf', 9, '2026-02-09 21:25:00', NULL, NULL),
(11, 'V79607855', 9, NULL, '2026-02-09', 12.00, 0.00, 12.00, 'completada', 'sdfsdsdfsdf', 11, '2026-02-09 22:08:52', NULL, NULL),
(12, 'V59749149', 9, NULL, '2026-02-09', 48.00, 0.00, 48.00, 'completada', 'sadads', 11, '2026-02-09 22:09:11', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_productos_mas_vendidos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_productos_mas_vendidos` (
`id_producto` int(11)
,`nombre_producto` varchar(100)
,`nombre_grupo` varchar(50)
,`total_cantidad_vendida` decimal(32,2)
,`total_ingresos` decimal(34,2)
,`numero_ventas` bigint(21)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_resumen_diario`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_resumen_diario` (
`fecha_venta` date
,`num_ventas` bigint(21)
,`total_vendido` decimal(34,2)
,`promedio_venta` decimal(16,6)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_stock_bajo`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_stock_bajo` (
`id_producto` int(11)
,`codigo_producto` varchar(50)
,`nombre_producto` varchar(100)
,`nombre_grupo` varchar(50)
,`stock_disponible` decimal(10,2)
,`stock_minimo` decimal(10,2)
,`cantidad_necesaria` decimal(11,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_ventas_por_vendedor`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_ventas_por_vendedor` (
`id_vendedor` int(11)
,`vendedor` varchar(150)
,`codigo_vendedor` varchar(20)
,`total_ventas` bigint(21)
,`monto_total_vendido` decimal(34,2)
,`promedio_venta` decimal(16,6)
,`comision_total` decimal(43,8)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_productos_mas_vendidos`
--
DROP TABLE IF EXISTS `v_productos_mas_vendidos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_productos_mas_vendidos`  AS SELECT `p`.`id_producto` AS `id_producto`, `p`.`nombre_producto` AS `nombre_producto`, `g`.`nombre_grupo` AS `nombre_grupo`, sum(`dv`.`cantidad`) AS `total_cantidad_vendida`, sum(`dv`.`subtotal`) AS `total_ingresos`, count(distinct `dv`.`id_venta`) AS `numero_ventas` FROM (((`productos` `p` join `grupos_productos` `g` on(`p`.`id_grupo` = `g`.`id_grupo`)) left join `detalle_ventas` `dv` on(`p`.`id_producto` = `dv`.`id_producto`)) left join `ventas` `v` on(`dv`.`id_venta` = `v`.`id_venta` and `v`.`estado` = 'completada')) GROUP BY `p`.`id_producto`, `p`.`nombre_producto`, `g`.`nombre_grupo` ORDER BY sum(`dv`.`cantidad`) DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_resumen_diario`
--
DROP TABLE IF EXISTS `v_resumen_diario`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_resumen_diario`  AS SELECT `ventas`.`fecha_venta` AS `fecha_venta`, count(`ventas`.`id_venta`) AS `num_ventas`, sum(`ventas`.`total`) AS `total_vendido`, avg(`ventas`.`total`) AS `promedio_venta` FROM `ventas` WHERE `ventas`.`estado` = 'completada' GROUP BY `ventas`.`fecha_venta` ORDER BY `ventas`.`fecha_venta` DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_stock_bajo`
--
DROP TABLE IF EXISTS `v_stock_bajo`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_stock_bajo`  AS SELECT `p`.`id_producto` AS `id_producto`, `p`.`codigo_producto` AS `codigo_producto`, `p`.`nombre_producto` AS `nombre_producto`, `g`.`nombre_grupo` AS `nombre_grupo`, `p`.`stock_disponible` AS `stock_disponible`, `p`.`stock_minimo` AS `stock_minimo`, `p`.`stock_minimo`- `p`.`stock_disponible` AS `cantidad_necesaria` FROM (`productos` `p` join `grupos_productos` `g` on(`p`.`id_grupo` = `g`.`id_grupo`)) WHERE `p`.`stock_disponible` <= `p`.`stock_minimo` AND `p`.`estado` = 'activo' ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_ventas_por_vendedor`
--
DROP TABLE IF EXISTS `v_ventas_por_vendedor`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_ventas_por_vendedor`  AS SELECT `vd`.`id_vendedor` AS `id_vendedor`, `u`.`nombre_completo` AS `vendedor`, `vd`.`codigo_vendedor` AS `codigo_vendedor`, count(`v`.`id_venta`) AS `total_ventas`, sum(`v`.`total`) AS `monto_total_vendido`, avg(`v`.`total`) AS `promedio_venta`, sum(`v`.`total` * `vd`.`comision_porcentaje` / 100) AS `comision_total` FROM ((`vendedores` `vd` join `usuarios` `u` on(`vd`.`id_usuario` = `u`.`id_usuario`)) left join `ventas` `v` on(`vd`.`id_vendedor` = `v`.`id_vendedor` and `v`.`estado` = 'completada')) GROUP BY `vd`.`id_vendedor`, `u`.`nombre_completo`, `vd`.`codigo_vendedor` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD PRIMARY KEY (`id_auditoria`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_tabla` (`tabla_afectada`),
  ADD KEY `idx_fecha` (`fecha_accion`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`),
  ADD UNIQUE KEY `ruc_dni` (`ruc_dni`),
  ADD KEY `idx_ruc` (`ruc_dni`),
  ADD KEY `idx_nombre` (`nombre_cliente`);

--
-- Indices de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `idx_venta` (`id_venta`),
  ADD KEY `idx_producto` (`id_producto`);

--
-- Indices de la tabla `grupos_productos`
--
ALTER TABLE `grupos_productos`
  ADD PRIMARY KEY (`id_grupo`),
  ADD UNIQUE KEY `nombre_grupo` (`nombre_grupo`);

--
-- Indices de la tabla `historial_precios`
--
ALTER TABLE `historial_precios`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `id_usuario_cambio` (`id_usuario_cambio`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `codigo_producto` (`codigo_producto`),
  ADD KEY `id_usuario_registro` (`id_usuario_registro`),
  ADD KEY `idx_nombre` (`nombre_producto`),
  ADD KEY `idx_codigo` (`codigo_producto`),
  ADD KEY `idx_grupo` (`id_grupo`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `id_rol` (`id_rol`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- Indices de la tabla `vendedores`
--
ALTER TABLE `vendedores`
  ADD PRIMARY KEY (`id_vendedor`),
  ADD UNIQUE KEY `uk_usuario` (`id_usuario`),
  ADD UNIQUE KEY `codigo_vendedor` (`codigo_vendedor`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD UNIQUE KEY `numero_venta` (`numero_venta`),
  ADD KEY `id_cliente` (`id_cliente`),
  ADD KEY `id_usuario_registro` (`id_usuario_registro`),
  ADD KEY `idx_fecha` (`fecha_venta`),
  ADD KEY `idx_vendedor` (`id_vendedor`),
  ADD KEY `idx_numero` (`numero_venta`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  MODIFY `id_auditoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `grupos_productos`
--
ALTER TABLE `grupos_productos`
  MODIFY `id_grupo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `historial_precios`
--
ALTER TABLE `historial_precios`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `vendedores`
--
ALTER TABLE `vendedores`
  MODIFY `id_vendedor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id_venta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD CONSTRAINT `auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD CONSTRAINT `detalle_ventas_ibfk_1` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalle_ventas_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `historial_precios`
--
ALTER TABLE `historial_precios`
  ADD CONSTRAINT `historial_precios_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `historial_precios_ibfk_2` FOREIGN KEY (`id_usuario_cambio`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_grupo`) REFERENCES `grupos_productos` (`id_grupo`),
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`id_usuario_registro`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`);

--
-- Filtros para la tabla `vendedores`
--
ALTER TABLE `vendedores`
  ADD CONSTRAINT `vendedores_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`id_vendedor`) REFERENCES `vendedores` (`id_vendedor`),
  ADD CONSTRAINT `ventas_ibfk_2` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  ADD CONSTRAINT `ventas_ibfk_3` FOREIGN KEY (`id_usuario_registro`) REFERENCES `usuarios` (`id_usuario`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
