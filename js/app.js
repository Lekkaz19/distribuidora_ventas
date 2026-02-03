/**
 * Aplicación Principal
 * Coordina todos los módulos y gestiona el flujo de la aplicación
 */

const App = {
    currentUser: null,
    currentView: 'dashboard',

    /**
     * Inicializar aplicación
     */
    async init() {
        console.log('Iniciando aplicación...');

        // Verificar sesión existente
        await this.checkSession();

        // Configurar event listeners globales
        this.setupGlobalListeners();

        // Actualizar fecha actual
        UI.updateCurrentDate();
        setInterval(() => UI.updateCurrentDate(), 60000); // Actualizar cada minuto
    },

    /**
     * Verificar sesión activa
     */
    async checkSession() {
        try {
            const response = await API.checkSession();

            if (response.success) {
                // Sesión activa
                this.currentUser = response.data;
                this.showMainScreen();
            } else {
                // No hay sesión
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            this.showLoginScreen();
        }
    },

    /**
     * Configurar event listeners globales
     */
    setupGlobalListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.navigateTo(view);
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => UI.toggleSidebar());
        }

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }
    },

    /**
     * RF-01: Manejar login
     */
    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            UI.showToast('Ingrese usuario y contraseña', 'warning');
            return;
        }

        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';

        try {
            const response = await API.login(username, password);

            if (response.success) {
                this.currentUser = response.data;
                UI.showToast('Inicio de sesión exitoso', 'success');

                // Pequeño delay para mostrar el mensaje
                await Utils.sleep(500);

                this.showMainScreen();
            } else {
                UI.showToast(response.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error en login:', error);
            UI.showToast('Error al iniciar sesión', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },

    /**
     * RF-03: Manejar logout
     */
    async handleLogout() {
        const confirmed = await UI.confirm(
            '¿Está seguro de cerrar sesión?',
            'Cerrar Sesión'
        );

        if (!confirmed) return;

        try {
            await API.logout();
            this.currentUser = null;
            UI.showToast('Sesión cerrada exitosamente', 'success');

            await Utils.sleep(500);

            this.showLoginScreen();
        } catch (error) {
            console.error('Error en logout:', error);
            UI.showToast('Error al cerrar sesión', 'error');
        }
    },

    /**
     * Mostrar pantalla de login
     */
    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-screen').classList.remove('active');

        // Limpiar formulario
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
    },

    /**
     * Mostrar pantalla principal
     */
    async showMainScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');

        // Actualizar información de usuario
        UI.updateUserInfo(this.currentUser);

        // Inicializar módulos
        await this.initModules();

        // Navegar a dashboard
        this.navigateTo('dashboard');
    },

    /**
     * Inicializar módulos de la aplicación
     */
    async initModules() {
        try {
            // Inicializar módulos según el rol
            if (this.currentUser.rol === 'administrador') {
                await Promise.all([
                    Productos.init(),
                    Vendedores.init(),
                    Ventas.init(),
                    Reportes.init()
                ]);
            } else {
                // Vendedor solo tiene acceso a ventas y reportes
                await Promise.all([
                    Ventas.init(),
                    Reportes.init()
                ]);
            }

            console.log('Módulos inicializados correctamente');
        } catch (error) {
            console.error('Error al inicializar módulos:', error);
            UI.showToast('Error al cargar módulos', 'error');
        }
    },

    /**
     * Navegar a una vista
     */
    navigateTo(viewName) {
        this.currentView = viewName;
        UI.switchView(viewName);

        // Cargar datos de la vista si es necesario
        this.loadViewData(viewName);
    },

    /**
     * Cargar datos de la vista actual
     */
    async loadViewData(viewName) {
        try {
            switch (viewName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'productos':
                    if (this.currentUser.rol === 'administrador') {
                        await Productos.cargarProductos();
                    }
                    break;
                case 'vendedores':
                    if (this.currentUser.rol === 'administrador') {
                        await Vendedores.cargarVendedores();
                    }
                    break;
                case 'ventas':
                    await Ventas.cargarVentas();
                    break;
                case 'reportes':
                    // Los reportes se generan bajo demanda
                    break;
            }
        } catch (error) {
            console.error('Error al cargar datos de vista:', error);
        }
    },

    /**
     * Cargar datos del dashboard
     */
    async loadDashboard() {
        try {
            // Obtener ventas de hoy
            const hoy = Utils.getCurrentDate();
            const ventasResponse = await API.getVentas({
                fecha_inicio: hoy,
                fecha_fin: hoy
            });

            let ventasHoy = 0;
            let totalHoy = 0;

            if (ventasResponse.success && ventasResponse.data) {
                ventasHoy = ventasResponse.data.length;
                totalHoy = Utils.sum(ventasResponse.data, 'total');
            }

            // Actualizar estadísticas
            document.getElementById('stat-ventas-hoy').textContent = ventasHoy;
            document.getElementById('stat-total-hoy').textContent = Utils.formatCurrency(totalHoy);

            // Solo para administradores
            if (this.currentUser.rol === 'administrador') {
                // Obtener productos activos
                const productosResponse = await API.getProductos();
                if (productosResponse.success) {
                    document.getElementById('stat-productos').textContent = productosResponse.data.length;
                }

                // Obtener vendedores activos
                const vendedoresResponse = await API.getVendedores();
                if (vendedoresResponse.success) {
                    const activos = vendedoresResponse.data.filter(v => v.estado === 'activo');
                    document.getElementById('stat-vendedores').textContent = activos.length;
                }
            }

            // Cargar ventas recientes
            await this.loadVentasRecientes();

        } catch (error) {
            console.error('Error al cargar dashboard:', error);
        }
    },

    /**
     * Cargar ventas recientes para el dashboard
     */
    async loadVentasRecientes() {
        const container = document.getElementById('ventas-recientes-container');

        try {
            const response = await API.getVentas();

            if (!response.success || !response.data || response.data.length === 0) {
                container.innerHTML = `
                    <p style="text-align: center; color: var(--gray-500); padding: 2rem;">
                        No hay ventas registradas
                    </p>
                `;
                return;
            }

            const ventas = response.data.slice(0, 10); // Últimas 10 ventas

            container.innerHTML = `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>N° Venta</th>
                                <th>Fecha</th>
                                <th>Vendedor</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ventas.map(venta => `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(venta.numero_venta)}</strong></td>
                                    <td>${Utils.formatDate(venta.fecha_venta)}</td>
                                    <td>${Utils.escapeHtml(venta.vendedor)}</td>
                                    <td><strong>${Utils.formatCurrency(venta.total)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error al cargar ventas recientes:', error);
            container.innerHTML = `
                <p style="text-align: center; color: var(--error); padding: 2rem;">
                    Error al cargar ventas
                </p>
            `;
        }
    }
};

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Hacer App global
window.App = App;
