import React, { useState, useEffect } from 'react';
import { X, Ruler } from 'lucide-react';
import { customersAPI } from '../../lib/api';
import LoadingSpinner from '../LoadingSpinner';
import TranslatedText from '../TranslatedText';

export default function MeasurementsModal({ isOpen, onClose, customerId }) {
    const [measurements, setMeasurements] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && customerId) {
            loadMeasurements();
        }
    }, [isOpen, customerId]);

    const loadMeasurements = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await customersAPI.getById(customerId);
            const client = response.data.customer || response.data;
            let parsedMeasurements = {};

            if (client.measurements) {
                parsedMeasurements = typeof client.measurements === 'string'
                    ? JSON.parse(client.measurements)
                    : client.measurements;
            }
            setMeasurements(parsedMeasurements);
        } catch (err) {
            console.error("Failed to load measurements", err);
            setError("Failed to load measurements");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatKey = (key) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1e2e] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Ruler size={20} />
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            <TranslatedText text="Client Measurements" />
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-4">
                            <TranslatedText text={error} />
                        </div>
                    ) : measurements && Object.keys(measurements).length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(measurements).map(([key, value]) => (
                                <div key={key} className="bg-gray-50 dark:bg-[#111421] p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                        <TranslatedText text={formatKey(key)} />
                                    </p>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                                        {value} <span className="text-sm font-normal text-gray-500">cm</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <p><TranslatedText text="No measurements found for this client." /></p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-[#111421] border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-[#1a1e2e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#2d324a] transition-colors"
                    >
                        <TranslatedText text="Close" />
                    </button>
                </div>
            </div>
        </div>
    );
}
