import axios from 'axios'

const getBaseURL = () => {
  // In production, frontend is served from the same Express server.
  // So all API calls are relative (no cross-origin issues).
  // In development, proxy is configured in vite.config.ts to forward /api to localhost:5000.
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  return '/api'; // Relative URL works for both dev (via Vite proxy) and production
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
