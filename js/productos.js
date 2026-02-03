/**
 * Módulo de Gestión de Productos (Cliente)
 * RF-04, RF-05, RF-06, RF-07, RF-08
 */

const Productos = {
    productos: [],
    grupos: [],

    /**
     * Inicializar módulo
     */
    async init() {
        await this.cargarGrupos();
        await this.cargarProductos();
        this.setupEventListeners();
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-producto');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => this.mostrarFormulario());
        }
    },

    /**
     * RF-06: Cargar lista de productos
     */
    async cargarProductos() {
        const tbody = document.getElementById('tbody-productos');
        UI.showLoading(tbody, 'Cargando productos...');

        try {
            const response = await API.getProductos();

            if (response.success) {
                this.productos = response.data;
                this.renderProductos();
            } else {
                UI.showError(tbody, response.message);
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
            UI.showError(tbody, 'Error al cargar productos');
        }
    },

    /**
     * Cargar grupos de productos
     */
    async cargarGrupos() {
        try {
            const response = await API.getGruposProductos();
            if (response.success) {
                this.grupos = response.data;
            }
        } catch (error) {
            console.error('Error al cargar grupos:', error);
        }
    },

    /**
     * Renderizar tabla de productos
     */
    renderProductos() {
        const tbody = document.getElementById('tbody-productos');

        if (this.productos.length === 0) {
            UI.showEmpty(tbody, 'No hay productos registrados');
            return;
        }

        tbody.innerHTML = this.productos.map(producto => `
            <tr>
                <td><strong>${Utils.escapeHtml(producto.codigo_producto)}</strong></td>
                <td>${Utils.escapeHtml(producto.nombre_producto)}</td>
                <td>${UI.createBadge(producto.nombre_grupo, 'info')}</td>
                <td><strong>${Utils.formatCurrency(producto.precio_unitario)}</strong></td>
                <td>
                    ${producto.stock_disponible} ${producto.unidad_medida}
                    ${producto.stock_disponible <= producto.stock_minimo ?
                '<i class="fas fa-exclamation-triangle" style="color: var(--warning);" title="Stock bajo"></i>' : ''}
                </td>
                <td>${Utils.capitalize(producto.unidad_medida)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="Productos.mostrarFormulario(${producto.id_producto})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Productos.eliminar(${producto.id_producto})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    /**
     * RF-04, RF-05: Mostrar formulario de producto
     */
    async mostrarFormulario(id = null) {
        const isEdit = id !== null;
        let producto = null;

        if (isEdit) {
            try {
                const response = await API.getProducto(id);
                if (response.success) {
                    producto = response.data;
                }
            } catch (error) {
                UI.showToast('Error al cargar producto', 'error');
                return;
            }
        }

        const gruposOptions = this.grupos.map(grupo =>
            `<option value="${grupo.id_grupo}" ${producto && producto.id_grupo == grupo.id_grupo ? 'selected' : ''}>
                ${Utils.escapeHtml(grupo.nombre_grupo)}
            </option>`
        ).join('');

        const formContent = `
            <form id="form-producto">
                <div class="form-group">
                    <label for="codigo_producto">Código del Producto</label>
                    <input type="text" id="codigo_producto" name="codigo_producto" class="form-control" 
                           value="${producto ? Utils.escapeHtml(producto.codigo_producto) : ''}"
                           placeholder="Ej: PROD001 (opcional, se genera automático)">
                </div>

                <div class="form-group">
                    <label for="nombre_producto">Nombre del Producto *</label>
                    <input type="text" id="nombre_producto" name="nombre_producto" class="form-control" 
                           value="${producto ? Utils.escapeHtml(producto.nombre_producto) : ''}"
                           placeholder="Ingrese el nombre del producto" required>
                </div>

                <div class="form-group">
                    <label for="id_grupo">Categoría *</label>
                    <select id="id_grupo" name="id_grupo" class="form-control" required>
                        <option value="">Seleccione una categoría</option>
                        ${gruposOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label for="precio_unitario">Precio Unitario (S/) *</label>
                    <input type="number" id="precio_unitario" name="precio_unitario" class="form-control" 
                           value="${producto ? producto.precio_unitario : ''}"
                           placeholder="0.00" step="0.01" min="0.01" required>
                    <small style="color: var(--gray-600);">El precio debe ser mayor a cero</small>
                </div>

                <div class="form-group">
                    <label for="stock_disponible">Stock Disponible</label>
                    <input type="number" id="stock_disponible" name="stock_disponible" class="form-control" 
                           value="${producto ? producto.stock_disponible : '0'}"
                           placeholder="0" step="0.01" min="0">
                </div>

                <div class="form-group">
                    <label for="stock_minimo">Stock Mínimo</label>
                    <input type="number" id="stock_minimo" name="stock_minimo" class="form-control" 
                           value="${producto ? producto.stock_minimo : '0'}"
                           placeholder="0" step="0.01" min="0">
                </div>

                <div class="form-group">
                    <label for="unidad_medida">Unidad de Medida *</label>
                    <select id="unidad_medida" name="unidad_medida" class="form-control" required>
                        <option value="kg" ${producto && producto.unidad_medida === 'kg' ? 'selected' : ''}>Kilogramo (kg)</option>
                        <option value="unidad" ${producto && producto.unidad_medida === 'unidad' ? 'selected' : ''}>Unidad</option>
                        <option value="caja" ${producto && producto.unidad_medida === 'caja' ? 'selected' : ''}>Caja</option>
                    </select>
                </div>

                ${isEdit ? `<input type="hidden" id="id_producto" value="${producto.id_producto}">` : ''}
            </form>
        `;

        const modalId = UI.createModal(
            isEdit ? 'Editar Producto' : 'Nuevo Producto',
            formContent,
            [
                {
                    text: 'Cancelar',
                    class: 'btn btn-outline',
                    onClick: () => UI.closeModal(modalId)
                },
                {
                    text: isEdit ? 'Actualizar' : 'Guardar',
                    class: 'btn btn-primary',
                    onClick: () => this.guardarProducto(modalId, isEdit)
                }
            ]
        );
    },

    /**
     * RF-04, RF-05, RF-07, RF-08: Guardar producto
     */
    async guardarProducto(modalId, isEdit) {
        const form = document.getElementById('form-producto');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = {
            codigo_producto: document.getElementById('codigo_producto').value.trim(),
            nombre_producto: document.getElementById('nombre_producto').value.trim(),
            id_grupo: parseInt(document.getElementById('id_grupo').value),
            precio_unitario: parseFloat(document.getElementById('precio_unitario').value),
            stock_disponible: parseFloat(document.getElementById('stock_disponible').value) || 0,
            stock_minimo: parseFloat(document.getElementById('stock_minimo').value) || 0,
            unidad_medida: document.getElementById('unidad_medida').value
        };

        // RF-08: Validar precio > 0
        if (data.precio_unitario <= 0) {
            UI.showToast('El precio debe ser mayor a cero', 'error');
            return;
        }

        if (isEdit) {
            data.id_producto = parseInt(document.getElementById('id_producto').value);
        }

        try {
            const response = isEdit ?
                await API.updateProducto(data) :
                await API.createProducto(data);

            if (response.success) {
                UI.showToast(
                    isEdit ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
                    'success'
                );
                UI.closeModal(modalId);
                await this.cargarProductos();
            } else {
                UI.showToast(response.message, 'error');
            }
        } catch (error) {
            console.error('Error al guardar producto:', error);
            UI.showToast('Error al guardar producto', 'error');
        }
    },

    /**
     * Eliminar producto
     */
    async eliminar(id) {
        const producto = this.productos.find(p => p.id_producto == id);
        if (!producto) return;

        const confirmed = await UI.confirm(
            `¿Está seguro de eliminar el producto "${producto.nombre_producto}"?`,
            'Confirmar eliminación'
        );

        if (!confirmed) return;

        try {
            const response = await API.deleteProducto(id);

            if (response.success) {
                UI.showToast('Producto eliminado exitosamente', 'success');
                await this.cargarProductos();
            } else {
                UI.showToast(response.message, 'error');
            }
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            UI.showToast('Error al eliminar producto', 'error');
        }
    }
};

// Hacer Productos global
window.Productos = Productos;
