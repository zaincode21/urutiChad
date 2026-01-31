import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { brandsAPI } from '../lib/api'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import TranslatedText from '../components/TranslatedText'
import { useTranslation } from '../hooks/useTranslation'

const Brands = () => {
  const { tSync } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [filterActive, setFilterActive] = useState('all')

  const queryClient = useQueryClient()

  // Fetch brands
  const { data: brandsData, isLoading, error } = useQuery({
    queryKey: ['brands', searchTerm, filterActive],
    queryFn: () => brandsAPI.getAll({
      params: {
        search: searchTerm,
        active: filterActive !== 'all' ? filterActive === 'active' : undefined
      }
    }).then(res => res.data),
  })

  const brands = brandsData?.brands || []

  // Mutations
  const createBrandMutation = useMutation({
    mutationFn: (data) => brandsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands'])
      setShowAddModal(false)
      toast.success('Brand created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create brand')
    }
  })

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, data }) => brandsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands'])
      setShowEditModal(false)
      setSelectedBrand(null)
      toast.success('Brand updated successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update brand')
    }
  })

  const deleteBrandMutation = useMutation({
    mutationFn: (id) => brandsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands'])
      toast.success('Brand deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete brand')
    }
  })

  const handleCreateBrand = (formData) => {
    createBrandMutation.mutate(formData)
  }

  const handleUpdateBrand = (formData) => {
    updateBrandMutation.mutate({
      id: selectedBrand.id,
      data: formData
    })
  }

  const handleDeleteBrand = (brand) => {
    if (window.confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      deleteBrandMutation.mutate(brand.id)
    }
  }

  const handleEditBrand = (brand) => {
    setSelectedBrand(brand)
    setShowEditModal(true)
  }

  const toggleBrandStatus = (brand) => {
    updateBrandMutation.mutate({
      id: brand.id,
      data: { is_active: !brand.is_active }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur de chargement des marques : {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            <TranslatedText text="Brands" />
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            <TranslatedText text="Manage product brands and manufacturers" />
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 min-h-[44px] touch-target text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline"><TranslatedText text="Add Brand" /></span>
          <span className="sm:hidden"><TranslatedText text="Add" /></span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={tSync('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 sm:px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
          >
            <option value="all">{tSync("All Brands")}</option>
            <option value="active">{tSync("Active Only")}</option>
            <option value="inactive">{tSync("Inactive Only")}</option>
          </select>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-4 sm:p-6">
              {/* Brand Logo */}
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* Brand Info */}
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">{brand.name}</h3>
                {brand.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{brand.description}</p>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-center mb-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${brand.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}
                >
                  {brand.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditBrand(brand)}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2.5 sm:py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1 text-sm min-h-[44px] sm:min-h-[36px] touch-target"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => toggleBrandStatus(brand)}
                  className={`px-3 py-2.5 sm:py-2 rounded-lg flex items-center justify-center min-h-[44px] sm:min-h-[36px] touch-target ${brand.is_active
                    ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                >
                  {brand.is_active ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteBrand(brand)}
                  className="bg-red-50 text-red-600 px-3 py-2.5 sm:py-2 rounded-lg hover:bg-red-100 flex items-center justify-center min-h-[44px] sm:min-h-[36px] touch-target"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {brands.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2"><TranslatedText text="No brands found" /></h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 max-w-md mx-auto">
            {searchTerm || filterActive !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first brand'
            }
          </p>
          {(!searchTerm && filterActive === 'all') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 min-h-[44px] touch-target"
            >
              Add Brand
            </button>
          )}
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddModal && (
        <BrandModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateBrand}
          isLoading={createBrandMutation.isPending}
          t={tSync}
        />
      )}

      {/* Edit Brand Modal */}
      {showEditModal && selectedBrand && (
        <BrandModal
          brand={selectedBrand}
          onClose={() => {
            setShowEditModal(false)
            setSelectedBrand(null)
          }}
          onSubmit={handleUpdateBrand}
          isLoading={updateBrandMutation.isPending}
          t={tSync}
        />
      )}
    </div>
  )
}

// Brand Modal Component
const BrandModal = ({ brand, onClose, onSubmit, isLoading, t }) => {
  const { tSync } = useTranslation();
  const [formData, setFormData] = useState({
    name: brand?.name || '',
    description: brand?.description || '',
    logo_url: brand?.logo_url || '',
    website: brand?.website || '',
    country: brand?.country || '',
    is_active: brand?.is_active ?? true
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-4 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">
          {brand ? <TranslatedText text="Edit Brand" /> : <TranslatedText text="Add New Brand" />}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tSync('form.name')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={tSync('form.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tSync('form.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={tSync('form.descriptionPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText text="Logo URL" />
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText text="Website" />
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://brand.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText text="Country" />
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={tSync("Enter country")}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              <TranslatedText text="Active" />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px] touch-target"
            >
              <TranslatedText text="Cancel" />
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px] touch-target"
            >
              {isLoading ? <TranslatedText text="Saving..." /> : (brand ? <TranslatedText text="Update" /> : <TranslatedText text="Create" />)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Brands

