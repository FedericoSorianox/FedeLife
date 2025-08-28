/**
 * 💱 SERVICIO DE TASAS DE CAMBIO - MONGODB
 * 
 * Servicio para obtener y gestionar tasas de cambio entre monedas
 * Incluye cache local, API externa y conversiones automáticas
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');
const axios = require('axios');

// ==================== MODELO DE TASAS DE CAMBIO ====================

const exchangeRateSchema = new mongoose.Schema({
    // Moneda base (desde)
    fromCurrency: {
        type: String,
        required: true,
        enum: ['UYU', 'USD'],
        index: true
    },
    
    // Moneda objetivo (hacia)
    toCurrency: {
        type: String,
        required: true,
        enum: ['UYU', 'USD'],
        index: true
    },
    
    // Tasa de cambio
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Fecha de la tasa
    date: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    
    // Fuente de la tasa
    source: {
        type: String,
        required: true,
        default: 'api'
    },
    
    // Si la tasa está activa
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índice compuesto para búsquedas eficientes
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, date: -1 });
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, isActive: 1 });

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

// ==================== CLASE DE SERVICIO ====================

class ExchangeRateService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutos
        this.apiKey = process.env.EXCHANGE_RATE_API_KEY || 'demo';
        this.baseUrl = 'https://api.exchangerate-api.com/v4/latest';
    }

    /**
     * 🔄 Obtener tasa de cambio entre dos monedas
     * @param {string} fromCurrency - Moneda origen
     * @param {string} toCurrency - Moneda destino
     * @param {Date} date - Fecha (opcional, por defecto hoy)
     * @returns {Promise<number>} Tasa de cambio
     */
    async getExchangeRate(fromCurrency, toCurrency, date = new Date()) {
        try {
            // Si es la misma moneda, retornar 1
            if (fromCurrency === toCurrency) {
                return 1;
            }

            // Verificar cache
            const cacheKey = `${fromCurrency}_${toCurrency}_${date.toDateString()}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    console.log(`💱 Cache hit: ${fromCurrency} -> ${toCurrency}`);
                    return cached.rate;
                }
            }

            // Buscar en base de datos
            let rate = await this.getFromDatabase(fromCurrency, toCurrency, date);
            
            if (!rate) {
                // Obtener de API externa
                rate = await this.fetchFromAPI(fromCurrency, toCurrency, date);
                
                // Guardar en base de datos
                await this.saveToDatabase(fromCurrency, toCurrency, rate, date);
            }

            // Guardar en cache
            this.cache.set(cacheKey, {
                rate: rate,
                timestamp: Date.now()
            });

            return rate;

        } catch (error) {
            console.error('❌ Error obteniendo tasa de cambio:', error);
            
            // Retornar tasa por defecto si hay error
            return this.getDefaultRate(fromCurrency, toCurrency);
        }
    }

    /**
     * 🗄️ Obtener tasa de la base de datos
     */
    async getFromDatabase(fromCurrency, toCurrency, date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const rate = await ExchangeRate.findOne({
                fromCurrency,
                toCurrency,
                date: { $gte: startOfDay, $lte: endOfDay },
                isActive: true
            }).sort({ date: -1 });

            return rate ? rate.rate : null;

        } catch (error) {
            console.error('❌ Error consultando base de datos:', error);
            return null;
        }
    }

    /**
     * 🌐 Obtener tasa de API externa
     */
    async fetchFromAPI(fromCurrency, toCurrency, date) {
        try {
            console.log(`🌐 Obteniendo tasa de API: ${fromCurrency} -> ${toCurrency}`);
            
            // Usar API gratuita de exchangerate-api.com
            const response = await axios.get(`${this.baseUrl}/${fromCurrency}`);
            
            if (response.data && response.data.rates && response.data.rates[toCurrency]) {
                return response.data.rates[toCurrency];
            }

            throw new Error('Tasa no encontrada en la respuesta de la API');

        } catch (error) {
            console.error('❌ Error en API externa:', error);
            throw error;
        }
    }

    /**
     * 💾 Guardar tasa en base de datos
     */
    async saveToDatabase(fromCurrency, toCurrency, rate, date) {
        try {
            const exchangeRate = new ExchangeRate({
                fromCurrency,
                toCurrency,
                rate,
                date,
                source: 'api'
            });

            await exchangeRate.save();
            console.log(`💾 Tasa guardada: ${fromCurrency} -> ${toCurrency} = ${rate}`);

        } catch (error) {
            console.error('❌ Error guardando tasa:', error);
        }
    }

    /**
     * 🔄 Convertir monto entre monedas
     * @param {number} amount - Monto a convertir
     * @param {string} fromCurrency - Moneda origen
     * @param {string} toCurrency - Moneda destino
     * @param {Date} date - Fecha (opcional)
     * @returns {Promise<number>} Monto convertido
     */
    async convertAmount(amount, fromCurrency, toCurrency, date = new Date()) {
        try {
            const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
            return amount * rate;

        } catch (error) {
            console.error('❌ Error convirtiendo monto:', error);
            return amount; // Retornar monto original si hay error
        }
    }

    /**
     * 📊 Obtener tasas para múltiples monedas
     * @param {string} baseCurrency - Moneda base
     * @param {string[]} targetCurrencies - Monedas objetivo
     * @returns {Promise<Object>} Objeto con tasas
     */
    async getMultipleRates(baseCurrency, targetCurrencies) {
        try {
            const rates = {};
            
            for (const targetCurrency of targetCurrencies) {
                if (targetCurrency !== baseCurrency) {
                    rates[targetCurrency] = await this.getExchangeRate(baseCurrency, targetCurrency);
                } else {
                    rates[targetCurrency] = 1;
                }
            }

            return rates;

        } catch (error) {
            console.error('❌ Error obteniendo múltiples tasas:', error);
            return {};
        }
    }

    /**
     * 🏦 Tasas por defecto (para casos de emergencia)
     */
    getDefaultRate(fromCurrency, toCurrency) {
        const defaultRates = {
            'USD_UYU': 40.0,    // 1 USD = 40 UYU (aproximado)
            'UYU_USD': 0.025    // 1 UYU = 0.025 USD
        };

        const key = `${fromCurrency}_${toCurrency}`;
        return defaultRates[key] || 1;
    }

    /**
     * 🧹 Limpiar cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache limpiado');
    }

    /**
     * 📈 Obtener historial de tasas
     * @param {string} fromCurrency - Moneda origen
     * @param {string} toCurrency - Moneda destino
     * @param {number} days - Días de historial
     * @returns {Promise<Array>} Historial de tasas
     */
    async getRateHistory(fromCurrency, toCurrency, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const history = await ExchangeRate.find({
                fromCurrency,
                toCurrency,
                date: { $gte: startDate },
                isActive: true
            }).sort({ date: 1 }).select('rate date');

            return history;

        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            return [];
        }
    }
}

// ==================== INSTANCIA GLOBAL ====================

const exchangeRateService = new ExchangeRateService();

module.exports = {
    ExchangeRate,
    ExchangeRateService,
    exchangeRateService
};
