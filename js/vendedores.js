/**
 * Módulo de Gestión de Vendedores (Cliente)
 * RF-09, RF-10
 */

const Vendedores = {
    vendedores: [],

    /**
     * Inicializar módulo
     */
    async init() {
        await this.cargarVendedores();
        this.setupEventListeners();
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-vendedor');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => this.mostrarFormulario());
        }
    },

    /**
     * RF-10: Cargar lista de vendedores
     */
    async cargarVendedores() {
        const tbody = document.getElementById('tbody-vendedores');
        UI.showLoading(tbody, 'Cargando vendedores...');

        try {
            const response = await API.getVendedores();

            if (response.success) {
                this.vendedores = response.data;
                this.renderVendedores();
            } else {
                UI.showError(tbody, response.message);
            }
        } catch (error) {
            console.error('Error al cargar vendedores:', error);
            UI.showError(tbody, 'Error al cargar vendedores');
        }
    },

    /**
     * Renderizar tabla de vendedores
     */
    renderVendedores() {
        const tbody = document.getElementById('tbody-vendedores');

        if (this.vendedores.length === 0) {
            UI.showEmpty(tbody, 'No hay vendedores registrados');
            return;
        }

        tbody.innerHTML = this.vendedores.map(vendedor => {
            const estadoBadge = vendedor.estado === 'activo' ?
                UI.createBadge('Activo', 'success') :
                vendedor.estado === 'vacaciones' ?
                    UI.createBadge('Vacaciones', 'warning') :
                    UI.createBadge('Inactivo', 'error');

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(vendedor.codigo_vendedor)}</strong></td>
                    <td>${Utils.escapeHtml(vendedor.nombre_completo)}</td>
                    <td>${Utils.escapeHtml(vendedor.username)}</td>
                    <td>${vendedor.email ? Utils.escapeHtml(vendedor.email) : '-'}</td>
                    <td><strong>${vendedor.comision_porcentaje}%</strong></td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="Vendedores.mostrarFormulario(${vendedor.id_vendedor})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * RF-09: Mostrar formulario de vendedor
     */
    /**
     * RF-09: Mostrar formulario de vendedor con validaciones
     */
    async mostrarFormulario(id = null) {
        const isEdit = id !== null;
        let vendedor = null;

        if (isEdit) {
            try {
                const response = await API.getVendedor(id);
                if (response.success) {
                    vendedor = response.data;
                }
            } catch (error) {
                UI.showToast('Error al cargar vendedor', 'error');
                return;
            }
        }

        const formContent = `
            <form id="form-vendedor" novalidate>
                ${!isEdit ? `
                    <div class="form-group">
                        <label for="nombre_completo">Nombre Completo *</label>
                        <input type="text" id="nombre_completo" name="nombre_completo" class="form-control" 
                               placeholder="Ingrese el nombre completo" required>
                        <div class="invalid-feedback">El nombre es requerido</div>
                    </div>

                    <div class="form-group">
                        <label for="username">Usuario *</label>
                        <input type="text" id="username" name="username" class="form-control" 
                               placeholder="Nombre de usuario para login" required pattern="^[a-zA-Z0-9_]+$">
                        <small style="color: var(--gray-600);">Solo letras, números y guión bajo</small>
                        <div class="invalid-feedback">Usuario requerido (solo letras, números y _)</div>
                    </div>

                    <div class="form-group">
                        <label for="password">Contraseña *</label>
                        <input type="password" id="password" name="password" class="form-control" 
                               placeholder="Contraseña segura" required minlength="6">
                        <div class="invalid-feedback">Mínimo 6 caracteres</div>
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" class="form-control" 
                               placeholder="correo@ejemplo.com">
                        <div class="invalid-feedback">Formato de email incorrecto</div>
                    </div>

                     <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <input type="text" id="telefono" name="telefono" class="form-control" 
                               placeholder="Solo números" pattern="[0-9]+">
                        <div class="invalid-feedback">Solo se permiten números</div>
                    </div>

                    <div class="form-group">
                        <label for="codigo_vendedor">Código de Vendedor</label>
                        <input type="text" id="codigo_vendedor" name="codigo_vendedor" class="form-control" 
                               placeholder="Ej: VEN001 (opcional)">
                    </div>
                ` : `
                    <div style="padding: 1rem; background: var(--gray-100); border-radius: var(--radius-md); margin-bottom: 1rem;">
                        <p><strong>Vendedor:</strong> ${Utils.escapeHtml(vendedor.nombre_completo)}</p>
                        <p><strong>Usuario:</strong> ${Utils.escapeHtml(vendedor.username)}</p>
                    </div>
                `}

                <div class="form-group">
                    <label for="comision_porcentaje">Comisión (%) *</label>
                    <input type="number" id="comision_porcentaje" name="comision_porcentaje" class="form-control" 
                           value="${vendedor ? vendedor.comision_porcentaje : '5.00'}"
                           placeholder="5.00" step="0.01" min="0" max="100" required>
                    <div class="invalid-feedback">Valor entre 0 y 100</div>
                </div>

                <div class="form-group">
                    <label for="meta_mensual">Meta Mensual (S/)</label>
                    <input type="number" id="meta_mensual" name="meta_mensual" class="form-control" 
                           value="${vendedor ? vendedor.meta_mensual : '0'}"
                           placeholder="0.00" step="0.01" min="0">
                </div>

                ${!isEdit ? `
                    <div class="form-group">
                        <label for="fecha_contratacion">Fecha de Contratación</label>
                        <input type="date" id="fecha_contratacion" name="fecha_contratacion" class="form-control" 
                               value="${Utils.getCurrentDate()}">
                    </div>
                ` : `
                    <div class="form-group">
                        <label for="estado">Estado *</label>
                        <select id="estado" name="estado" class="form-control" required>
                            <option value="activo" ${vendedor.estado === 'activo' ? 'selected' : ''}>Activo</option>
                            <option value="inactivo" ${vendedor.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                    <input type="hidden" id="id_vendedor" value="${vendedor.id_vendedor}">
                `}
            </form>
        `;

        const modalId = UI.createModal(
            isEdit ? 'Editar Vendedor' : 'Nuevo Vendedor',
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
                    onClick: () => this.guardarVendedor(modalId, isEdit)
                }
            ]
        );

        // --- AGREGAR LISTENERS PARA VALIDACIÓN EN TIEMPO REAL ---

        // Función helper para mostrar error
        const validarInput = (input, condicion, mensaje) => {
            const feedback = input.nextElementSibling; // Asumimos que el feedback es el siguiente hermano
            if (!condicion) {
                input.style.borderColor = 'var(--error)';
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.style.display = 'block';
                    feedback.textContent = mensaje;
                }
            } else {
                input.style.borderColor = 'var(--gray-300)';
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.style.display = 'none';
                }
            }
        };

        // Validar Teléfono (Solo números)
        const inputTelefono = document.getElementById('telefono');
        if (inputTelefono) {
            inputTelefono.addEventListener('input', (e) => {
                // Eliminar caracteres no numéricos
                const valor = e.target.value;
                if (/[^0-9]/.test(valor)) {
                    e.target.value = valor.replace(/[^0-9]/g, '');
                    UI.showToast('Solo se permiten números en el teléfono', 'warning');
                }
                validarInput(e.target, e.target.value.length > 0, 'Solo se permiten números');
            });
        }

        // Validar Usuario (Sin espacios ni caracteres raros)
        const inputUsername = document.getElementById('username');
        if (inputUsername) {
            inputUsername.addEventListener('input', (e) => {
                const valor = e.target.value;
                if (/[^a-zA-Z0-9_]/.test(valor)) {
                    e.target.value = valor.replace(/[^a-zA-Z0-9_]/g, '');
                    UI.showToast('El usuario no puede tener espacios ni caracteres especiales', 'warning');
                }
            });
        }
    },

    /**
     * RF-09: Guardar vendedor con manejo robusto de errores
     */
    /**
     * RF-09: Guardar vendedor con manejo robusto de errores
     */
    async guardarVendedor(modalId, isEdit) {
        // Obtener referencia al modal específico para evitar conflictos de IDs
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error("Modal no encontrado:", modalId);
            return;
        }

        const form = modal.querySelector('form');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Helper para leer valor de forma segura dentro del modal
        const getValue = (selector) => {
            const el = modal.querySelector(selector);
            return el ? el.value : '';
        };

        const data = {
            comision_porcentaje: parseFloat(getValue('#comision_porcentaje')) || 0,
            meta_mensual: parseFloat(getValue('#meta_mensual')) || 0
        };

        // Si estamos editando, tomamos ID y estado
        if (isEdit) {
            const idInput = modal.querySelector('#id_vendedor');
            if (idInput) {
                data.id_vendedor = parseInt(idInput.value);
            } else {
                console.error("No se encontró ID vendedor");
                UI.showToast("Error interno: ID vendedor no encontrado", "error");
                return;
            }
            data.estado = getValue('#estado');
        }
        // Si estamos creando, tomamos todos los datos personales
        else {
            data.nombre_completo = getValue('#nombre_completo').trim();
            data.username = getValue('#username').trim();
            data.password = getValue('#password'); // El password no se trimea a veces, pero ok
            data.email = getValue('#email').trim();
            data.telefono = getValue('#telefono').trim();
            data.codigo_vendedor = getValue('#codigo_vendedor').trim();
            data.fecha_contratacion = getValue('#fecha_contratacion');

            // Logs de depuración para ver qué está leyendo
            console.log("Datos leídos del formulario:", {
                nombre: data.nombre_completo,
                user: data.username,
                pass_len: data.password ? data.password.length : 0
            });

            // Validaciones manuales antes de enviar
            const errores = [];
            if (!data.nombre_completo) errores.push("Nombre");
            if (!data.username) errores.push("Usuario");
            if (!data.password) errores.push("Contraseña");

            if (errores.length > 0) {
                console.error("Campos vacíos:", errores);
                UI.showToast(`Faltan campos obligatorios: ${errores.join(', ')}`, "warning");
                return;
            }

            if (data.email && !Utils.validateEmail(data.email)) {
                UI.showToast("El formato del email es incorrecto", "warning");
                return;
            }
        }

        console.log("Enviando datos:", data); // Debug para ver qué se envía

        try {
            const response = isEdit ?
                await API.updateVendedor(data) :
                await API.createVendedor(data);

            if (response.success) {
                UI.showToast(
                    isEdit ? 'Vendedor actualizado exitosamente' : 'Vendedor creado exitosamente',
                    'success'
                );
                UI.closeModal(modalId);
                await this.cargarVendedores();
            } else {
                UI.showToast(response.message, 'error');
            }
        } catch (error) {
            console.error('Error al guardar vendedor:', error);
            // Mostrar mensaje de error detallado
            UI.showToast(error.message || 'Error desconocido al guardar', 'error');
        }
    }
};

// Hacer Vendedores global
window.Vendedores = Vendedores;
