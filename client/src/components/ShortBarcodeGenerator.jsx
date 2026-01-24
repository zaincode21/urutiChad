import React, { useState, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Barcode, Download, Copy, X, RefreshCw, Zap } from 'lucide-react';
import TranslatedText from './TranslatedText';

const ShortBarcodeGenerator = ({ onGenerate, onClose, isOpen, productName = '', sizeMl = 0 }) => {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeType, setBarcodeType] = useState('CODE128');
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const canvasRef = useRef(null);

  // Generate short barcode value based on product info
  useEffect(() => {
    if (isOpen && !barcodeValue) {
      const shortBarcode = generateShortBarcode(productName, sizeMl);
      setBarcodeValue(shortBarcode);
    }
  }, [isOpen, barcodeValue, productName, sizeMl]);

  // Generate barcode when value or type changes
  useEffect(() => {
    if (barcodeValue && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, barcodeValue, {
          format: barcodeType,
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 12,
          margin: 8,
          background: '#ffffff',
          lineColor: '#000000'
        });
        setGeneratedBarcode(barcodeValue);
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [barcodeValue, barcodeType]);

  const generateShortBarcode = (name, size) => {
    // Generate 6-digit barcode
    const random6Digits = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
    return random6Digits.toString();
  };

  const handleGenerateNew = () => {
    const newValue = generateShortBarcode(productName, sizeMl);
    setBarcodeValue(newValue);
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue).then(() => {
      // You can add a toast notification here if needed
    });
  };

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `short-barcode-${barcodeValue}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const handleUseBarcode = () => {
    onGenerate(barcodeValue);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Short Barcode Generator" /></h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Product Info */}
          {(productName || sizeMl) && (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Product Information</h4>
              {productName && (
                <p className="text-sm text-yellow-700">Name: {productName}</p>
              )}
              {sizeMl && (
                <p className="text-sm text-yellow-700">Size: {sizeMl}ml</p>
              )}
              <p className="text-xs text-yellow-600 mt-1">
                💡 Short barcodes are optimized for labeling (8 characters max)
              </p>
            </div>
          )}

          {/* Barcode Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Type
            </label>
            <select
              value={barcodeType}
              onChange={(e) => setBarcodeType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="CODE128">Code 128</option>
              <option value="CODE39">Code 39</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPC">UPC</option>
            </select>
          </div>

          {/* Barcode Value Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Barcode Value
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter short barcode value"
                maxLength={8}
              />
              <button
                type="button"
                onClick={handleGenerateNew}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                title="Generate new short barcode"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Format: [2-char prefix][2-digit size][4-digit timestamp] = 8 characters
            </p>
          </div>

          {/* Barcode Display */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <canvas
                ref={canvasRef}
                className="mx-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleCopyBarcode}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>

          {/* Use Barcode Button */}
          <button
            onClick={handleUseBarcode}
            className="w-full flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            <Barcode className="h-5 w-5 mr-2" />
            Use This Short Barcode
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortBarcodeGenerator;
