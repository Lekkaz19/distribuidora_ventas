/**
 * Módulo de Gestión de Ventas (Cliente)
 * RF-11, RF-12, RF-13, RF-14, RF-17
 */

const Ventas = {
    ventas: [],
    vendedores: [],
    productos: [],
    productosSeleccionados: [],

    /**
     * Inicializar módulo
     */
    async init() {
        await this.cargarDatos();
        await this.cargarVentas();
        this.setupEventListeners();
    },

    /**
     * Cargar datos necesarios
     */
    async cargarDatos() {
        try {
            const [vendedoresRes, productosRes] = await Promise.all([
                API.getVendedores(),
                API.getProductos()
            ]);

            if (vendedoresRes.success) {
                this.vendedores = vendedoresRes.data.filter(v => v.estado === 'activo');
            }

            if (productosRes.success) {
                this.productos = productosRes.data.filter(p => p.estado === 'activo');
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        const btnNueva = document.getElementById('btn-nueva-venta');
        if (btnNueva) {
            btnNueva.addEventListener('click', () => this.mostrarFormulario());
        }
    },

    /**
     * RF-17: Cargar lista de ventas
     */
    async cargarVentas() {
        const tbody = document.getElementById('tbody-ventas');
        UI.showLoading(tbody, 'Cargando ventas...');

        try {
            const response = await API.getVentas();

            if (response.success) {
                this.ventas = response.data;
                this.renderVentas();
            } else {
                UI.showError(tbody, response.message);
            }
        } catch (error) {
            console.error('Error al cargar ventas:', error);
            UI.showError(tbody, 'Error al cargar ventas');
        }
    },

    /**
     * Renderizar tabla de ventas
     */
    renderVentas() {
        const tbody = document.getElementById('tbody-ventas');

        if (this.ventas.length === 0) {
            UI.showEmpty(tbody, 'No hay ventas registradas');
            return;
        }

        tbody.innerHTML = this.ventas.map(venta => `
            <tr>
                <td><strong>${Utils.escapeHtml(venta.numero_venta)}</strong></td>
                <td>${Utils.formatDate(venta.fecha_venta)}</td>
                <td>${Utils.escapeHtml(venta.vendedor)}</td>
                <td>${Utils.escapeHtml(venta.cliente)}</td>
                <td><strong>${Utils.formatCurrency(venta.total)}</strong></td>
                <td>${UI.createBadge(Utils.capitalize(venta.estado), 'success')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="Ventas.verDetalle(${venta.id_venta})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    /**
     * RF-11: Mostrar formulario de nueva venta
     */
    mostrarFormulario() {
        this.productosSeleccionados = [];

        const currentUser = App.currentUser;
        let vendedorFieldHtml = '';

        if (currentUser && currentUser.rol === 'vendedor') {
            // Si es vendedor, asignarse a sí mismo automáticamente
            vendedorFieldHtml = `
                <div class="form-group">
                    <label>Vendedor</label>
                    <input type="text" class="form-control" value="${Utils.escapeHtml(currentUser.nombre_completo)}" readonly style="background-color: var(--gray-100);">
                    <input type="hidden" id="id_vendedor" name="id_vendedor" value="${currentUser.id_vendedor}">
                    <small style="color: var(--gray-600);">Venta asignada a tu usuario</small>
                </div>
            `;
        } else {
            // Si es admin, puede elegir
            const vendedoresOptions = this.vendedores.map(v =>
                `<option value="${v.id_vendedor}">${Utils.escapeHtml(v.nombre_completo)} (${v.codigo_vendedor})</option>`
            ).join('');

            vendedorFieldHtml = `
                <div class="form-group">
                    <label for="id_vendedor">Vendedor *</label>
                    <select id="id_vendedor" name="id_vendedor" class="form-control" required>
                        <option value="">Seleccione un vendedor</option>
                        ${vendedoresOptions}
                    </select>
                </div>
            `;
        }

        const productosOptions = this.productos.map(p =>
            `<option value="${p.id_producto}" data-precio="${p.precio_unitario}" data-stock="${p.stock_disponible}" data-unidad="${p.unidad_medida}">
                ${Utils.escapeHtml(p.nombre_producto)} - ${Utils.formatCurrency(p.precio_unitario)} (Stock: ${p.stock_disponible} ${p.unidad_medida})
            </option>`
        ).join('');

        const formContent = `
            <form id="form-venta">
                ${vendedorFieldHtml}

                <div class="form-group">

                <div class="form-group">
                    <label for="fecha_venta">Fecha de Venta *</label>
                    <input type="date" id="fecha_venta" name="fecha_venta" class="form-control" 
                           value="${Utils.getCurrentDate()}" required>
                </div>

                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea id="observaciones" name="observaciones" class="form-control" 
                              rows="2" placeholder="Observaciones adicionales"></textarea>
                </div>

                <hr style="margin: 1.5rem 0;">

                <h4 style="margin-bottom: 1rem;"><i class="fas fa-box"></i> Productos</h4>

                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <select id="producto_select" class="form-control" style="flex: 1;">
                        <option value="">Seleccione un producto</option>
                        ${productosOptions}
                    </select>
                    <input type="number" id="cantidad_input" class="form-control" 
                           placeholder="Cantidad" step="0.01" min="0.01" style="width: 150px;">
                    <button type="button" class="btn btn-success" onclick="Ventas.agregarProducto()">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>

                <div id="productos-lista" style="margin-top: 1rem;">
                    <p style="color: var(--gray-500); text-align: center; padding: 1rem;">
                        No hay productos agregados
                    </p>
                </div>

                <div style="margin-top: 1rem; padding: 1rem; background: var(--gray-100); border-radius: var(--radius-md);">
                    <h3 style="text-align: right; margin: 0;">
                        Total: <span id="total-venta" style="color: var(--primary-700);">S/ 0.00</span>
                    </h3>
                </div>
            </form>
        `;

        const modalId = UI.createModal(
            'Nueva Venta',
            formContent,
            [
                {
                    text: 'Cancelar',
                    class: 'btn btn-outline',
                    onClick: () => UI.closeModal(modalId)
                },
                {
                    text: 'Registrar Venta',
                    class: 'btn btn-success',
                    onClick: () => this.guardarVenta(modalId)
                }
            ]
        );

        // Guardar modalId para uso posterior
        this.currentModalId = modalId;
    },

    /**
     * RF-11: Agregar producto a la venta
     */
    agregarProducto() {
        const select = document.getElementById('producto_select');
        const cantidadInput = document.getElementById('cantidad_input');

        const idProducto = parseInt(select.value);
        const cantidad = parseFloat(cantidadInput.value);

        if (!idProducto) {
            UI.showToast('Seleccione un producto', 'warning');
            return;
        }

        if (!cantidad || cantidad <= 0) {
            UI.showToast('Ingrese una cantidad válida', 'warning');
            return;
        }

        const option = select.options[select.selectedIndex];
        const precio = parseFloat(option.dataset.precio);
        const stock = parseFloat(option.dataset.stock);
        const unidad = option.dataset.unidad;
        const nombre = option.text.split(' - ')[0];

        // Verificar stock
        if (cantidad > stock) {
            UI.showToast(`Stock insuficiente. Disponible: ${stock} ${unidad}`, 'error');
            return;
        }

        // Verificar si ya existe
        const existente = this.productosSeleccionados.find(p => p.id_producto === idProducto);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            this.productosSeleccionados.push({
                id_producto: idProducto,
                nombre: nombre,
                cantidad: cantidad,
                precio_unitario: precio,
                unidad: unidad
            });
        }

        // Limpiar inputs
        select.value = '';
        cantidadInput.value = '';

        this.renderProductosSeleccionados();
    },

    /**
     * Renderizar productos seleccionados
     */
    renderProductosSeleccionados() {
        const container = document.getElementById('productos-lista');

        if (this.productosSeleccionados.length === 0) {
            container.innerHTML = `
                <p style="color: var(--gray-500); text-align: center; padding: 1rem;">
                    No hay productos agregados
                </p>
            `;
            document.getElementById('total-venta').textContent = 'S/ 0.00';
            return;
        }

        // RF-12: Calcular total automáticamente
        let total = 0;

        container.innerHTML = `
            <table class="data-table" style="font-size: 0.9rem;">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${this.productosSeleccionados.map((p, index) => {
            const subtotal = p.cantidad * p.precio_unitario;
            total += subtotal;
            return `
                            <tr>
                                <td>${Utils.escapeHtml(p.nombre)}</td>
                                <td>${p.cantidad} ${p.unidad}</td>
                                <td>${Utils.formatCurrency(p.precio_unitario)}</td>
                                <td><strong>${Utils.formatCurrency(subtotal)}</strong></td>
                                <td>
                                    <button type="button" class="btn btn-sm btn-danger" 
                                            onclick="Ventas.eliminarProducto(${index})" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('total-venta').textContent = Utils.formatCurrency(total);
    },

    /**
     * Eliminar producto de la lista
     */
    eliminarProducto(index) {
        this.productosSeleccionados.splice(index, 1);
        this.renderProductosSeleccionados();
    },

    /**
     * RF-11, RF-12, RF-13, RF-14: Guardar venta
     */
    async guardarVenta(modalId) {
        const form = document.getElementById('form-venta');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (this.productosSeleccionados.length === 0) {
            UI.showToast('Debe agregar al menos un producto', 'warning');
            return;
        }

        const data = {
            id_vendedor: parseInt(document.getElementById('id_vendedor').value),
            fecha_venta: document.getElementById('fecha_venta').value,
            observaciones: document.getElementById('observaciones').value.trim(),
            productos: this.productosSeleccionados
        };

        try {
            const response = await API.createVenta(data);

            if (response.success) {
                UI.showToast(
                    `Venta registrada exitosamente. N° ${response.data.numero_venta}`,
                    'success'
                );
                UI.closeModal(modalId);
                await this.cargarVentas();
            } else {
                UI.showToast(response.message, 'error');
            }
        } catch (error) {
            console.error('Error al guardar venta:', error);
            UI.showToast('Error al registrar venta', 'error');
        }
    },

    /**
     * Ver detalle de venta
     */
    async verDetalle(id) {
        try {
            const response = await API.getVenta(id);

            if (!response.success) {
                UI.showToast('Error al cargar detalle', 'error');
                return;
            }

            const venta = response.data;

            const detalleHtml = `
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <strong>N° Venta:</strong> ${Utils.escapeHtml(venta.numero_venta)}
                        </div>
                        <div>
                            <strong>Fecha:</strong> ${Utils.formatDate(venta.fecha_venta)}
                        </div>
                        <div>
                            <strong>Vendedor:</strong> ${Utils.escapeHtml(venta.vendedor)}
                        </div>
                        <div>
                            <strong>Cliente:</strong> ${Utils.escapeHtml(venta.cliente)}
                        </div>
                    </div>
                    ${venta.observaciones ? `<p><strong>Observaciones:</strong> ${Utils.escapeHtml(venta.observaciones)}</p>` : ''}
                </div>

                <h4 style="margin-bottom: 1rem;">Detalle de Productos</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${venta.detalles.map(d => `
                            <tr>
                                <td>${Utils.escapeHtml(d.nombre_producto)}</td>
                                <td>${d.cantidad} ${d.unidad_medida}</td>
                                <td>${Utils.formatCurrency(d.precio_unitario)}</td>
                                <td><strong>${Utils.formatCurrency(d.subtotal)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: var(--gray-100); font-weight: bold;">
                            <td colspan="3" style="text-align: right;">TOTAL:</td>
                            <td>${Utils.formatCurrency(venta.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;

            UI.createModal(
                'Detalle de Venta',
                detalleHtml,
                [
                    {
                        text: 'Cerrar',
                        class: 'btn btn-outline',
                        onClick: function () {
                            const modals = document.querySelectorAll('.modal');
                            if (modals.length > 0) {
                                modals[modals.length - 1].remove();
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error al ver detalle:', error);
            UI.showToast('Error al cargar detalle', 'error');
        }
    }
};

// Hacer Ventas global
window.Ventas = Ventas;
