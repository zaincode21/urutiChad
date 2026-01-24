import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import TranslatedText from './TranslatedText';

const BarcodeDisplay = ({ value, width = 1.5, height = 40, fontSize = 10, className = '' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (value && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (error) {
        console.error('Barcode display error:', error);
      }
    }
  }, [value, width, height, fontSize]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  );
};

export default BarcodeDisplay; 
