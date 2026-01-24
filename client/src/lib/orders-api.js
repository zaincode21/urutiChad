import { ordersAPI } from './api';

export const ordersApi = {
    create: async (data) => {
        const response = await ordersAPI.create(data);
        return response.data;
    },
    getAll: async (params) => {
        const response = await ordersAPI.getAll(params);
        return response.data;
    }
};
