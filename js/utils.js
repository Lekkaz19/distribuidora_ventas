/**
 * Utilidades generales de la aplicación
 */

const Utils = {
    /**
     * Formatear número a moneda
     */
    formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return CONFIG.CURRENCY.SYMBOL + ' ' + num.toFixed(CONFIG.CURRENCY.DECIMALS)
            .replace(/\B(?=(\d{3})+(?!\d))/g, CONFIG.CURRENCY.THOUSANDS_SEPARATOR);
    },

    /**
     * Formatear fecha
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },

    /**
     * Obtener fecha actual en formato YYYY-MM-DD
     */
    getCurrentDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Obtener fecha formateada para mostrar
     */
    getFormattedCurrentDate() {
        const date = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', options);
    },

    /**
     * Validar email
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Sanitizar HTML para prevenir XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Generar ID único
     */
    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Copiar al portapapeles
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Error al copiar:', err);
            return false;
        }
    },

    /**
     * Descargar archivo
     */
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    /**
     * Validar número
     */
    isValidNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    /**
     * Formatear número
     */
    formatNumber(num, decimals = 2) {
        const number = parseFloat(num) || 0;
        return number.toFixed(decimals);
    },

    /**
     * Obtener parámetro de URL
     */
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    /**
     * Establecer parámetro de URL
     */
    setUrlParameter(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    },

    /**
     * Confirmar acción
     */
    async confirm(message, title = '¿Está seguro?') {
        return new Promise((resolve) => {
            const confirmed = window.confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    },

    /**
     * Capitalizar primera letra
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Truncar texto
     */
    truncate(str, length = 50) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },

    /**
     * Obtener iniciales de nombre
     */
    getInitials(name) {
        if (!name) return '';
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    /**
     * Calcular porcentaje
     */
    calculatePercentage(value, total) {
        if (total === 0) return 0;
        return ((value / total) * 100).toFixed(2);
    },

    /**
     * Ordenar array de objetos
     */
    sortBy(array, key, order = 'asc') {
        return array.sort((a, b) => {
            const valueA = a[key];
            const valueB = b[key];

            if (order === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });
    },

    /**
     * Agrupar array por propiedad
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },

    /**
     * Sumar valores de array
     */
    sum(array, key) {
        return array.reduce((total, item) => {
            return total + (parseFloat(item[key]) || 0);
        }, 0);
    },

    /**
     * Promedio de valores
     */
    average(array, key) {
        if (array.length === 0) return 0;
        return this.sum(array, key) / array.length;
    },

    /**
     * Filtrar array por búsqueda
     */
    search(array, searchTerm, keys) {
        if (!searchTerm) return array;

        const term = searchTerm.toLowerCase();
        return array.filter(item => {
            return keys.some(key => {
                const value = String(item[key] || '').toLowerCase();
                return value.includes(term);
            });
        });
    },

    /**
     * Esperar tiempo
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Hacer Utils global
window.Utils = Utils;
