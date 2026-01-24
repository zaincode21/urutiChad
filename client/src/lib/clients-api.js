import { customersAPI } from './api';

export const clientsApi = {
    getAll: async (params) => {
        const response = await customersAPI.getAll(params);
        // Assuming backend returns { data: { customers: [...] } } or { customers: [...] }
        return response.data.customers || response.data || [];
    }
};
// Type definition mock for Client would be JSDoc if needed
