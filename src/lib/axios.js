import axios from "axios";

/**
 * Pre-configured Axios instance for client-side API requests.
 * Uses a default baseURL of '/api' so components can make calls like:
 *   api.get('/health') instead of api.get('/api/health')
 */
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export default api;
