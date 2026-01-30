import React, { useState, useEffect, useCallback } from 'react';
import { X, Ruler, AlertCircle, User, Maximize2 } from 'lucide-react';
import { customersAPI } from '../../lib/api';
import LoadingSpinner from '../LoadingSpinner';
import TranslatedText from '../TranslatedText';
import toast from 'react-hot-toast';

export default function MeasurementsModal({ isOpen, onClose, customerId }) {
    const [measurements, setMeasurements] = useState(null);
    const [customerInfo, setCustomerInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (isOpen && customerId) {
            loadMeasurements();
        }
        // Reset state when modal closes
        if (!isOpen) {
            setMeasurements(null);
            setCustomerInfo(null);
            setError(null);
            setIsFullscreen(false);
        }
    }, [isOpen, customerId]);

    // Handle escape key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const loadMeasurements = useCallback(async () => {
        if (!customerId) return;
        
        setLoading(true);
        setError(null);
        try {
            const response = await customersAPI.getById(customerId);
            const client = response.data.customer || response.data;
            
            // Store customer info
            setCustomerInfo({
                name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown Customer',
                email: client.email,
                phone: client.phone
            });
            
            let parsedMeasurements = {};
            if (client.measurements) {
                try {
                    parsedMeasurements = typeof client.measurements === 'string'
                        ? JSON.parse(client.measurements)
                        : client.measurements;
                } catch (parseError) {
                    console.error('Failed to parse measurements:', parseError);
                    throw new Error('Invalid measurements data format');
                }
            }
            setMeasurements(parsedMeasurements);
        } catch (err) {
            console.error("Failed to load measurements", err);
            const errorMessage = err.message || "Failed to load measurements";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    const formatKey = useCallback((key) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }, []);

    const handleRetry = useCallback(() => {
        loadMeasurements();
    }, [loadMeasurements]);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-[#1a1e2e] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-all ${
                isFullscreen 
                    ? 'w-full h-full max-w-none max-h-none' 
                    : 'w-full max-w-2xl max-h-[90vh]'
            }`}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Ruler size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                <TranslatedText text="Client Measurements" />
                            </h3>
                            {customerInfo && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <User size={14} />
                                    <span>{customerInfo.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFullscreen}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded"
                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            <Maximize2 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`p-6 overflow-y-auto custom-scrollbar ${
                    isFullscreen ? 'flex-1' : 'max-h-[60vh]'
                }`}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <LoadingSpinner />
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                <TranslatedText text="Loading measurements..." />
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    <TranslatedText text="Error Loading Measurements" />
                                </h4>
                                <p className="text-red-600 dark:text-red-400 mb-4">
                                    <TranslatedText text={error} />
                                </p>
                                <button
                                    onClick={handleRetry}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <TranslatedText text="Try Again" />
                                </button>
                            </div>
                        </div>
                    ) : measurements && Object.keys(measurements).length > 0 ? (
                        <div className="space-y-6">
                            {/* Customer Info */}
                            {customerInfo && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        <TranslatedText text="Customer Information" />
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-blue-700 dark:text-blue-300 font-medium">Name:</span>
                                            <span className="ml-2 text-blue-800 dark:text-blue-200">{customerInfo.name}</span>
                                        </div>
                                        {customerInfo.email && (
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300 font-medium">Email:</span>
                                                <span className="ml-2 text-blue-800 dark:text-blue-200">{customerInfo.email}</span>
                                            </div>
                                        )}
                                        {customerInfo.phone && (
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300 font-medium">Phone:</span>
                                                <span className="ml-2 text-blue-800 dark:text-blue-200">{customerInfo.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Measurements Grid */}
                            <div className={`grid gap-4 ${
                                isFullscreen 
                                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                                    : 'grid-cols-2 md:grid-cols-3'
                            }`}>
                                {Object.entries(measurements).map(([key, value]) => (
                                    <div key={key} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#111421] dark:to-[#1a1e2e] p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 font-medium">
                                            <TranslatedText text={formatKey(key)} />
                                        </p>
                                        <p className="font-bold text-gray-900 dark:text-white text-xl">
                                            {value} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">cm</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                    <Ruler className="h-12 w-12 text-gray-400" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    <TranslatedText text="No Measurements Available" />
                                </h4>
                                <p className="text-gray-500 dark:text-gray-400">
                                    <TranslatedText text="No measurements found for this client." />
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-[#111421] border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {measurements && Object.keys(measurements).length > 0 && (
                            <span>
                                <TranslatedText text="{count} measurements" values={{ count: Object.keys(measurements).length }} />
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {error && (
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                <TranslatedText text="Retry" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-[#1a1e2e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#2d324a] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <TranslatedText text="Close" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
