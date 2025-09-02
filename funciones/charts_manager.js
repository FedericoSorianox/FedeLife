/**
 * 📊 CHARTS MANAGER - GESTOR DE GRÁFICOS INTERACTIVOS
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Módulo para crear y gestionar gráficos interactivos con Chart.js
 * Incluye gráficos de torta para análisis de finanzas por categorías
 * Autor: Senior Backend Developer
 */

// ==================== CLASE PRINCIPAL ====================

/**
 * Gestor de gráficos interactivos para análisis financiero
 * Maneja la creación, actualización y gestión de gráficos con Chart.js
 */
export class ChartsManager {
    constructor() {
        this.expensesChart = null;
        this.incomeChart = null;
        this.currentPeriod = 'current-month';
        this.chartColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
            '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ];
        
        this.initializeCharts();
    }

    /**
     * Inicializa los gráficos
     */
    initializeCharts() {
        try {
            // Verificar que Chart.js esté disponible
            if (typeof Chart === 'undefined') {
                console.error('❌ Chart.js no está disponible');
                return;
            }

            // Configurar Chart.js globalmente
            Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#333';

            console.log('✅ ChartsManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando ChartsManager:', error);
        }
    }

    /**
     * Crea el gráfico de gastos por categoría
     * @param {Array} data - Datos de gastos por categoría
     */
    createExpensesChart(data) {
        try {
            const ctx = document.getElementById('expensesChart');
            if (!ctx) {
                console.error('❌ Canvas de gastos no encontrado');
                return;
            }

            // Destruir gráfico existente si hay uno
            if (this.expensesChart) {
                this.expensesChart.destroy();
            }

            const chartData = this.prepareChartData(data, 'Gastos');
            
            this.expensesChart = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: this.getChartOptions('Gastos por Categoría')
            });

            // Crear leyenda personalizada
            this.createLegend('expensesLegend', data);

            console.log('✅ Gráfico de gastos creado');
        } catch (error) {
            console.error('❌ Error creando gráfico de gastos:', error);
        }
    }

    /**
     * Crea el gráfico de ingresos por categoría
     * @param {Array} data - Datos de ingresos por categoría
     */
    createIncomeChart(data) {
        try {
            const ctx = document.getElementById('incomeChart');
            if (!ctx) {
                console.error('❌ Canvas de ingresos no encontrado');
                return;
            }

            // Destruir gráfico existente si hay uno
            if (this.incomeChart) {
                this.incomeChart.destroy();
            }

            const chartData = this.prepareChartData(data, 'Ingresos');
            
            this.incomeChart = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: this.getChartOptions('Ingresos por Categoría')
            });

            // Crear leyenda personalizada
            this.createLegend('incomeLegend', data);

            console.log('✅ Gráfico de ingresos creado');
        } catch (error) {
            console.error('❌ Error creando gráfico de ingresos:', error);
        }
    }

    /**
     * Prepara los datos para el gráfico
     * @param {Array} data - Datos de categorías
     * @param {string} type - Tipo de datos (Gastos/Ingresos)
     * @returns {Object} Datos formateados para Chart.js
     */
    prepareChartData(data, type) {
        const labels = data.map(item => item.name);
        const values = data.map(item => item.total);
        const colors = data.map((item, index) => item.color || this.chartColors[index % this.chartColors.length]);

        return {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => this.adjustBrightness(color, -20)),
                borderWidth: 2
            }]
        };
    }

    /**
     * Obtiene las opciones de configuración del gráfico
     * @param {string} title - Título del gráfico
     * @returns {Object} Opciones de configuración
     */
    getChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Usamos leyenda personalizada
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toLocaleString('es-AR')} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        };
    }

    /**
     * Crea una leyenda personalizada para el gráfico
     * @param {string} containerId - ID del contenedor de la leyenda
     * @param {Array} data - Datos de las categorías
     */
    createLegend(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        data.forEach((item, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'chart-legend-item';
            legendItem.style.display = 'flex';
            legendItem.style.alignItems = 'center';
            legendItem.style.marginBottom = '8px';
            legendItem.style.cursor = 'pointer';

            const colorBox = document.createElement('div');
            colorBox.style.width = '16px';
            colorBox.style.height = '16px';
            colorBox.style.backgroundColor = item.color || this.chartColors[index % this.chartColors.length];
            colorBox.style.marginRight = '8px';
            colorBox.style.borderRadius = '3px';

            const label = document.createElement('span');
            label.textContent = `${item.name}: $${item.total.toLocaleString('es-AR')}`;
            label.style.fontSize = '14px';
            label.style.color = '#333';

            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            container.appendChild(legendItem);

            // Agregar interactividad
            legendItem.addEventListener('click', () => {
                this.highlightChartSection(item.name);
            });
        });
    }

    /**
     * Destaca una sección específica del gráfico
     * @param {string} categoryName - Nombre de la categoría a destacar
     */
    highlightChartSection(categoryName) {
        const chart = this.expensesChart || this.incomeChart;
        if (!chart) return;

        // Encontrar el índice de la categoría
        const index = chart.data.labels.indexOf(categoryName);
        if (index === -1) return;

        // Simular hover en la sección
        const element = chart.getDatasetMeta(0).data[index];
        if (element && chart.tooltip) {
            chart.setActiveElements([{
                datasetIndex: 0,
                index: index
            }]);
            chart.tooltip.setActiveElements([{
                datasetIndex: 0,
                index: index
            }], {
                x: element.x,
                y: element.y
            });
            chart.update();
        }
    }

    /**
     * Actualiza ambos gráficos con nuevos datos
     * @param {Array} expensesData - Datos de gastos
     * @param {Array} incomeData - Datos de ingresos
     * @param {string} period - Período seleccionado
     */
    updateCharts(expensesData, incomeData, period) {
        try {
            this.currentPeriod = period;
            
            // Actualizar gráficos
            this.createExpensesChart(expensesData);
            this.createIncomeChart(incomeData);

            console.log(`✅ Gráficos actualizados para período: ${period}`);
        } catch (error) {
            console.error('❌ Error actualizando gráficos:', error);
        }
    }

    /**
     * Destruye todos los gráficos
     */
    destroyCharts() {
        if (this.expensesChart) {
            this.expensesChart.destroy();
            this.expensesChart = null;
        }
        if (this.incomeChart) {
            this.incomeChart.destroy();
            this.incomeChart = null;
        }
    }

    /**
     * Obtiene el período actual
     * @returns {string} Período actual
     */
    getCurrentPeriod() {
        return this.currentPeriod;
    }

    // ==================== FUNCIONES DE UTILIDAD ====================

    /**
     * Formatea un número como moneda
     * @param {number} amount - Monto a formatear
     * @returns {string} String formateado
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Ajusta el brillo de un color
     * @param {string} color - Color en formato hexadecimal
     * @param {number} percent - Porcentaje de ajuste (-100 a 100)
     * @returns {string} Color ajustado
     */
    adjustBrightness(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
}

// Crear instancia global
const chartsManager = new ChartsManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.chartsManager = chartsManager;
}

export default chartsManager;
