import { api } from './api';

export const inventoryApi = {
    // Determine which API to use based on configuration
    // For Atelier, we use raw materials. For Perfume Shop, we use products.
    // This method abstracts that choice for the UI.
    getAll: async (params = {}) => {
        try {
            // Updated to use the new raw_materials endpoint
            const response = await api.get('/raw-materials', { params });
            const materials = response.data.materials || [];

            // Transform to generic InventoryItem format
            return materials.map(item => ({
                id: item.id,
                itemType: item.type === 'fabric' ? 'fabric' : 'accessory', // Map DB type to frontend type
                itemName: item.name,
                name: item.name, // Keep both for compatibility
                description: item.description || `${item.type}`,
                supplier_name: item.supplier_name,
                type: item.type,
                sku: `MAT-${item.id.substring(0, 8)}`,
                quantityAvailable: Number(item.current_stock),
                current_stock: Number(item.current_stock), // Keep both for compatibility
                unitOfMeasure: item.unit || 'units',
                unit: item.unit || 'units', // Keep both for compatibility
                sellingPrice: Number(item.selling_price) || (Number(item.cost_per_unit) * 1.5), // Use selling price if set, else fallback
                selling_price: Number(item.selling_price) || (Number(item.cost_per_unit) * 1.5), // Keep both for compatibility
                costPrice: Number(item.cost_per_unit),
                cost_per_unit: Number(item.cost_per_unit), // Keep both for compatibility
                imageUrl: null, // Raw materials don't have images yet
                widthCm: 140, // Default for fabrics
                is_atelier_item: true
            }));
        } catch (error) {
            console.error("Failed to fetch inventory", error);
            throw error;
        }
    }
};
