const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all supported currencies
router.get('/supported', async (req, res) => {
  try {
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CFA', name: 'Central African CFA Franc', symbol: 'FCFA' }
    ];

    res.json({ currencies });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current exchange rates
router.get('/rates', async (req, res) => {
  try {
    const { base = 'USD' } = req.query;

    // Get cached rates from database
    const cachedRates = await database.all(
      'SELECT * FROM exchange_rates WHERE base_currency = $1 AND last_updated > NOW() - INTERVAL \'1 hour\'',
      [base]
    );

    if (cachedRates.length > 0) {
      return res.json({
        base_currency: base,
        rates: cachedRates,
        source: 'cache'
      });
    }

    // Fetch fresh rates from API
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Exchange rate API key not configured' });
    }

    const response = await axios.get(`${process.env.EXCHANGE_RATE_BASE_URL}/latest/${base}`);
    const rates = response.data.rates;

    // Store rates in database
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AED', 'CAD', 'AUD', 'CHF', 'RWF'];

    for (const [currency, rate] of Object.entries(rates)) {
      if (supportedCurrencies.includes(currency)) {
        const rateId = uuidv4();
        await database.run(
          `INSERT INTO exchange_rates (id, base_currency, target_currency, rate, last_updated) 
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (base_currency, target_currency) DO UPDATE SET
           rate = EXCLUDED.rate, last_updated = EXCLUDED.last_updated`,
          [rateId, base, currency, rate]
        );
      }
    }

    const updatedRates = await database.all(
      'SELECT * FROM exchange_rates WHERE base_currency = $1',
      [base]
    );

    res.json({
      base_currency: base,
      rates: updatedRates,
      source: 'api'
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Convert amount between currencies
router.post('/convert', async (req, res) => {
  try {
    const { amount, from_currency, to_currency } = req.body;

    if (!amount || !from_currency || !to_currency) {
      return res.status(400).json({ error: 'Amount, from_currency, and to_currency are required' });
    }

    if (from_currency === to_currency) {
      return res.json({
        amount: parseFloat(amount),
        converted_amount: parseFloat(amount),
        from_currency,
        to_currency,
        rate: 1
      });
    }

    // Get exchange rate
    const rate = await database.get(
      'SELECT rate FROM exchange_rates WHERE base_currency = $1 AND target_currency = $2 AND last_updated > NOW() - INTERVAL \'1 hour\'',
      [from_currency, to_currency]
    );

    if (!rate) {
      // Try reverse rate
      const reverseRate = await database.get(
        'SELECT rate FROM exchange_rates WHERE base_currency = $1 AND target_currency = $2 AND last_updated > NOW() - INTERVAL \'1 hour\'',
        [to_currency, from_currency]
      );

      if (reverseRate) {
        const convertedAmount = amount / reverseRate.rate;
        return res.json({
          amount: parseFloat(amount),
          converted_amount: parseFloat(convertedAmount.toFixed(2)),
          from_currency,
          to_currency,
          rate: parseFloat((1 / reverseRate.rate).toFixed(6))
        });
      }

      return res.status(400).json({ error: 'Exchange rate not available' });
    }

    const convertedAmount = amount * rate.rate;

    res.json({
      amount: parseFloat(amount),
      converted_amount: parseFloat(convertedAmount.toFixed(2)),
      from_currency,
      to_currency,
      rate: parseFloat(rate.rate)
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update exchange rates manually (admin only)
router.post('/update-rates', auth, async (req, res) => {
  try {
    const { base_currency = 'USD' } = req.body;

    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Exchange rate API key not configured' });
    }

    const response = await axios.get(`${process.env.EXCHANGE_RATE_BASE_URL}/latest/${base_currency}`);
    const rates = response.data.rates;

    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AED', 'CAD', 'AUD', 'CHF', 'CFA'];

    for (const [currency, rate] of Object.entries(rates)) {
      if (supportedCurrencies.includes(currency)) {
        const rateId = uuidv4();
        await database.run(
          `INSERT INTO exchange_rates (id, base_currency, target_currency, rate, last_updated) 
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (base_currency, target_currency) DO UPDATE SET
           rate = EXCLUDED.rate, last_updated = EXCLUDED.last_updated`,
          [rateId, base_currency, currency, rate]
        );
      }
    }

    res.json({
      message: 'Exchange rates updated successfully',
      base_currency,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update rates error:', error);
    res.status(500).json({ error: 'Failed to update exchange rates' });
  }
});

// Get RWF conversion rates for all supported currencies
router.get('/rwf-rates', async (req, res) => {
  try {
    // Get current RWF rates from USD base
    const rwfRates = await database.all(`
      SELECT 
        target_currency as currency,
        rate as usd_rate,
        CASE 
          WHEN target_currency = 'USD' THEN 1
          ELSE rate
        END as rwf_rate
      FROM exchange_rates 
      WHERE base_currency = 'USD' 
        AND target_currency IN ('USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AED', 'CAD', 'AUD', 'CHF')
        AND last_updated > NOW() - INTERVAL '1 hour'
      ORDER BY target_currency
    `);

    // Add RWF itself
    rwfRates.push({
      currency: 'RWF',
      usd_rate: 1,
      rwf_rate: 1
    });

    res.json({
      rwf_rates: rwfRates,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get RWF rates error:', error);
    res.status(500).json({ error: 'Failed to fetch RWF conversion rates' });
  }
});

// Get currency statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await database.all(`
      SELECT 
        currency,
        COUNT(*) as usage_count,
        SUM(total_amount) as total_volume,
        AVG(total_amount) as avg_amount
      FROM orders 
      WHERE currency IS NOT NULL 
      GROUP BY currency
      ORDER BY total_volume DESC
    `);

    res.json({ stats });
  } catch (error) {
    console.error('Currency stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 