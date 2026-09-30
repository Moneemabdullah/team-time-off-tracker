import axios from "axios";
import { URLs } from "./URLs";

const TOKEN_KEY = "token";

const baseURL =
  import.meta.env.VITE_BACKEND_URI || "http://localhost:5000";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

const AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

AxiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

AxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const serverMessage = error.response?.data?.message;

    if (serverMessage) {
      error.message = serverMessage;
    }

    if (status === 401 && !url.includes("/auth/login")) {
      clearToken();
      if (window.location.pathname !== URLs.LOGIN) {
        window.location.assign(URLs.LOGIN);
      }
    }

    return Promise.reject(error);
  }
);

export default AxiosInstance;
