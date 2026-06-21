import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const adminApi = {
  stats: () => api.get("/admin/stats").then((r) => r.data),
  streams: () => api.get("/admin/streams").then((r) => r.data),
  stopStream: (id) => api.post(`/admin/streams/${id}/stop`).then((r) => r.data),
  restartStream: (id) => api.post(`/admin/streams/${id}/restart`).then((r) => r.data),
  scrape: () => api.post("/admin/scrape").then((r) => r.data),
  scrapeStatus: () => api.get("/admin/scrape/status").then((r) => r.data),
  cache: () => api.get("/admin/cache").then((r) => r.data),
  flushCache: () => api.post("/admin/cache/flush").then((r) => r.data),
  logs: (params) => api.get("/admin/logs", { params }).then((r) => r.data),
  users: () => api.get("/admin/users").then((r) => r.data),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  matches: (params) => api.get("/matches", { params }).then((r) => r.data),
  matchCreate: (data) => api.post("/matches", data).then((r) => r.data),
  matchUpdate: (id, data) => api.patch(`/matches/${id}`, data).then((r) => r.data),
  matchDelete: (id) => api.delete(`/matches/${id}`).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  startStream: (data) => api.post("/streams", data).then((r) => r.data),
};
