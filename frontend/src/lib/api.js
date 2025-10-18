import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE || 'https://kafu-system-2.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (authentication disabled for now)
api.interceptors.request.use(
  (config) => {
    // Authentication disabled - no token needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic error handling without auth redirects
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  assignToGroup: (id, groupId) => api.patch(`/users/${id}/group`, { groupId }),
};

// Groups API
export const groupsAPI = {
  getGroups: (params) => api.get('/groups', { params }),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: (groupData) => api.post('/groups', groupData),
  updateGroup: (id, groupData) => api.put(`/groups/${id}`, groupData),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  addUsersToGroup: (id, userIds) => api.post(`/groups/${id}/users`, { userIds }),
  removeUserFromGroup: (groupId, userId) => api.delete(`/groups/${groupId}/users/${userId}`),
};

// Upload API
export const uploadAPI = {
  uploadUsers: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
