import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan } from 'lucide-react';
import TranslatedText from './TranslatedText';

const BarcodeScanner = ({ onScan, onClose, isOpen }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen && scanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleScan = () => {
    setScanning(true);
    setError('');
  };

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      onScan(e.target.value.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Barcode Scanner" /></h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {!scanning ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scan className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Scan Barcode
                </h4>
                <p className="text-gray-600 mb-4">
                  Use your device camera to scan a barcode or enter it manually
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleScan}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Camera className="h-5 w-5 inline mr-2" />
                  Use Camera Scanner
                </button>

                <button
                  onClick={handleManualEntry}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Enter Manually
                </button>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type barcode and press Enter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 bg-gray-900 rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white rounded-lg p-2">
                    <div className="w-48 h-32 border-2 border-blue-500 rounded"></div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setScanning(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualEntry}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Manual Entry
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Position the barcode within the scanning area
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
