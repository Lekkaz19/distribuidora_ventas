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

        // RF-XX: Ocultar reporte de vendedor si no es administrador
        if (App.currentUser && App.currentUser.rol.toLowerCase() !== 'administrador') {
            const cardReporteVendedor = document.getElementById('card-reporte-vendedor');
            if (cardReporteVendedor) {
                cardReporteVendedor.style.display = 'none';
            }
        }
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
                            <i class="fas fa-file-excel"></i> Exportar a Excel
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
                            <i class="fas fa-file-excel"></i> Exportar a Excel
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
     * Fallback: Generar Excel HTML si falla librería (Mantiene estilos pero sale aviso)
     */
    generarHTMLBackup(headers, rows, filename) {
        // Ajustar extensión a .xls para este método
        const xlsFilename = filename.replace('.xlsx', '.xls').replace('.csv', '.xls');

        const headerRow = headers.map(h =>
            `<th style="background-color:#4472c4; color:#ffffff; border:1px solid #000000; padding:10px;">${h}</th>`
        ).join('');

        const bodyRows = rows.map((row, i) =>
            `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f2f2f2'};">
                ${row.map(cell => `<td style="border:1px solid #dddddd; padding:8px; text-align:${typeof cell === 'number' ? 'right' : 'left'};">${typeof cell === 'number' ? cell.toFixed(2).replace('.', ',') : cell}</td>`).join('')}
            </tr>`
        ).join('');

        const excelContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Reporte</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body>
                <table>
                    <thead><tr>${headerRow}</tr></thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </body>
            </html>`;

        const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = xlsFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    /**
     * Helper para exportar Excel Real (.xlsx) con estilos usando xlsx-js-style
     */
    generarExcel(headers, rows, filename) {
        if (typeof XLSX === 'undefined') {
            // Fallback silencioso a HTML con estilos
            this.generarHTMLBackup(headers, rows, filename);
            return true;
        }

        try {
            // Crear nuevo libro
            const wb = XLSX.utils.book_new();

            // Preparar datos (headers + filas)
            const ws_data = [headers, ...rows];

            // Crear hoja desde array
            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            // Definir estilos
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4472C4" } }, // Azul profesional
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            const cellStyle = {
                alignment: { vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "DDDDDD" } },
                    bottom: { style: "thin", color: { rgb: "DDDDDD" } },
                    left: { style: "thin", color: { rgb: "DDDDDD" } },
                    right: { style: "thin", color: { rgb: "DDDDDD" } }
                }
            };

            const alternateRowStyle = {
                fill: { fgColor: { rgb: "F2F2F2" } } // Gris muy claro
            };

            // Aplicar estilos celda por celda
            const range = XLSX.utils.decode_range(ws['!ref']);

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cell_address]) continue;

                    // Estilo base
                    let style = { ...cellStyle };

                    // Filas alternas (zebra striping) para el cuerpo
                    if (R > 0 && R % 2 !== 0) {
                        style = { ...style, ...alternateRowStyle };
                    }

                    // Encabezados
                    if (R === 0) {
                        style = headerStyle;
                    }

                    // Alinear números a la derecha
                    if (ws[cell_address].t === 'n') {
                        style.alignment = { ...style.alignment, horizontal: "right" };
                        // Formato de número: 2 decimales
                        ws[cell_address].z = '#,##0.00';
                    }

                    ws[cell_address].s = style;
                }
            }

            // Ajustar ancho de columnas automáticamente
            const colWidths = headers.map(() => ({ wch: 15 }));
            colWidths[0] = { wch: 20 }; // Primera columna
            if (headers.length > 1) colWidths[1] = { wch: 18 }; // Segunda columna
            ws['!cols'] = colWidths;

            // Añadir hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, "Reporte");

            // Guardar archivo
            const realFilename = filename.indexOf('.xlsx') === -1 ? filename.replace('.xls', '.xlsx') : filename;
            XLSX.writeFile(wb, realFilename);
            return true;

        } catch (error) {
            console.error('Error al generar Excel:', error);
            UI.showToast('Error al generar el archivo Excel', 'error');
            return false;
        }
    },

    /**
     * Exportar reporte de vendedores a Excel
     */
    exportarReporteVendedor() {
        if (!this.datosReporteVendedor || this.datosReporteVendedor.length === 0) {
            UI.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['Vendedor', 'Código', 'N° Ventas', 'Monto Total', 'Promedio', 'Comisión %', 'Comisión Total'];

        // Helper para asegurar número
        const getNum = (val) => {
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        const rows = this.datosReporteVendedor.map(v => [
            v.vendedor,
            v.codigo_vendedor,
            parseInt(v.total_ventas),
            getNum(v.monto_total_vendido),
            getNum(v.promedio_venta),
            getNum(v.comision_porcentaje),
            getNum(v.comision_total)
        ]);

        const filename = `reporte_vendedores_${Utils.getCurrentDate()}.xlsx`;
        if (this.generarExcel(headers, rows, filename)) {
            UI.showToast('Reporte exportado exitosamente', 'success');
        }
    },

    /**
     * Exportar reporte de fechas a Excel
     */
    exportarReporteFecha() {
        if (!this.datosReporteFecha || this.datosReporteFecha.length === 0) {
            UI.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['Fecha', 'N° Ventas', 'Total Vendido', 'Promedio', 'Venta Mínima', 'Venta Máxima'];

        const getNum = (val) => {
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        const rows = this.datosReporteFecha.map(d => [
            d.fecha_venta,
            parseInt(d.num_ventas),
            getNum(d.total_vendido),
            getNum(d.promedio_venta),
            getNum(d.venta_minima),
            getNum(d.venta_maxima)
        ]);

        const filename = `reporte_fechas_${Utils.getCurrentDate()}.xlsx`;
        if (this.generarExcel(headers, rows, filename)) {
            UI.showToast('Reporte exportado exitosamente', 'success');
        }
    }
};

// Hacer Reportes global
window.Reportes = Reportes;
