const axios = require('axios');
const database = require('../database/database');

class CurrencyService {
  /**
   * Convert amount from one currency to another using real-time exchange rates
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency (e.g., 'USD')
   * @param {string} toCurrency - Target currency (e.g., 'RWF')
   * @returns {Promise<Object>} Conversion result with rate and converted amount
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      // If same currency, return as is
      if (fromCurrency === toCurrency) {
        return {
          amount: parseFloat(amount),
          converted_amount: parseFloat(amount),
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: 1,
          source: 'same_currency'
        };
      }

      // Get exchange rate from database (cached for 1 hour)
      const rate = await database.get(
        'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ? AND last_updated > NOW() - INTERVAL \'1 hour\'',
        [fromCurrency, toCurrency]
      );

      if (rate) {
        const convertedAmount = amount * rate.rate;
        return {
          amount: parseFloat(amount),
          converted_amount: parseFloat(convertedAmount.toFixed(2)),
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: parseFloat(rate.rate),
          source: 'cache'
        };
      }

      // Try reverse rate
      const reverseRate = await database.get(
        'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ? AND last_updated > NOW() - INTERVAL \'1 hour\'',
        [toCurrency, fromCurrency]
      );

      if (reverseRate) {
        const convertedAmount = amount / reverseRate.rate;
        return {
          amount: parseFloat(amount),
          converted_amount: parseFloat(convertedAmount.toFixed(2)),
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: parseFloat((1 / reverseRate.rate).toFixed(6)),
          source: 'reverse_cache'
        };
      }

      // If no cached rate, fetch fresh rate
      return await this.fetchAndConvert(amount, fromCurrency, toCurrency);

    } catch (error) {
      console.error('Currency conversion error:', error);
      throw new Error(`Failed to convert ${amount} ${fromCurrency} to ${toCurrency}: ${error.message}`);
    }
  }

  /**
   * Fetch fresh exchange rates and convert
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Object>} Conversion result
   */
  async fetchAndConvert(amount, fromCurrency, toCurrency) {
    try {
      const apiKey = process.env.EXCHANGE_RATE_API_KEY;
      if (!apiKey) {
        throw new Error('Exchange rate API key not configured');
      }

      // Fetch fresh rates
      const response = await axios.get(`${process.env.EXCHANGE_RATE_BASE_URL}/latest/${fromCurrency}`);
      const rates = response.data.rates;

      // Store rates in database
      const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AED', 'CAD', 'AUD', 'CHF', 'RWF'];
      
      for (const [currency, rate] of Object.entries(rates)) {
        if (supportedCurrencies.includes(currency)) {
          await database.run(
            `INSERT INTO exchange_rates (id, base_currency, target_currency, rate, last_updated) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (base_currency, target_currency) DO UPDATE SET
             rate = EXCLUDED.rate, last_updated = EXCLUDED.last_updated`,
            [require('uuid').v4(), fromCurrency, currency, rate]
          );
        }
      }

      // Get the specific rate we need
      const targetRate = rates[toCurrency];
      if (!targetRate) {
        throw new Error(`Exchange rate for ${toCurrency} not available`);
      }

      const convertedAmount = amount * targetRate;

      return {
        amount: parseFloat(amount),
        converted_amount: parseFloat(convertedAmount.toFixed(2)),
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: parseFloat(targetRate),
        source: 'api'
      };

    } catch (error) {
      console.error('Fetch and convert error:', error);
      throw error;
    }
  }

  /**
   * Convert USD costs to RWF for Smart Bottling pricing
   * @param {Object} costBreakdown - Cost breakdown in USD
   * @returns {Promise<Object>} Cost breakdown converted to RWF
   */
  async convertBottlingCostsToRWF(costBreakdown) {
    try {
      const usdToRwfRate = await this.convertCurrency(1, 'USD', 'RWF');
      const rate = usdToRwfRate.rate;

      const rwfCostBreakdown = {
        ...costBreakdown,
        // Convert all USD amounts to RWF (using thousands for smaller numbers)
        perfume_cost: Math.round((costBreakdown.perfume_cost * rate) / 1000),
        bottle_cost: Math.round((costBreakdown.bottle_cost * rate) / 1000),
        cap_cost: Math.round((costBreakdown.cap_cost * rate) / 1000),
        label_cost: Math.round((costBreakdown.label_cost * rate) / 1000),
        labor_cost: Math.round((costBreakdown.labor_cost * rate) / 1000),
        overhead_cost: Math.round((costBreakdown.overhead_cost * rate) / 1000),
        total_cost: Math.round((costBreakdown.total_cost * rate) / 1000),
        unit_cost: Math.round((costBreakdown.unit_cost * rate) / 1000),
        // Convert materials used
        materials_used: costBreakdown.materials_used.map(material => ({
          ...material,
          unit_cost: Math.round((material.unit_cost * rate) / 1000),
          total_cost: Math.round((material.total_cost * rate) / 1000)
        })),
        // Add currency info
        original_currency: 'USD',
        converted_currency: 'RWF',
        exchange_rate: rate,
        conversion_date: new Date().toISOString(),
        unit_multiplier: 1000 // Indicates values are in thousands of RWF
      };

      return rwfCostBreakdown;

    } catch (error) {
      console.error('Convert bottling costs to RWF error:', error);
      // Fallback to fixed rate if API fails
      const fallbackRate = 1450; // Approximate USD to RWF rate
      console.warn(`Using fallback exchange rate: 1 USD = ${fallbackRate} RWF`);
      
      return this.convertWithFixedRate(costBreakdown, fallbackRate);
    }
  }

  /**
   * Convert costs using a fixed exchange rate (fallback)
   * @param {Object} costBreakdown - Cost breakdown in USD
   * @param {number} rate - Fixed exchange rate
   * @returns {Object} Cost breakdown converted to RWF
   */
  convertWithFixedRate(costBreakdown, rate) {
    return {
      ...costBreakdown,
      perfume_cost: Math.round((costBreakdown.perfume_cost * rate) / 1000),
      bottle_cost: Math.round((costBreakdown.bottle_cost * rate) / 1000),
      cap_cost: Math.round((costBreakdown.cap_cost * rate) / 1000),
      label_cost: Math.round((costBreakdown.label_cost * rate) / 1000),
      labor_cost: Math.round((costBreakdown.labor_cost * rate) / 1000),
      overhead_cost: Math.round((costBreakdown.overhead_cost * rate) / 1000),
      total_cost: Math.round((costBreakdown.total_cost * rate) / 1000),
      unit_cost: Math.round((costBreakdown.unit_cost * rate) / 1000),
      materials_used: costBreakdown.materials_used.map(material => ({
        ...material,
        unit_cost: Math.round((material.unit_cost * rate) / 1000),
        total_cost: Math.round((material.total_cost * rate) / 1000)
      })),
      original_currency: 'USD',
      converted_currency: 'RWF',
      exchange_rate: rate,
      conversion_date: new Date().toISOString(),
      unit_multiplier: 1000,
      source: 'fallback'
    };
  }

  /**
   * Get current USD to RWF exchange rate
   * @returns {Promise<number>} Current exchange rate
   */
  async getUSDtoRWFRate() {
    try {
      const conversion = await this.convertCurrency(1, 'USD', 'RWF');
      return conversion.rate;
    } catch (error) {
      console.error('Get USD to RWF rate error:', error);
      return 1450; // Fallback rate
    }
  }
}

module.exports = new CurrencyService();
