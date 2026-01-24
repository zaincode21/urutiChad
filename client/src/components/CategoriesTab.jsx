import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FolderOpen,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Archive,
  Download,
  Upload,
  BarChart3,
  Grid3X3,
  List,
  Table,
  SortAsc,
  SortDesc,
  RefreshCw,
  FolderTree,
  Layers
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { categoriesAPI } from '../lib/api';
import TranslatedText from './TranslatedText';

const CategoriesTab = () => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    description: '', 
    parent_id: '', 
    type: 'general' 
  });
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('tree'); // tree, grid, list, table
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const queryClient = useQueryClient();

  // Fetch hierarchical categories
  const { data: categoriesData, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll().then(res => res.data),
  });

  const categories = categoriesData?.categories || [];
  const flatCategories = categoriesData?.flat || [];

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data) => categoriesAPI.create( data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setNewCategory({ name: '', description: '', parent_id: '', type: 'general' });
      setShowNewCategoryForm(false);
      toast.success('Category created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create category');
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setEditingCategory(null);
      toast.success('Category updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update category');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete category');
    }
  });

  // Helper functions
  const toggleCategoryExpansion = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    createCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editingCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data: editingCategory
    });
  };

  const handleDeleteCategory = (category) => {
    if (category.children && category.children.length > 0) {
      toast.error('Cannot delete category with subcategories');
      return;
    }
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAll = () => {
    const allIds = flatCategories.map(cat => cat.id);
    setSelectedItems(new Set(allIds));
    setShowBulkActions(true);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    
    const selectedCategories = flatCategories.filter(cat => selectedItems.has(cat.id));
    const hasChildren = selectedCategories.some(cat => cat.children && cat.children.length > 0);
    
    if (hasChildren) {
      toast.error('Cannot delete categories with subcategories');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedItems.size} categories?`)) {
      Promise.all(Array.from(selectedItems).map(id => deleteCategoryMutation.mutateAsync(id)))
        .then(() => {
          clearSelection();
          toast.success(`${selectedItems.size} categories deleted successfully!`);
        })
        .catch(() => {
          toast.error('Some categories could not be deleted');
        });
    }
  };

  // Filter and sort categories
  const filteredCategories = flatCategories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || category.level === parseInt(filterLevel);
    const matchesType = filterType === 'all' || category.type === filterType;
    return matchesSearch && matchesLevel && matchesType;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'level':
        comparison = a.level - b.level;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'created_at':
        comparison = new Date(a.created_at) - new Date(b.created_at);
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Build hierarchical structure for tree view
  const buildHierarchy = (categories) => {
    const categoryMap = new Map();
    const rootCategories = [];

    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    categories.forEach(category => {
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    return rootCategories;
  };

  const hierarchicalCategories = buildHierarchy(sortedCategories);

  // Render category tree recursively
  const renderCategoryTree = (categories, level = 0) => {
    return categories.map(category => (
      <div key={category.id} className="space-y-2">
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          selectedItems.has(category.id) 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-white border-gray-200 hover:border-gray-300'
        } transition-colors`}>
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center space-x-2">
              {category.children && category.children.length > 0 && (
                <button
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              <div className="flex items-center space-x-2">
                <FolderOpen className={`h-5 w-5 ${
                  category.level === 0 ? 'text-blue-500' : 
                  category.level === 1 ? 'text-green-500' : 'text-purple-500'
                }`} />
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  L{category.level}
                </span>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                {category.type !== 'general' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {category.type}
                  </span>
                )}
                {category.parent_name && (
                  <span className="text-xs text-gray-500">
                    → {category.parent_name}
                  </span>
                )}
              </div>
              {category.description && (
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedItems.has(category.id)}
              onChange={() => toggleSelection(category.id)}
              className="rounded border-gray-300"
            />
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setEditingCategory(category)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Edit category"
              >
                <Edit className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setNewCategory({
                  name: '',
                  description: '',
                  parent_id: category.id,
                  type: 'general'
                })}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="Add subcategory"
              >
                <Plus className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handleDeleteCategory(category)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {category.children && category.children.length > 0 && expandedCategories.has(category.id) && (
          <div className="ml-8 border-l-2 border-gray-200 pl-4">
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatedText text="Error Loading Categories" /></h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(['categories'])}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Categories" /></h2>
          <p className="text-gray-600">Manage your product categories hierarchically</p>
        </div>
        <button
          onClick={() => setShowNewCategoryForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="0">Root Categories</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="perfume">Perfume</option>
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="bulk_perfume">Bulk Perfume</option>
            </select>
          </div>

          {/* View Mode and Sort */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { key: 'tree', icon: FolderTree, label: 'Tree' },
                { key: 'grid', icon: Grid3X3, label: 'Grid' },
                { key: 'list', icon: List, label: 'List' },
                { key: 'table', icon: Table, label: 'Table' }
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`p-2 rounded-md flex items-center space-x-1 ${
                    viewMode === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="level-asc">Level Low-High</option>
              <option value="level-desc">Level High-Low</option>
              <option value="type-asc">Type A-Z</option>
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              {selectedItems.size} category{selectedItems.size !== 1 ? 'ies' : 'y'} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {viewMode === 'tree' ? (
          <div className="p-6">
            {hierarchicalCategories.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatedText text="No categories found" /></h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterLevel !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first category'
                  }
                </p>
                {!searchTerm && filterLevel === 'all' && filterType === 'all' && (
                  <button
                    onClick={() => setShowNewCategoryForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Category
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {renderCategoryTree(hierarchicalCategories)}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-gray-600">Grid, List, and Table views coming soon...</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewCategoryForm && (
        <CategoryModal
          title="Create New Category"
          category={newCategory}
          onChange={setNewCategory}
          onSubmit={handleCreateCategory}
          onClose={() => setShowNewCategoryForm(false)}
          isLoading={createCategoryMutation.isPending}
          parentOptions={flatCategories.filter(cat => cat.level < 3)}
        />
      )}

      {editingCategory && (
        <CategoryModal
          title="Edit Category"
          category={editingCategory}
          onChange={setEditingCategory}
          onSubmit={handleUpdateCategory}
          onClose={() => setEditingCategory(null)}
          isLoading={updateCategoryMutation.isPending}
          parentOptions={flatCategories.filter(cat => cat.id !== editingCategory.id && cat.level < 3)}
        />
      )}
    </div>
  );
};

// Category Modal Component
const CategoryModal = ({ 
  title, 
  category, 
  onChange, 
  onSubmit, 
  onClose, 
  isLoading,
  parentOptions 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={category.name}
            onChange={(e) => onChange({ ...category, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter category name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={category.description || ''}
            onChange={(e) => onChange({ ...category, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter category description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parent Category
          </label>
          <select
            value={category.parent_id || ''}
            onChange={(e) => onChange({ ...category, parent_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">No parent (Root category)</option>
            {parentOptions.map(option => (
              <option key={option.id} value={option.id}>
                {'—'.repeat(option.level)} {option.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={category.type}
            onChange={(e) => onChange({ ...category, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="general">General</option>
            <option value="perfume">Perfume</option>
            <option value="clothing">Clothing</option>
            <option value="accessories">Accessories</option>
            <option value="bulk_perfume">Bulk Perfume</option>
          </select>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Category'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default CategoriesTab; 
