import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currencyAPI } from '../lib/api';

export const useCurrencyConversion = () => {
  const [conversionRates, setConversionRates] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch CFA conversion rates
  const { data: rwfRatesData, isLoading: ratesLoading } = useQuery({
    queryKey: ['rwf-rates'],
    queryFn: () => currencyAPI.getRwfRates(),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000, // Consider data stale after 5 minutes
  });

  useEffect(() => {
    if (rwfRatesData?.rwf_rates) {
      const rates = {};
      rwfRatesData.rwf_rates.forEach(rate => {
        rates[rate.currency] = {
          usd_rate: rate.usd_rate,
          rwf_rate: rate.rwf_rate
        };
      });
      setConversionRates(rates);
      setIsLoading(false);
    }
  }, [rwfRatesData]);

  // Convert amount from any currency to CFA
  const convertToRwf = (amount, fromCurrency) => {
    if (!amount || !fromCurrency) {
      return null;
    }

    if (fromCurrency === 'CFA') {
      return amount;
    }

    // For demo purposes, use approximate rates
    // In production, these would come from the API
    const approximateRates = {
      'USD': 1300, // 1 USD ≈ 1300 CFA
      'EUR': 1400, // 1 EUR ≈ 1400 CFA
      'GBP': 1650, // 1 GBP ≈ 1650 CFA
      'JPY': 8.7,  // 1 JPY ≈ 8.7 CFA
      'CNY': 180,  // 1 CNY ≈ 180 CFA
      'INR': 15.6, // 1 INR ≈ 15.6 CFA
      'AED': 354,  // 1 AED ≈ 354 CFA
      'CAD': 950,  // 1 CAD ≈ 950 CFA
      'AUD': 850,  // 1 AUD ≈ 850 CFA
      'CHF': 1450  // 1 CHF ≈ 1450 CFA
    };

    const rate = approximateRates[fromCurrency];
    if (!rate) return null;

    return parseFloat((amount * rate).toFixed(2));
  };

  // Convert amount from CFA to any currency
  const convertFromRwf = (rwfAmount, toCurrency) => {
    if (!rwfAmount || !toCurrency || !conversionRates[toCurrency]) {
      return null;
    }

    if (toCurrency === 'CFA') {
      return rwfAmount;
    }

    // Convert from CFA through USD
    const usdAmount = rwfAmount / conversionRates['CFA']?.rwf_rate;
    const targetAmount = usdAmount * conversionRates[toCurrency].usd_rate;
    
    return targetAmount ? parseFloat(targetAmount.toFixed(2)) : null;
  };

  // Get formatted currency display
  const formatCurrency = (amount, currency) => {
    if (!amount) return '0.00';
    
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹',
      'AED': 'د.إ',
      'CFA': 'FRw'
    };

    const symbol = symbols[currency] || currency;
    
    if (currency === 'JPY') {
      return `${symbol}${parseInt(amount).toLocaleString()}`;
    }
    
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
  };

  // Get CFA equivalent display
  const getRwfDisplay = (amount, currency) => {
    if (!amount || !currency) return null;
    
    const rwfAmount = convertToRwf(amount, currency);
    if (rwfAmount === null) return null;
    
    return `≈ ${formatCurrency(rwfAmount, 'CFA')}`;
  };

  return {
    conversionRates,
    isLoading: isLoading || ratesLoading,
    convertToRwf,
    convertFromRwf,
    formatCurrency,
    getRwfDisplay,
    lastUpdated: rwfRatesData?.last_updated
  };
};
