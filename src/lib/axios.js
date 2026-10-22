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

// Normalize URLs: if a request path starts with "/api/", strip it to prevent "/api/api/..."
api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith("/api/")) {
    config.url = config.url.slice(4); // Remove "/api"
  } else if (config.url === "/api") {
    config.url = "";
  }
  return config;
});

export default api;
