/**
 * Configuración de la aplicación
 */

const CONFIG = {
    // URL base de la API
    API_BASE_URL: window.location.origin + '/distribuidora_ventas/api',

    // Endpoints de la API
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth.php?action=login',
            LOGOUT: '/auth.php?action=logout',
            CHECK: '/auth.php?action=check'
        },
        PRODUCTOS: {
            LIST: '/productos.php?action=list',
            GET: '/productos.php?action=get',
            CREATE: '/productos.php?action=create',
            UPDATE: '/productos.php?action=update',
            DELETE: '/productos.php?action=delete',
            GRUPOS: '/productos.php?action=grupos'
        },
        VENDEDORES: {
            LIST: '/vendedores.php?action=list',
            GET: '/vendedores.php?action=get',
            CREATE: '/vendedores.php?action=create',
            UPDATE: '/vendedores.php?action=update',
            DELETE: '/vendedores.php?action=delete'
        },
        VENTAS: {
            LIST: '/ventas.php?action=list',
            GET: '/ventas.php?action=get',
            CREATE: '/ventas.php?action=create',
            REPORTE_VENDEDOR: '/ventas.php?action=reporte-vendedor',
            REPORTE_FECHA: '/ventas.php?action=reporte-fecha'
        }
    },

    // Configuración de la aplicación
    APP_NAME: 'Distribuidora de Ventas',
    APP_VERSION: '1.0.0',

    // Configuración de sesión
    SESSION_TIMEOUT: 3600000, // 1 hora en milisegundos

    // Configuración de notificaciones
    TOAST_DURATION: 5000, // 5 segundos

    // Formato de moneda
    CURRENCY: {
        SYMBOL: 'S/',
        DECIMALS: 2,
        THOUSANDS_SEPARATOR: ',',
        DECIMAL_SEPARATOR: '.'
    }
};

// Hacer CONFIG global
window.CONFIG = CONFIG;
