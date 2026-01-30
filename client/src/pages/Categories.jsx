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
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Categories = () => {
  const { tSync } = useTranslation();
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
    mutationFn: (data) => categoriesAPI.create(data),
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
        <div className={`flex items-center justify-between p-3 rounded-lg border ${selectedItems.has(category.id)
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-200 hover:border-gray-300'
          } transition-colors`}>
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-shrink-0">
              {category.children && category.children.length > 0 && (
                <button
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className="p-1 hover:bg-gray-100 rounded min-h-[36px] min-w-[36px] flex items-center justify-center touch-target"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              <div className="flex items-center space-x-2">
                <FolderOpen className={`h-5 w-5 ${category.level === 0 ? 'text-blue-500' :
                  category.level === 1 ? 'text-green-500' : 'text-purple-500'
                  }`} />
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  L{category.level}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <h3 className="font-medium text-gray-900 truncate">{category.name}</h3>
                <div className="flex items-center gap-2">
                  {category.type !== 'general' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
                      {category.type}
                    </span>
                  )}
                  {category.parent_name && (
                    <span className="text-xs text-gray-500 truncate hidden sm:inline">
                      → {category.parent_name}
                    </span>
                  )}
                </div>
              </div>
              {category.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{category.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <input
              type="checkbox"
              checked={selectedItems.has(category.id)}
              onChange={() => toggleSelection(category.id)}
              className="rounded border-gray-300"
            />

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setEditingCategory(category)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded min-h-[36px] min-w-[36px] flex items-center justify-center touch-target"
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
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded min-h-[36px] min-w-[36px] flex items-center justify-center touch-target"
                title="Add subcategory"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleDeleteCategory(category)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded min-h-[36px] min-w-[36px] flex items-center justify-center touch-target"
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
    <div className="space-y-4 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            <TranslatedText text="Categories" />
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            <TranslatedText text="Organize your products with hierarchical categories" />
          </p>
        </div>
        <button
          onClick={() => setShowNewCategoryForm(true)}
          className="inline-flex items-center px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors min-h-[44px] touch-target"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline"><TranslatedText text="Add Category" /></span>
          <span className="sm:hidden"><TranslatedText text="Add" /></span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={tSync('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
              >
                <option value="all">{tSync("All Levels")}</option>
                <option value="0">{tSync("Root Categories")}</option>
                <option value="1">{tSync("Level 1")}</option>
                <option value="2">{tSync("Level 2")}</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
              >
                <option value="all">{tSync("All Types")}</option>
                <option value="general">{tSync("General")}</option>
                <option value="perfume">{tSync("Perfume")}</option>
                <option value="clothing">{tSync("Clothing")}</option>
                <option value="accessories">{tSync("Accessories")}</option>
                <option value="bulk_perfume">{tSync("Bulk Perfume")}</option>
              </select>
            </div>
          </div>

          {/* View and Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 rounded min-h-[36px] min-w-[36px] flex items-center justify-center ${viewMode === 'tree' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Tree View"
              >
                <FolderTree className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded min-h-[36px] min-w-[36px] flex items-center justify-center ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Grid View"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded min-h-[36px] min-w-[36px] flex items-center justify-center ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="name">{tSync("Sort by Name")}</option>
              <option value="level">{tSync("Sort by Level")}</option>
              <option value="type">{tSync("Sort by Type")}</option>
              <option value="created_at">{tSync("Sort by Date")}</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.size} categories selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800 min-h-[36px] px-2 py-1 rounded touch-target"
              >
                {tSync('Select All')}
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800 min-h-[36px] px-2 py-1 rounded touch-target"
              >
                {tSync('Clear Selection')}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-2.5 sm:py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px] touch-target"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {tSync('Delete Selected')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tree */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          {viewMode === 'tree' && (
            <div className="space-y-4">
              {hierarchicalCategories.length > 0 ? (
                renderCategoryTree(hierarchicalCategories)
              ) : (
                <div className="text-center py-8 sm:py-12 px-4">
                  <FolderOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2"><TranslatedText text="No categories found" /></h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 max-w-md mx-auto">
                    {searchTerm || filterLevel !== 'all' || filterType !== 'all'
                      ? tSync('Try adjusting your search or filters')
                      : tSync('Get started by creating your first category')
                    }
                  </p>
                  {!searchTerm && filterLevel === 'all' && filterType === 'all' && (
                    <button
                      onClick={() => setShowNewCategoryForm(true)}
                      className="inline-flex items-center px-4 py-2.5 sm:py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 min-h-[44px] touch-target"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {tSync('Create Category')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Category Modal */}
      {(showNewCategoryForm || editingCategory) && (
        <CategoryModal
          title={editingCategory ? tSync('actions.edit') : tSync('actions.create')}
          category={editingCategory || newCategory}
          onChange={editingCategory ? setEditingCategory : setNewCategory}
          onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
          onClose={() => {
            setShowNewCategoryForm(false);
            setEditingCategory(null);
            setNewCategory({ name: '', description: '', parent_id: '', type: 'general' });
          }}
          isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          parentOptions={flatCategories.filter(cat => !editingCategory || cat.id !== editingCategory.id)}
          t={tSync}
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
  parentOptions,
  t
}) => {
  const { tSync } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-2 sm:mx-4 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded min-h-[36px] min-w-[36px] flex items-center justify-center touch-target"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tSync('form.name')} *
            </label>
            <input
              type="text"
              value={category.name}
              onChange={(e) => onChange({ ...category, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={tSync('form.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tSync('form.description')}
            </label>
            <textarea
              value={category.description || ''}
              onChange={(e) => onChange({ ...category, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={tSync('form.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TranslatedText text="Parent Category" />
            </label>
            <select
              value={category.parent_id || ''}
              onChange={(e) => onChange({ ...category, parent_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{tSync("No parent (Root category)")}</option>
              {parentOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {'—'.repeat(option.level)} {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TranslatedText text="Type" />
            </label>
            <select
              value={category.type}
              onChange={(e) => onChange({ ...category, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">{tSync("General")}</option>
              <option value="perfume">{tSync("Perfume")}</option>
              <option value="clothing">{tSync("Clothing")}</option>
              <option value="accessories">{tSync("Accessories")}</option>
              <option value="bulk_perfume">{tSync("Bulk Perfume")}</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 min-h-[44px] touch-target"
            >
              <TranslatedText text="Cancel" />
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-target"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <TranslatedText text="Saving..." />
                </div>
              ) : (
                <TranslatedText text="Save Category" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Categories; 