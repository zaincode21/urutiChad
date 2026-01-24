import { usersAPI } from './api';

export const userApi = {
    getAll: async (params) => {
        const response = await usersAPI.getAll(params);
        return response.data.users || response.data || [];
    }
};
