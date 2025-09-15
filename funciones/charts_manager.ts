/**
 * 📊 CHARTS MANAGER - GESTOR DE GRÁFICOS INTERACTIVOS
 * 
 * Módulo para crear y gestionar gráficos interactivos con Chart.js
 * Incluye gráficos de torta para análisis de finanzas por categorías
 * Autor: Senior Backend Developer
 */

// ==================== IMPORTS ====================
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js/auto';

// ==================== INTERFACES Y TIPOS ====================

/**
 * Interface para datos de gráfico
 */
interface ChartData {
    labels: string[];
    datasets: {
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
    }[];
}

/**
 * Interface para datos de categoría con total
 */
interface CategoryData {
    name: string;
    total: number;
    color: string;
    percentage: number;
}

/**
 * Períodos disponibles para los gráficos
 */
type ChartPeriod = 'current-month' | 'last-month' | 'last-3-months' | 'current-year' | 'all-time';

/**
 * Interface para configuración de gráfico
 */
interface ChartConfig {
    type: 'pie' | 'doughnut' | 'bar';
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
        legend: {
            display: boolean;
            position?: 'top' | 'bottom' | 'left' | 'right';
        };
        tooltip: {
            enabled: boolean;
            callbacks: {
                label: (context: any) => string;
            };
        };
    };
    animation: {
        duration: number;
        easing: string;
    };
}

// ==================== CLASE PRINCIPAL ====================

/**
 * Gestor de gráficos interactivos para análisis financiero
 * Maneja la creación, actualización y gestión de gráficos con Chart.js
 */
export class ChartsManager {
    private expensesChart: Chart | null = null;
    private incomeChart: Chart | null = null;
    private currentPeriod: ChartPeriod = 'current-month';
    private chartColors: string[] = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
        '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
    ];

    constructor() {
        this.initializeCharts();
    }

    /**
     * Inicializa los gráficos
     */
    private initializeCharts(): void {
        try {
            // Verificar que Chart.js esté disponible
            if (typeof Chart === 'undefined') {
                return;
            }

            // Configurar Chart.js globalmente
            Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#333';

        } catch (error) {
        }
    }

    /**
     * Crea el gráfico de gastos por categoría
     * @param data - Datos de gastos por categoría
     */
    public createExpensesChart(data: CategoryData[]): void {
        try {
            const ctx = document.getElementById('expensesChart') as HTMLCanvasElement;
            if (!ctx) {
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

        } catch (error) {
        }
    }

    /**
     * Crea el gráfico de ingresos por categoría
     * @param data - Datos de ingresos por categoría
     */
    public createIncomeChart(data: CategoryData[]): void {
        try {
            const ctx = document.getElementById('incomeChart') as HTMLCanvasElement;
            if (!ctx) {
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

        } catch (error) {
        }
    }

    /**
     * Prepara los datos para el gráfico
     * @param data - Datos de categorías
     * @param type - Tipo de datos (Gastos/Ingresos)
     * @returns Datos formateados para Chart.js
     */
    private prepareChartData(data: CategoryData[], type: string): ChartData {
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
     * @param title - Título del gráfico
     * @returns Configuración de opciones
     */
    private getChartOptions(title: string): ChartOptions<'pie'> {
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
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${this.formatCurrency(value)} (${percentage}%)`;
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
     * Crea una leyenda personalizada
     * @param containerId - ID del contenedor de la leyenda
     * @param data - Datos de categorías
     */
    private createLegend(containerId: string, data: CategoryData[]): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        data.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${item.color}"></div>
                <span class="legend-text">${item.name}</span>
                <span class="legend-amount">$${this.formatCurrency(item.total)}</span>
            `;

            // Agregar evento click para resaltar sección del gráfico
            legendItem.addEventListener('click', () => {
                this.highlightChartSection(containerId === 'expensesLegend' ? 'expenses' : 'income', item.name);
            });

            container.appendChild(legendItem);
        });
    }

    /**
     * Resalta una sección específica del gráfico
     * @param chartType - Tipo de gráfico (expenses/income)
     * @param categoryName - Nombre de la categoría
     */
    private highlightChartSection(chartType: 'expenses' | 'income', categoryName: string): void {
        const chart = chartType === 'expenses' ? this.expensesChart : this.incomeChart;
        if (!chart || !chart.data.labels) return;

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
     * @param expensesData - Datos de gastos
     * @param incomeData - Datos de ingresos
     * @param period - Período seleccionado
     */
    public updateCharts(expensesData: CategoryData[], incomeData: CategoryData[], period: ChartPeriod): void {
        try {
            this.currentPeriod = period;
            
            // Actualizar gráficos
            this.createExpensesChart(expensesData);
            this.createIncomeChart(incomeData);

        } catch (error) {
        }
    }

    /**
     * Destruye todos los gráficos
     */
    public destroyCharts(): void {
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
     * @returns Período actual
     */
    public getCurrentPeriod(): ChartPeriod {
        return this.currentPeriod;
    }

    // ==================== FUNCIONES DE UTILIDAD ====================

    /**
     * Formatea un número como moneda
     * @param amount - Monto a formatear
     * @returns String formateado
     */
    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Ajusta el brillo de un color
     * @param color - Color en formato hexadecimal
     * @param percent - Porcentaje de ajuste (-100 a 100)
     * @returns Color ajustado
     */
    private adjustBrightness(color: string, percent: number): string {
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
