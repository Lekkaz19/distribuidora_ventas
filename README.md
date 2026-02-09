# Distribuidora Ventas

Aplicación web para la gestión de productos, vendedores y ventas, preparada para ejecución en un entorno local.

## Objetivo
Permitir revisar de forma rápida: creación/edición/eliminación de productos y vendedores, registro de ventas y generación de reportes básicos.

## Requisitos
- PHP 7.4+ (XAMPP o equivalente)
- MySQL / MariaDB
- Navegador moderno (Chrome, Edge, Firefox)

## Puesta en marcha (resumen)
- Coloca la carpeta del proyecto dentro del directorio público de tu servidor local (por ejemplo `htdocs` en XAMPP).
- Inicia Apache y MySQL desde el panel de control de tu stack local.
- Importa el volcado SQL incluido en el repositorio (archivo `distribuidora_ventas (1).sql`) usando phpMyAdmin o la herramienta de tu preferencia.
- Si necesitas, ajusta las credenciales en `config/database.php`.
- Abre la aplicación en el navegador: `http://localhost/distribuidora_ventas/index.html`.

## Credenciales de demostración (solo entorno local)
- Administrador: usuario `admin`, contraseña `admin123`.
- Vendedores de ejemplo: `fer123` / `123456` y `fer321` / `123456`.

## Interfaz y funcionalidades
La interfaz está organizada en áreas claras. A continuación se describe qué verás y qué puede hacer cada rol.

1. Pantalla de Inicio de Sesión
- Formulario central con campos Usuario y Contraseña.
- Al iniciar sesión se accede al área principal; cuando no hay sesión activa, solo aparece esta pantalla.

2. Barra lateral (sidebar)
- Navegación principal entre vistas: `Dashboard`, `Ventas`, `Reportes`.
- Vistas `Productos` y `Vendedores` están visibles solo para usuarios con rol administrador.
- En la parte inferior de la barra lateral hay un botón para cerrar sesión (visible únicamente cuando hay sesión iniciada).

3. Dashboard
- Muestra métricas rápidas: ventas del día, total del día, cantidad de productos y vendedores (según rol).
- Vista inicial tras iniciar sesión.

4. Productos (administrador)
- Tabla con listado de productos y columnas: código, nombre, categoría, precio, stock y acciones.
- Botón "Nuevo Producto" para crear un producto mediante un modal.
- Acciones por fila: editar y eliminar.

5. Vendedores (administrador)
- Tabla con listado de vendedores y columnas: código, nombre, usuario, email, comisión, estado y acciones.
- Botón "Nuevo Vendedor" para creación mediante modal.
- Acciones por fila: editar y desactivar.

6. Ventas
- Registro de ventas con selección de vendedor, cliente, productos y cantidades.
- Listado de ventas con detalles y acciones (ver/editar según permisos).

7. Reportes
- Panel para generar reportes por vendedor o por rango de fechas.
- Resultado en pantalla con totales y desglose.

8. Modales y notificaciones
- Las creaciones y ediciones usan modales que muestran formularios.
- Mensajes de éxito/error aparecen como toasts en la esquina (feedback inmediato).

## Roles y permisos (resumen)
- Administrador:
  - Acceso completo a `Productos`, `Vendedores`, `Ventas`, `Reportes` y `Dashboard`.
  - Puede crear, editar y eliminar registros críticos.
- Vendedor / Usuario normal:
  - Puede registrar ventas y ver reportes limitados.
  - No puede gestionar productos ni otros usuarios si no tiene rol administrador.

## Notas técnicas breves
- El frontend está en `index.html` y en los scripts de `js/` (ej.: `js/api.js`, `js/auth.js`, `js/ui.js`).
- Las rutas del backend están en `api/` (PHP) y devuelven JSON consumido por el cliente.
- Cambios en `config/database.php` permiten adaptar la conexión a la base de datos local.

## Criterios de aceptación sugeridos
- CRUD de productos y vendedores funcional.
- Registro y consulta de ventas funcionando con totales correctos.
- Autenticación básica funcionando (p. ej. acceso restringido a vistas según rol).
- Interfaz clara y mensajes de feedback en acciones clave.

## Desarrollo y depuración
- Para depurar frontend revisa la consola del navegador y los archivos en `js/`.
- Para depurar backend revisa los logs de Apache/PHP y `api/*.php`.

