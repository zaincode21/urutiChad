import React, { useState, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Barcode, Download, Copy, X, RefreshCw, AlertCircle } from 'lucide-react';
import TranslatedText from './TranslatedText';

const BarcodeGenerator = ({ onGenerate, onClose, isOpen, productName = '', sku = '', canGenerate = true, initialValue = '' }) => {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeType] = useState('CODE128');
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const canvasRef = useRef(null);

  // Set initial barcode value when opening
  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        setBarcodeValue(initialValue);
      } else if (!barcodeValue) {
        // Generate 6-digit barcode
        const random6Digits = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
        setBarcodeValue(random6Digits.toString());
      }
    }
  }, [isOpen, initialValue, barcodeValue, sku]);

  // Generate barcode when value or type changes
  useEffect(() => {
    if (barcodeValue && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, barcodeValue, {
          format: barcodeType,
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        });
        setGeneratedBarcode(barcodeValue);
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [barcodeValue, barcodeType]);

  const handleGenerateNew = () => {
    // Generate 6-digit barcode
    const random6Digits = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
    setBarcodeValue(random6Digits.toString());
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue).then(() => {
      // You can add a toast notification here if needed
    });
  };

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      // Sanitize parts for a safe filename but preserve spaces and parentheses
      const sanitize = (str) => (str || '')
        .toString()
        .trim()
        .replace(/[^a-z0-9\-_|\s()]+/gi, '') // keep letters, numbers, dash, underscore, space, parentheses
        .replace(/\s+/g, ' ')
        .trim();
      const namePart = productName ? sanitize(productName) : 'product';
      const insideParens = sanitize(sku || barcodeValue || 'barcode');
      link.download = `${namePart} (${insideParens}).png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const handleUseBarcode = () => {
    if (!canGenerate) return;
    onGenerate(barcodeValue);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Barcode Generator" /></h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!canGenerate && (
            <div className="flex items-start space-x-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="text-sm font-medium">View-only access</p>
                <p className="text-xs">You can preview and download the barcode, but you cannot apply it to the product.</p>
              </div>
            </div>
          )}
          {/* Product Info */}
          {(productName || sku) && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Product Information</h4>
              {productName && (
                <p className="text-sm text-gray-600">Name: {productName}</p>
              )}
              {sku && (
                <p className="text-sm text-gray-600">SKU: {sku}</p>
              )}
            </div>
          )}

          {/* Barcode Type Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Type
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              CODE128
            </div>
          </div>

          {/* Barcode Value Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Value
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                disabled={!canGenerate}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!canGenerate ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                placeholder="Enter barcode value"
              />
              <button
                type="button"
                onClick={handleGenerateNew}
                disabled={!canGenerate}
                className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${!canGenerate ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'}`}
                title="Generate new barcode"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
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
            disabled={!canGenerate}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${!canGenerate ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'}`}
          >
            <Barcode className="h-5 w-5 mr-2" />
            {canGenerate ? 'Use This Barcode' : 'View Only'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
 
