import api from "./client";

export const authApi = {
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  refresh: (data) => api.post("/auth/refresh", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  listUsers: (params) => api.get("/auth/users", { params }).then((r) => r.data),
  updateRole: (id, role) => api.patch(`/auth/users/${id}/role`, { role }).then((r) => r.data),
};

export const matchesApi = {
  list: (params) => api.get("/matches", { params }).then((r) => r.data),
  getById: (id) => api.get(`/matches/${id}`).then((r) => r.data),
  live: () => api.get("/matches/live").then((r) => r.data),
  upcoming: (limit) => api.get("/matches/upcoming", { params: { limit } }).then((r) => r.data),
  create: (data) => api.post("/matches", data).then((r) => r.data),
  update: (id, data) => api.patch(`/matches/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/matches/${id}`).then((r) => r.data),
};

export const streamsApi = {
  list: (params) => api.get("/streams", { params }).then((r) => r.data),
  getById: (id) => api.get(`/streams/${id}`).then((r) => r.data),
  getStatus: (id) => api.get(`/streams/${id}/status`).then((r) => r.data),
  active: () => api.get("/streams/active").then((r) => r.data),
  create: (data) => api.post("/streams", data).then((r) => r.data),
  stop: (id) => api.post(`/streams/${id}/stop`).then((r) => r.data),
  restart: (id) => api.post(`/streams/${id}/restart`).then((r) => r.data),
};

export const adminApi = {
  stats: () => api.get("/admin/stats").then((r) => r.data),
  streams: () => api.get("/admin/streams").then((r) => r.data),
  scrape: () => api.post("/admin/scrape").then((r) => r.data),
  scrapeStatus: () => api.get("/admin/scrape/status").then((r) => r.data),
  cache: () => api.get("/admin/cache").then((r) => r.data),
  flushCache: () => api.post("/admin/cache/flush").then((r) => r.data),
  logs: (params) => api.get("/admin/logs", { params }).then((r) => r.data),
  users: () => api.get("/admin/users").then((r) => r.data),
};
