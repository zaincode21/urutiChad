import React, { useState } from 'react';
import axios from 'axios';
import {
    Building2,
    Car,
    Save,
    User,
    Phone,
    Palette,
    Calendar
} from 'lucide-react';

const CarRegistration = () => {
    const [formData, setFormData] = useState({
        plate_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        owner_name: '',
        owner_contact: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            // Assuming base URL is configured in axios or relative
            await axios.post('/api/cars', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Car registered successfully!' });
            setFormData({
                plate_number: '',
                make: '',
                model: '',
                year: new Date().getFullYear(),
                color: '',
                owner_name: '',
                owner_contact: ''
            });
        } catch (error) {
            console.error('Registration failed:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to register car. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Car Registration</h1>
                <p className="text-gray-600">Register a new vehicle in the system</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Plate Number */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Plate Number <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="plate_number"
                                    required
                                    value={formData.plate_number}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. RAB 123 A"
                                />
                            </div>
                        </div>

                        {/* Make */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                            <input
                                type="text"
                                name="make"
                                value={formData.make}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Toyota"
                            />
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Corolla"
                            />
                        </div>

                        {/* Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="number"
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    min="1900"
                                    max={new Date().getFullYear() + 1}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                            <div className="relative">
                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. White"
                                />
                            </div>
                        </div>

                        {/* Owner Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Owner Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="owner_name"
                                    required
                                    value={formData.owner_name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Full Name"
                                />
                            </div>
                        </div>

                        {/* Owner Contact */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Owner Contact <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="tel"
                                    name="owner_contact"
                                    required
                                    value={formData.owner_contact}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Phone Number"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Registering...' : 'Register Car'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CarRegistration;
