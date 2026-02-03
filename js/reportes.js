/**
 * Módulo de Reportes (Cliente)
 * RF-15, RF-16
 */

const Reportes = {
    /**
     * Inicializar módulo
     */
    init() {
        this.setupEventListeners();
        this.setDefaultDates();
    },

    /**
     * Configurar fechas por defecto (último mes)
     */
    setDefaultDates() {
        const hoy = new Date();
        const haceUnMes = new Date();
        haceUnMes.setMonth(haceUnMes.getMonth() - 1);

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Reporte por vendedor
        const vendedorInicio = document.getElementById('reporte-vendedor-inicio');
        const vendedorFin = document.getElementById('reporte-vendedor-fin');
        if (vendedorInicio && vendedorFin) {
            vendedorInicio.value = formatDate(haceUnMes);
            vendedorFin.value = formatDate(hoy);
        }

        // Reporte por fecha
        const fechaInicio = document.getElementById('reporte-fecha-inicio');
        const fechaFin = document.getElementById('reporte-fecha-fin');
        if (fechaInicio && fechaFin) {
            fechaInicio.value = formatDate(haceUnMes);
            fechaFin.value = formatDate(hoy);
        }
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        const btnVendedor = document.getElementById('btn-generar-reporte-vendedor');
        if (btnVendedor) {
            btnVendedor.addEventListener('click', () => this.generarReporteVendedor());
        }

        const btnFecha = document.getElementById('btn-generar-reporte-fecha');
        if (btnFecha) {
            btnFecha.addEventListener('click', () => this.generarReporteFecha());
        }
    },

    /**
     * RF-15: Generar reporte de ventas por vendedor
     */
    async generarReporteVendedor() {
        const fechaInicio = document.getElementById('reporte-vendedor-inicio').value;
        const fechaFin = document.getElementById('reporte-vendedor-fin').value;
        const container = document.getElementById('reporte-vendedor-resultado');

        if (!fechaInicio || !fechaFin) {
            UI.showToast('Seleccione el rango de fechas', 'warning');
            return;
        }

        if (fechaInicio > fechaFin) {
            UI.showToast('La fecha de inicio debe ser menor a la fecha fin', 'warning');
            return;
        }

        UI.showLoading(container, 'Generando reporte...');

        try {
            const response = await API.getReporteVendedor(fechaInicio, fechaFin);

            if (!response.success) {
                UI.showError(container, response.message);
                return;
            }

            const datos = response.data;

            if (datos.length === 0) {
                UI.showEmpty(container, 'No hay datos para el período seleccionado');
                return;
            }

            // Calcular totales generales
            const totalVentas = Utils.sum(datos, 'total_ventas');
            const totalMonto = Utils.sum(datos, 'monto_total_vendido');
            const totalComisiones = Utils.sum(datos, 'comision_total');

            const reporteHtml = `
                <div style="margin-top: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="background: var(--primary-50); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--primary-700);">${totalVentas}</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Total Ventas</div>
                        </div>
                        <div style="background: var(--success-light); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${Utils.formatCurrency(totalMonto)}</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Monto Total</div>
                        </div>
                        <div style="background: var(--warning-light); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--warning);">${Utils.formatCurrency(totalComisiones)}</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Comisiones</div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Vendedor</th>
                                    <th>Código</th>
                                    <th>N° Ventas</th>
                                    <th>Monto Total</th>
                                    <th>Promedio</th>
                                    <th>Comisión %</th>
                                    <th>Comisión Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${datos.map(vendedor => `
                                    <tr>
                                        <td><strong>${Utils.escapeHtml(vendedor.vendedor)}</strong></td>
                                        <td>${Utils.escapeHtml(vendedor.codigo_vendedor)}</td>
                                        <td>${vendedor.total_ventas}</td>
                                        <td><strong>${Utils.formatCurrency(vendedor.monto_total_vendido)}</strong></td>
                                        <td>${Utils.formatCurrency(vendedor.promedio_venta)}</td>
                                        <td>${vendedor.comision_porcentaje}%</td>
                                        <td><strong style="color: var(--success);">${Utils.formatCurrency(vendedor.comision_total)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background: var(--gray-100); font-weight: bold;">
                                    <td colspan="2">TOTALES</td>
                                    <td>${totalVentas}</td>
                                    <td>${Utils.formatCurrency(totalMonto)}</td>
                                    <td>${Utils.formatCurrency(totalMonto / totalVentas)}</td>
                                    <td>-</td>
                                    <td>${Utils.formatCurrency(totalComisiones)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style="margin-top: 1rem; text-align: right;">
                        <button class="btn btn-primary" onclick="Reportes.exportarReporteVendedor()">
                            <i class="fas fa-download"></i> Exportar a CSV
                        </button>
                    </div>
                </div>
            `;

            container.innerHTML = reporteHtml;

            // Guardar datos para exportación
            this.datosReporteVendedor = datos;

        } catch (error) {
            console.error('Error al generar reporte:', error);
            UI.showError(container, 'Error al generar reporte');
        }
    },

    /**
     * RF-16: Generar reporte de ventas por fecha
     */
    async generarReporteFecha() {
        const fechaInicio = document.getElementById('reporte-fecha-inicio').value;
        const fechaFin = document.getElementById('reporte-fecha-fin').value;
        const container = document.getElementById('reporte-fecha-resultado');

        if (!fechaInicio || !fechaFin) {
            UI.showToast('Seleccione el rango de fechas', 'warning');
            return;
        }

        if (fechaInicio > fechaFin) {
            UI.showToast('La fecha de inicio debe ser menor a la fecha fin', 'warning');
            return;
        }

        UI.showLoading(container, 'Generando reporte...');

        try {
            const response = await API.getReporteFecha(fechaInicio, fechaFin);

            if (!response.success) {
                UI.showError(container, response.message);
                return;
            }

            const datos = response.data;
            const reporteDiario = datos.reporte_diario;
            const totales = datos.totales;

            if (reporteDiario.length === 0) {
                UI.showEmpty(container, 'No hay datos para el período seleccionado');
                return;
            }

            const reporteHtml = `
                <div style="margin-top: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="background: var(--primary-50); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--primary-700);">${totales.total_ventas || 0}</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Total Ventas</div>
                        </div>
                        <div style="background: var(--success-light); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${Utils.formatCurrency(totales.total_general || 0)}</div>
                            <div style="color: var(--gray-600); font-size: 0.9rem;">Monto Total</div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>N° Ventas</th>
                                    <th>Total Vendido</th>
                                    <th>Promedio</th>
                                    <th>Venta Mínima</th>
                                    <th>Venta Máxima</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reporteDiario.map(dia => `
                                    <tr>
                                        <td><strong>${Utils.formatDate(dia.fecha_venta)}</strong></td>
                                        <td>${dia.num_ventas}</td>
                                        <td><strong>${Utils.formatCurrency(dia.total_vendido)}</strong></td>
                                        <td>${Utils.formatCurrency(dia.promedio_venta)}</td>
                                        <td>${Utils.formatCurrency(dia.venta_minima)}</td>
                                        <td>${Utils.formatCurrency(dia.venta_maxima)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background: var(--gray-100); font-weight: bold;">
                                    <td>TOTALES</td>
                                    <td>${totales.total_ventas || 0}</td>
                                    <td>${Utils.formatCurrency(totales.total_general || 0)}</td>
                                    <td colspan="3">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style="margin-top: 1rem; text-align: right;">
                        <button class="btn btn-primary" onclick="Reportes.exportarReporteFecha()">
                            <i class="fas fa-download"></i> Exportar a CSV
                        </button>
                    </div>
                </div>
            `;

            container.innerHTML = reporteHtml;

            // Guardar datos para exportación
            this.datosReporteFecha = reporteDiario;

        } catch (error) {
            console.error('Error al generar reporte:', error);
            UI.showError(container, 'Error al generar reporte');
        }
    },

    /**
     * Exportar reporte de vendedores a CSV
     */
    exportarReporteVendedor() {
        if (!this.datosReporteVendedor || this.datosReporteVendedor.length === 0) {
            UI.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['Vendedor', 'Código', 'N° Ventas', 'Monto Total', 'Promedio', 'Comisión %', 'Comisión Total'];
        const rows = this.datosReporteVendedor.map(v => [
            v.vendedor,
            v.codigo_vendedor,
            v.total_ventas,
            v.monto_total_vendido,
            v.promedio_venta,
            v.comision_porcentaje,
            v.comision_total
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const filename = `reporte_vendedores_${Utils.getCurrentDate()}.csv`;

        Utils.downloadFile(csv, filename, 'text/csv');
        UI.showToast('Reporte exportado exitosamente', 'success');
    },

    /**
     * Exportar reporte de fechas a CSV
     */
    exportarReporteFecha() {
        if (!this.datosReporteFecha || this.datosReporteFecha.length === 0) {
            UI.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['Fecha', 'N° Ventas', 'Total Vendido', 'Promedio', 'Venta Mínima', 'Venta Máxima'];
        const rows = this.datosReporteFecha.map(d => [
            d.fecha_venta,
            d.num_ventas,
            d.total_vendido,
            d.promedio_venta,
            d.venta_minima,
            d.venta_maxima
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const filename = `reporte_fechas_${Utils.getCurrentDate()}.csv`;

        Utils.downloadFile(csv, filename, 'text/csv');
        UI.showToast('Reporte exportado exitosamente', 'success');
    }
};

// Hacer Reportes global
window.Reportes = Reportes;
