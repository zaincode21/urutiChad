import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Car,
    Search,
    Plus,
    X,
    Calendar,
    User,
    Phone,
    Palette,
    MoreVertical,
    Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Cars = () => {
    const { user } = useAuth();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        plate_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        owner_name: '',
        owner_contact: ''
    });
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchCars = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/cars?search=${search}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCars(response.data.cars);
        } catch (error) {
            console.error('Error fetching cars:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCars();
    }, [search]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/cars', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Car registered successfully!' });
            fetchCars(); // Refresh list

            // Reset form
            setFormData({
                plate_number: '',
                make: '',
                model: '',
                year: new Date().getFullYear(),
                color: '',
                owner_name: '',
                owner_contact: ''
            });

            // Close modal after short delay
            setTimeout(() => {
                setIsModalOpen(false);
                setMessage({ type: '', text: '' });
            }, 1500);

        } catch (error) {
            console.error('Registration failed:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to register car.'
            });
        } finally {
            setFormLoading(false);
        }
    };

    const Modal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Register New Car</h2>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {message.text && (
                        <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="RAB 123 A"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                                <input
                                    type="text"
                                    name="make"
                                    value={formData.make}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Toyota"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Corolla"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleInputChange}
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <div className="relative">
                                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="color"
                                        value={formData.color}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. White"
                                    />
                                </div>
                            </div>

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
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Full Name"
                                    />
                                </div>
                            </div>

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
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Phone Number"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                {formLoading ? 'Registering...' : 'Register Car'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Vehicles</h1>
                    <p className="text-gray-600">Manage registered cars</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="h-5 w-5" />
                    <span>Add Car</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by plate, owner or contact..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Cars List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-700">Plate Number</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Make & Model</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Owner</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Contact</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        Loading cars...
                                    </td>
                                </tr>
                            ) : cars.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No cars found. Click "Add Car" to register one.
                                    </td>
                                </tr>
                            ) : (
                                cars.map((car) => (
                                    <tr key={car.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                    <Car className="h-5 w-5" />
                                                </div>
                                                <span className="font-medium text-gray-900">{car.plate_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {car.make} {car.model} <span className="text-gray-400">({car.year})</span>
                                            <div className="text-xs text-gray-400">{car.color}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">{car.owner_name}</td>
                                        <td className="px-6 py-4 text-gray-600">{car.owner_contact}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${car.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {car.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <Modal />}
        </div>
    );
};

export default Cars;
