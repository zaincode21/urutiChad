import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Package,
    Edit,
    Trash2,
    Eye,
    X,
    Save,
    AlertCircle,
    CheckCircle,
    Scissors,
    Palette
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/formatters';

import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const AtelierMaterials = () => {
    const { tSync } = useTranslation();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);

    // Material categories for clothing atelier
    const materialCategories = [
        { id: 'all', name: tSync('All'), icon: Package },
        { id: 'fabric', name: tSync('Fabric'), icon: Scissors },
        { id: 'buttons', name: tSync('Buttons'), icon: Package },
        { id: 'zippers', name: tSync('Zippers'), icon: Package },
        { id: 'thread', name: tSync('Thread'), icon: Package },
        { id: 'lining', name: tSync('Lining'), icon: Package },
        { id: 'interfacing', name: tSync('Interfacing'), icon: Package }
    ];

    const [newMaterial, setNewMaterial] = useState({
        name: '',
        type: 'fabric',
        current_stock: 0,
        cost_per_unit: 0,
        selling_price: 0,
        unit: 'meters',
        supplier_name: '',
        min_stock_level: 0
    });

    const [markupPercentage, setMarkupPercentage] = useState(50);

    const calculateSellingPrice = (cost, markup) => {
        const costValue = parseFloat(cost) || 0;
        const markupValue = parseFloat(markup) || 0;
        return costValue * (1 + markupValue / 100);
    };

    const handleCostChange = (value, isEditing = false) => {
        const cost = parseFloat(value) || 0;
        const sellingPrice = calculateSellingPrice(cost, markupPercentage);
        
        if (isEditing) {
            setEditingMaterial({
                ...editingMaterial,
                cost_per_unit: value,
                selling_price: sellingPrice
            });
        } else {
            setNewMaterial({
                ...newMaterial,
                cost_per_unit: value,
                selling_price: sellingPrice
            });
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [currentPage, searchTerm, selectedCategory]);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const response = await api.get('/raw-materials', {
                params: {
                    page: currentPage,
                    limit: pageSize,
                    search: searchTerm,
                    type: selectedCategory !== 'all' ? selectedCategory : undefined
                }
            });
            setMaterials(response.data.materials || []);
        } catch (error) {
            console.error('Error fetching materials:', error);
            toast.error(tSync('Error loading materials'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async () => {
        try {
            await api.post('/raw-materials', {
                ...newMaterial,
                current_stock: parseFloat(newMaterial.current_stock) || 0,
                cost_per_unit: parseFloat(newMaterial.cost_per_unit) || 0,
                selling_price: parseFloat(newMaterial.selling_price) || 0,
                min_stock_level: parseFloat(newMaterial.min_stock_level) || 0
            });
            toast.success(tSync('Material added successfully'));
            setShowAddModal(false);
            setNewMaterial({
                name: '',
                type: 'fabric',
                current_stock: 0,
                cost_per_unit: 0,
                selling_price: 0,
                unit: 'meters',
                supplier_name: '',
                min_stock_level: 0
            });
            fetchMaterials();
        } catch (error) {
            console.error('Error adding material:', error);
            const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || tSync('Error adding material');
            toast.error(errorMessage);
        }
    };

    const handleEditMaterial = async () => {
        try {
            await api.put(`/raw-materials/${editingMaterial.id}`, editingMaterial);
            toast.success(tSync('Material updated successfully'));
            setEditingMaterial(null);
            fetchMaterials();
        } catch (error) {
            console.error('Error updating material:', error);
            toast.error(tSync('Error updating material'));
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (!window.confirm(tSync('Are you sure you want to delete this material?'))) return;

        try {
            await api.delete(`/raw-materials/${materialId}`);
            toast.success(tSync('Material deleted successfully'));
            fetchMaterials();
        } catch (error) {
            console.error('Error deleting material:', error);
            toast.error(tSync('Error deleting material'));
        }
    };

    const filteredMaterials = materials; // Filtering is done by backend now



    const getMaterialTypeColor = (type) => {
        const colors = {
            fabric: 'bg-blue-100 text-blue-800',
            buttons: 'bg-green-100 text-green-800',
            zippers: 'bg-purple-100 text-purple-800',
            thread: 'bg-yellow-100 text-yellow-800',
            lining: 'bg-pink-100 text-pink-800',
            interfacing: 'bg-gray-100 text-gray-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                        <Scissors className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-blue-600" />
                        {tSync('Atelier Inventory')}
                    </h1>
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{tSync('Manage your fabrics, accessories, and supplies')}</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-lg min-h-[44px]"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {tSync('Add Material')}
                </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder={tSync('Search materials...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                        >
                            {materialCategories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="mt-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
                        {materialCategories.map(category => {
                            const Icon = category.icon;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap min-h-[44px] ${selectedCategory === category.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{category.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>
            {/* Materials Grid */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900"><TranslatedText text="Materials Inventory" /></h2>
                    <p className="text-sm text-gray-600">Bulk materials for clothing production</p>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading materials...</p>
                    </div>
                ) : filteredMaterials.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                        <Scissors className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No Materials Found" /></h3>
                        <p className="text-sm sm:text-base text-gray-500 mb-4">
                            {searchTerm || selectedCategory !== 'all'
                                ? 'No materials match your search criteria.'
                                : 'Start adding materials for your clothing atelier.'}
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors min-h-[44px]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Material
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 p-4 sm:p-6">
                        {filteredMaterials.map((material) => (
                            <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{material.name}</h3>
                                        <p className="text-sm text-gray-600 truncate">{material.supplier_name}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => setEditingMaterial(material)}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMaterial(material.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">{tSync('Available')}:</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {material.current_stock} {material.unit}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">{tSync('Cost')}:</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {formatCurrency(material.cost_per_unit)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">{tSync('Price')}:</span>
                                        <span className="font-medium text-green-700 text-sm">
                                            {formatCurrency(material.selling_price || 0)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">{tSync('Value')}:</span>
                                        <span className="font-bold text-blue-600 text-sm">
                                            {formatCurrency(material.current_stock * material.cost_per_unit)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMaterialTypeColor(material.type)}`}>
                                        {material.type}
                                    </span>

                                    {/* Stock Status */}
                                    <div>
                                        {material.current_stock > 100 ? (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                <span className="text-xs">{tSync('In Stock')}</span>
                                            </div>
                                        ) : material.current_stock > 0 ? (
                                            <div className="flex items-center text-yellow-600">
                                                <AlertCircle className="h-4 w-4 mr-1" />
                                                <span className="text-xs">{tSync('Low Stock')}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-red-600">
                                                <X className="h-4 w-4 mr-1" />
                                                <span className="text-xs">{tSync('Out of Stock')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Material Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{tSync('Add New Material')}</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Name')}</label>
                                    <input
                                        type="text"
                                        value={newMaterial.name}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., Navy Wool Super 120s"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Type')}</label>
                                    <select
                                        value={newMaterial.type}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    >
                                        {materialCategories.filter(c => c.id !== 'all').map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Current Stock')}</label>
                                    <input
                                        type="number"
                                        value={newMaterial.current_stock}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, current_stock: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., 4000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Unit')}</label>
                                    <select
                                        value={newMaterial.unit}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    >
                                        <option value="meters">{tSync('Meters')}</option>
                                        <option value="yards">{tSync('Yards')}</option>
                                        <option value="pieces">{tSync('Pieces')}</option>
                                        <option value="rolls">{tSync('Rolls')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Cost')} (CFA)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newMaterial.cost_per_unit}
                                        onChange={(e) => handleCostChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., 300"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {tSync('Price')} (CFA)
                                        <span className="text-xs text-gray-500 ml-1">({markupPercentage}% markup)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newMaterial.selling_price}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, selling_price: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., 500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Supplier')}</label>
                                    <input
                                        type="text"
                                        value={newMaterial.supplier_name}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, supplier_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., Loro Piana"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Markup')} (%)</label>
                                    <input
                                        type="number"
                                        value={markupPercentage}
                                        onChange={(e) => {
                                            const markup = e.target.value;
                                            setMarkupPercentage(markup);
                                            if (newMaterial.cost_per_unit) {
                                                handleCostChange(newMaterial.cost_per_unit);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., 50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                            >
                                {tSync('Cancel')}
                            </button>
                            <button
                                onClick={handleAddMaterial}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px]"
                            >
                                {tSync('Add Material')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Material Modal */}
            {editingMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{tSync('Edit Material')}</h2>
                            <button
                                onClick={() => setEditingMaterial(null)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Name')}</label>
                                    <input
                                        type="text"
                                        value={editingMaterial.name}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Supplier')}</label>
                                    <input
                                        type="text"
                                        value={editingMaterial.supplier_name}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, supplier_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Current Stock')}</label>
                                    <input
                                        type="number"
                                        value={editingMaterial.current_stock}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, current_stock: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Cost')} (CFA)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingMaterial.cost_per_unit}
                                        onChange={(e) => handleCostChange(e.target.value, true)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {tSync('Price')} (CFA)
                                        <span className="text-xs text-gray-500 ml-1">({markupPercentage}% markup)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingMaterial.selling_price}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, selling_price: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{tSync('Markup')} (%)</label>
                                    <input
                                        type="number"
                                        value={markupPercentage}
                                        onChange={(e) => {
                                            const markup = e.target.value;
                                            setMarkupPercentage(markup);
                                            if (editingMaterial.cost_per_unit) {
                                                handleCostChange(editingMaterial.cost_per_unit, true);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                                        placeholder="e.g., 50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setEditingMaterial(null)}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                            >
                                {tSync('Cancel')}
                            </button>
                            <button
                                onClick={handleEditMaterial}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px]"
                            >
                                {tSync('Update Material')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtelierMaterials;