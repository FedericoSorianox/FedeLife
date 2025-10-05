/**
 * 💱 SERVICIO DE TASAS DE CAMBIO PARA NEXT.JS
 *
 * Servicio simplificado de tasas de cambio para usar en Next.js API Routes
 */

import mongoose from 'mongoose';

// Modelo de tasas de cambio
const exchangeRateSchema = new mongoose.Schema({
  fromCurrency: { type: String, required: true, enum: ['UYU', 'USD'] },
  toCurrency: { type: String, required: true, enum: ['UYU', 'USD'] },
  rate: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  source: { type: String, required: true, default: 'api' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Índice compuesto
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, date: -1 });

const ExchangeRate = mongoose.models.ExchangeRate || mongoose.model('ExchangeRate', exchangeRateSchema);

class ExchangeRateService {
  private cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private cacheExpiry: number = 30 * 60 * 1000; // 30 minutos

  /**
   * Obtener tasa de cambio entre dos monedas
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string, date: Date = new Date()): Promise<number> {
    try {
      // Si es la misma moneda, retornar 1
      if (fromCurrency === toCurrency) {
        return 1;
      }

      // Verificar cache
      const cacheKey = `${fromCurrency}_${toCurrency}_${date.toDateString()}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          console.log(`💱 Cache hit: ${fromCurrency} -> ${toCurrency}`);
          return cached.rate;
        }
      }

      // Buscar en base de datos
      const rateDoc = await ExchangeRate.findOne({
        fromCurrency,
        toCurrency,
        date: {
          $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        },
        isActive: true
      }).sort({ date: -1 });

      if (rateDoc) {
        // Cachear resultado
        this.cache.set(cacheKey, { rate: rateDoc.rate, timestamp: Date.now() });
        console.log(`💱 DB hit: ${fromCurrency} -> ${toCurrency} = ${rateDoc.rate}`);
        return rateDoc.rate;
      }

      // Si no hay en DB, obtener de API externa (simplificado)
      const fallbackRate = await this.getFallbackRate(fromCurrency, toCurrency);

      // Guardar en DB para futuras consultas
      await new ExchangeRate({
        fromCurrency,
        toCurrency,
        rate: fallbackRate,
        date,
        source: 'api'
      }).save();

      // Cachear resultado
      this.cache.set(cacheKey, { rate: fallbackRate, timestamp: Date.now() });

      console.log(`💱 API call: ${fromCurrency} -> ${toCurrency} = ${fallbackRate}`);
      return fallbackRate;

    } catch (error) {
      console.error('Error getting exchange rate:', error);

      // Fallback rates aproximadas
      if (fromCurrency === 'UYU' && toCurrency === 'USD') return 0.025;
      if (fromCurrency === 'USD' && toCurrency === 'UYU') return 40;
      return 1;
    }
  }

  /**
   * Obtener tasa de cambio de API externa (simplificado)
   */
  private async getFallbackRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      // Tasas aproximadas para demo
      if (fromCurrency === 'UYU' && toCurrency === 'USD') {
        // Simular llamada a API
        return 0.025 + (Math.random() * 0.005 - 0.0025); // Entre 0.0225 y 0.0275
      }
      if (fromCurrency === 'USD' && toCurrency === 'UYU') {
        return 40 + (Math.random() * 4 - 2); // Entre 38 y 42
      }
      return 1;
    } catch (error) {
      console.error('Error getting fallback rate:', error);
      return 1;
    }
  }
}

// Exportar instancia singleton
export const exchangeRateService = new ExchangeRateService();
