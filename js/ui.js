/**
 * Módulo de interfaz de usuario
 */

const UI = {
    /**
     * Mostrar notificación toast
     */
    showToast(message, type = 'info', title = '') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const titles = {
            success: title || 'Éxito',
            error: title || 'Error',
            warning: title || 'Advertencia',
            info: title || 'Información'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${Utils.escapeHtml(message)}</div>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, CONFIG.TOAST_DURATION);
    },

    /**
     * Mostrar loading en elemento
     */
    showLoading(element, message = 'Cargando...') {
        element.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> ${message}
            </div>
        `;
    },

    /**
     * Mostrar mensaje de error
     */
    showError(element, message = 'Error al cargar datos') {
        element.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--error);">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>${Utils.escapeHtml(message)}</p>
            </div>
        `;
    },

    /**
     * Mostrar mensaje vacío
     */
    showEmpty(element, message = 'No hay datos para mostrar') {
        element.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--gray-500);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>${Utils.escapeHtml(message)}</p>
            </div>
        `;
    },

    /**
     * Crear modal
     */
    createModal(title, content, buttons = []) {
        const modalId = Utils.generateId();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-2xl);
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease-out;
        `;

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.style.cssText = `
            padding: 1.5rem;
            border-bottom: 1px solid var(--gray-200);
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        const modalTitle = document.createElement('h3');
        modalTitle.textContent = title;
        modalTitle.style.cssText = `
            font-size: var(--font-size-xl);
            font-weight: 700;
            color: var(--gray-900);
            margin: 0;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.className = 'btn btn-icon';
        closeBtn.onclick = () => this.closeModal(modalId);

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.style.cssText = `padding: 1.5rem;`;
        modalBody.innerHTML = content;

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);

        if (buttons.length > 0) {
            const modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            modalFooter.style.cssText = `
                padding: 1.5rem;
                border-top: 1px solid var(--gray-200);
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            `;

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = btn.class || 'btn btn-primary';
                button.textContent = btn.text;
                button.onclick = () => {
                    if (btn.onClick) {
                        btn.onClick();
                    }
                };
                modalFooter.appendChild(button);
            });

            modalContent.appendChild(modalFooter);
        }

        modal.appendChild(modalContent);

        // Variables para controlar el cierre accidental al seleccionar
        let isMouseDownOnBackground = false;

        modal.onmousedown = (e) => {
            if (e.target === modal) {
                isMouseDownOnBackground = true;
            } else {
                isMouseDownOnBackground = false;
            }
        };

        modal.onmouseup = (e) => {
            // Solo cerrar si el click empezó y terminó en el fondo
            // Y si no hay texto seleccionado
            if (e.target === modal && isMouseDownOnBackground) {
                const selection = window.getSelection();
                if (selection.toString().length === 0) {
                    this.closeModal(modalId);
                }
            }
            isMouseDownOnBackground = false;
        };

        document.getElementById('modal-container').appendChild(modal);
        return modalId;
    },

    /**
     * Cerrar modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    },

    /**
     * Confirmar acción
     */
    async confirm(message, title = '¿Está seguro?') {
        return new Promise((resolve) => {
            const modalId = this.createModal(
                title,
                `<p style="font-size: 1.1rem; color: var(--gray-700);">${Utils.escapeHtml(message)}</p>`,
                [
                    {
                        text: 'Cancelar',
                        class: 'btn btn-outline',
                        onClick: () => {
                            this.closeModal(modalId);
                            resolve(false);
                        }
                    },
                    {
                        text: 'Confirmar',
                        class: 'btn btn-primary',
                        onClick: () => {
                            this.closeModal(modalId);
                            resolve(true);
                        }
                    }
                ]
            );
        });
    },

    /**
     * Crear badge de estado
     */
    createBadge(text, type = 'info') {
        return `<span class="badge badge-${type}">${Utils.escapeHtml(text)}</span>`;
    },

    /**
     * Crear botones de acción para tabla
     */
    createActionButtons(actions) {
        return actions.map(action => {
            const icon = action.icon || 'fa-edit';
            const className = action.class || 'btn-primary';
            const title = action.title || '';
            return `
                <button 
                    class="btn btn-sm ${className}" 
                    onclick="${action.onClick}"
                    title="${title}"
                >
                    <i class="fas ${icon}"></i>
                </button>
            `;
        }).join(' ');
    },

    /**
     * Actualizar título de página
     */
    updatePageTitle(title) {
        document.getElementById('page-title').textContent = title;
        document.title = `${title} - ${CONFIG.APP_NAME}`;
    },

    /**
     * Cambiar vista activa
     */
    switchView(viewName) {
        // Ocultar todas las vistas
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Mostrar vista seleccionada
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Actualizar navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Actualizar título
        const titles = {
            'dashboard': 'Dashboard',
            'productos': 'Gestión de Productos',
            'vendedores': 'Gestión de Vendedores',
            'ventas': 'Registro de Ventas',
            'reportes': 'Reportes'
        };

        this.updatePageTitle(titles[viewName] || 'Dashboard');
    },

    /**
     * Toggle sidebar en móvil
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    },

    /**
     * Actualizar información de usuario
     */
    updateUserInfo(user) {
        document.getElementById('user-name').textContent = user.nombre_completo;
        document.getElementById('user-role').textContent = Utils.capitalize(user.rol);

        // Mostrar/ocultar elementos según rol
        if (user.rol === 'administrador') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
    },

    /**
     * Actualizar fecha actual
     */
    updateCurrentDate() {
        document.getElementById('current-date').textContent = Utils.getFormattedCurrentDate();
    }
};

// Hacer UI global
window.UI = UI;
