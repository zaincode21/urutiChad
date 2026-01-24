import React, { useState } from 'react';
import { ArrowRightLeft, DollarSign, Info } from 'lucide-react';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import CurrencyInput from './CurrencyInput';
import TranslatedText from './TranslatedText';

const CurrencyConversionDemo = () => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const { convertToRwf, formatCurrency, getRwfDisplay } = useCurrencyConversion();

  const convertedAmount = amount ? convertToRwf(parseFloat(amount), currency) : null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center space-x-2 mb-6">
        <DollarSign className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Currency Conversion Demo" /></h3>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">How it works:</span>
          </div>
          <p className="text-xs text-blue-700">
            Enter an amount in any currency (USD, EUR, GBP, etc.) and see the automatic conversion to CFA. 
            Click "Use CFA" to apply the converted amount.
          </p>
        </div>

        <CurrencyInput
          label="Enter Amount"
          value={amount}
          onChange={setAmount}
          onCurrencyChange={setCurrency}
          placeholder="100.00"
          defaultCurrency="USD"
          targetCurrency="CFA"
          showConversion={true}
        />

        {convertedAmount && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  {formatCurrency(parseFloat(amount), currency)} = {formatCurrency(convertedAmount, 'CFA')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          <p>Conversion rates are updated every 5 minutes</p>
          <p>Approximate rates: 1 USD ≈ 1,300 CFA</p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConversionDemo;




