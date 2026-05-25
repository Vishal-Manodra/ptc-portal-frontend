// src/api/index.js
// This file is the "bridge" between React and your FastAPI backend.
// All fetch calls live here — no other file talks to the backend directly.
// This makes it easy to change the API URL or add headers in one place.

import axios from "axios";

// Base URL of your backend — change this when you deploy
const BASE_URL = "http://127.0.0.1:8000";

// Create an axios instance with default settings
// Every request made through "api" will automatically include these settings
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// INTERCEPTOR — runs before every request
// Automatically attaches the JWT token to every request
// So we don't have to manually add "Authorization: Bearer ..." everywhere
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// INTERCEPTOR — runs after every response
// If the server returns 401 (token expired/invalid), log the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const loginUser = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
  // returns: { access_token, role, name, user_id }
};

export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const getEmployees = async () => {
  const response = await api.get("/auth/employees");
  return response.data;
};

// ── CLIENTS & GST ─────────────────────────────────────────────────────────────

// STEP 1: Send GSTIN, get back a session_id and the base64 CAPTCHA image
export const getGstCaptcha = async (gstin) => {
  const response = await api.post("/gst/get-captcha", { gstin });
  return response.data;
  // Returns: { session_id: "uuid-string", captcha_image: "data:image/png;base64,..." }
};

// STEP 2: Send the session ID and the text the human typed to get the final data
export const verifyGstCaptcha = async (sessionId, captchaText) => {
  const response = await api.post("/gst/verify", {
    session_id: sessionId,
    captcha_text: captchaText,
  });
  return response.data;
  // Returns: { success: true, data: { legal_name: "...", trade_name: "...", status: "..." } }
};

export const fetchGSTDetails = async (gstin) => {
  const response = await api.get(`/clients/fetch-gst/${gstin}`);
  return response.data;
};

export const getClients = async (status = null) => {
  // status can be "active", "dormant", or null (all)
  const params = status ? { status } : {};
  const response = await api.get("/clients", { params });
  return response.data;
};

export const getClient = async (clientId) => {
  const response = await api.get(`/clients/${clientId}`);
  return response.data;
};

export const createClient = async (clientData) => {
  const response = await api.post("/clients", clientData);
  return response.data;
};

export const updateClient = async (clientId, clientData) => {
  const response = await api.patch(`/clients/${clientId}`, clientData);
  return response.data;
};

export const toggleClientStatus = async (clientId) => {
  const response = await api.patch(`/clients/${clientId}/status`);
  return response.data;
};

export const deleteClient = async (clientId) => {
  await api.delete(`/clients/${clientId}`);
};

export const assignService = async (clientId, serviceId) => {
  const response = await api.post(
    `/clients/${clientId}/services?service_id=${serviceId}`,
  );
  return response.data;
};

export const updateService = async (csId, data) => {
  const response = await api.patch(`/clients/services/${csId}`, data);
  return response.data;
};

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────

export const getDocuments = async (clientId) => {
  const response = await api.get(`/documents/${clientId}`);
  return response.data;
};

export const uploadDocument = async (clientId, file, options = {}) => {
  // File uploads use FormData — not JSON — because we're sending binary data
  const formData = new FormData();
  formData.append("client_id", clientId);
  formData.append("file", file);
  if (options.clientServiceId) {
    formData.append("client_service_id", options.clientServiceId);
  }
  formData.append(
    "visible_to_client",
    options.visibleToClient !== undefined ? options.visibleToClient : true,
  );

  const response = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const toggleDocVisibility = async (docId) => {
  const response = await api.patch(`/documents/${docId}/visibility`);
  return response.data;
};

export const deleteDocument = async (docId) => {
  await api.delete(`/documents/${docId}`);
};

export const sendDocumentToWhatsapp = async (clientId, documentId) => {
  const response = await api.post("/whatsapp/send-document", {
    client_id: clientId,
    document_id: documentId,
  });
  return response.data;
};

// ── TASKS ─────────────────────────────────────────────────────────────────────

export const getTasks = async (filters = {}) => {
  const response = await api.get("/tasks", { params: filters });
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await api.post("/tasks", taskData);
  return response.data;
};

export const updateTask = async (taskId, params = {}) => {
  const response = await api.patch(`/tasks/${taskId}`, null, { params });
  return response.data;
};

export const deleteTask = async (taskId) => {
  await api.delete(`/tasks/${taskId}`);
};

// ── SERVICES (master list) ────────────────────────────────────────────────────

export const getServices = async () => {
  // We'll add this endpoint to the backend shortly
  const response = await api.get("/services");
  return response.data;
};

export const fetchServiceDetails = async (clientId, serviceKey) => {
  const response = await api.post(`/clients/${clientId}/fetch/${serviceKey}`);
  return response.data;
};

// ── GST RETURN FILINGS ────────────────────────────────────────────────────────

export const getGstFilings = async (filters) => {
  const response = await api.get("/gst/filings", { params: filters });
  return response.data;
};

export const updateGstFiling = async (payload) => {
  const response = await api.post("/gst/filings/update", payload);
  return response.data;
};

export const sendGstReminders = async (payload) => {
  const response = await api.post("/gst/filings/remind", payload);
  return response.data;
};

export default api;

