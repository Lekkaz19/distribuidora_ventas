/**
 * Módulo de comunicación con la API
 */

const API = {
    /**
     * Realizar petición HTTP
     */
    async request(endpoint, options = {}) {
        const url = CONFIG.API_BASE_URL + endpoint;

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);

            // Intentar parsear como JSON
            let data;
            const text = await response.text();

            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Error parseando JSON:', text);
                throw new Error('Respuesta del servidor no válida (JSON Inválido)');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('Error en API request:', error);
            throw error;
        }
    },

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE request
     */
    async delete(endpoint, data) {
        return this.request(endpoint, {
            method: 'DELETE',
            body: JSON.stringify(data)
        });
    },

    // ========== AUTENTICACIÓN ==========

    async login(username, password) {
        return this.post(CONFIG.ENDPOINTS.AUTH.LOGIN, { username, password });
    },

    async logout() {
        return this.post(CONFIG.ENDPOINTS.AUTH.LOGOUT);
    },

    async checkSession() {
        return this.get(CONFIG.ENDPOINTS.AUTH.CHECK);
    },

    // ========== PRODUCTOS ==========

    async getProductos() {
        return this.get(CONFIG.ENDPOINTS.PRODUCTOS.LIST);
    },

    async getProducto(id) {
        return this.get(CONFIG.ENDPOINTS.PRODUCTOS.GET + '&id=' + id);
    },

    async createProducto(data) {
        return this.post(CONFIG.ENDPOINTS.PRODUCTOS.CREATE, data);
    },

    async updateProducto(data) {
        return this.post(CONFIG.ENDPOINTS.PRODUCTOS.UPDATE, data);
    },

    async deleteProducto(id) {
        return this.post(CONFIG.ENDPOINTS.PRODUCTOS.DELETE, { id_producto: id });
    },

    async getGruposProductos() {
        return this.get(CONFIG.ENDPOINTS.PRODUCTOS.GRUPOS);
    },

    // ========== VENDEDORES ==========

    async getVendedores() {
        return this.get(CONFIG.ENDPOINTS.VENDEDORES.LIST);
    },

    async getVendedor(id) {
        return this.get(CONFIG.ENDPOINTS.VENDEDORES.GET + '&id=' + id);
    },

    async createVendedor(data) {
        return this.post(CONFIG.ENDPOINTS.VENDEDORES.CREATE, data);
    },

    async updateVendedor(data) {
        return this.post(CONFIG.ENDPOINTS.VENDEDORES.UPDATE, data);
    },

    // ========== VENTAS ==========

    async getVentas(filters = {}) {
        let endpoint = CONFIG.ENDPOINTS.VENTAS.LIST;
        const params = new URLSearchParams(filters);
        if (params.toString()) {
            endpoint += '&' + params.toString();
        }
        return this.get(endpoint);
    },

    async getVenta(id) {
        return this.get(CONFIG.ENDPOINTS.VENTAS.GET + '&id=' + id);
    },

    async createVenta(data) {
        return this.post(CONFIG.ENDPOINTS.VENTAS.CREATE, data);
    },

    async getReporteVendedor(fechaInicio, fechaFin) {
        let endpoint = CONFIG.ENDPOINTS.VENTAS.REPORTE_VENDEDOR;
        if (fechaInicio && fechaFin) {
            endpoint += `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        }
        return this.get(endpoint);
    },

    async getReporteFecha(fechaInicio, fechaFin) {
        return this.get(CONFIG.ENDPOINTS.VENTAS.REPORTE_FECHA +
            `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
    }
};

// Hacer API global
window.API = API;
