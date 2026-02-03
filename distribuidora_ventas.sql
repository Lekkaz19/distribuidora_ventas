-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 03-02-2026 a las 23:08:28
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
(1, 'FRU001', 'Naranjas', 1, 1.00, 1000.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(2, 'FRU002', 'Malocoton', 1, 2.00, 800.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(3, 'FRU003', 'Melones', 1, 2.00, 500.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(4, 'FRU004', 'Mandarinas', 1, 4.00, 600.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(5, 'FRU005', 'Uvas', 1, 4.00, 400.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(6, 'FRU006', 'Platanos', 1, 2.00, 900.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(7, 'FRU007', 'Manzana', 1, 4.00, 750.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(8, 'HOR001', 'Esparragos', 2, 1.00, 300.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(9, 'HOR002', 'Pimientos', 2, 0.50, 600.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(10, 'HOR003', 'Zanaorias', 2, 1.00, 800.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(11, 'HOR004', 'Berenjenas', 2, 3.00, 350.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(12, 'VER001', 'Tomates', 3, 1.00, 900.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(13, 'VER002', 'Lechugas', 3, 2.00, 400.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11'),
(14, 'VER003', 'Coles', 3, 1.00, 500.00, 0.00, 'kg', 'activo', '2004-03-15', 1, '2026-02-03 21:33:11');

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
(1, 'admin', '$2a$10$ejemplo_hash_password', 'Administrador Sistema', 'admin@distribuidora.com', NULL, 1, 'activo', NULL, '2026-02-03 21:33:11', '2026-02-03 21:33:11');

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
  MODIFY `id_auditoria` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `grupos_productos`
--
ALTER TABLE `grupos_productos`
  MODIFY `id_grupo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `historial_precios`
--
ALTER TABLE `historial_precios`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `vendedores`
--
ALTER TABLE `vendedores`
  MODIFY `id_vendedor` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id_venta` int(11) NOT NULL AUTO_INCREMENT;

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
