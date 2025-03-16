import axios from "axios";
import { socketService } from "./socket";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies
});

// Track if we're refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: string | null) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Add request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        // Don't add token for refresh requests
        if (config.url === "/auth/refresh") {
            return config;
        }

        const token = localStorage.getItem("accessToken");
        if (token) {
            // Make sure token has Bearer prefix
            const formattedToken = token.startsWith("Bearer ")
                ? token
                : `Bearer ${token}`;
            config.headers.Authorization = formattedToken;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Skip token refresh for auth endpoints except refresh
        if (
            originalRequest.url?.includes("/auth/") &&
            !originalRequest.url?.includes("/auth/refresh")
        ) {
            return Promise.reject(error);
        }

        // If the error is 401 and we're not already retrying and not in the refresh endpoint
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            originalRequest.url !== "/auth/refresh"
        ) {
            // If we're already refreshing, add to queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await api.post("/auth/refresh");
                const { accessToken, user } = response.data;

                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("user", JSON.stringify(user));

                // Update auth header for the original request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                // Process queue with new token
                processQueue(null, accessToken);

                return api(originalRequest);
            } catch (refreshError) {
                // Handle refresh token errors
                processQueue(refreshError, null);

                // Clear user data
                localStorage.removeItem("accessToken");
                localStorage.removeItem("user");

                // Redirect to login
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export const authApi = {
    login: async (email: string, password: string) => {
        const response = await api.post("/auth/login", { email, password });
        const { accessToken, user } = response.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        socketService.connectWithStoredToken();
        return { user };
    },

    register: async (email: string, password: string, name: string) => {
        const response = await api.post("/auth/register", {
            email,
            password,
            name,
        });
        const { accessToken, user } = response.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        socketService.connectWithStoredToken();
        return { user };
    },

    logout: async () => {
        socketService.disconnect();
        await api.post("/auth/logout");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
    },

    refreshToken: async () => {
        const response = await api.post("/auth/refresh");
        const { accessToken, user } = response.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        return { user };
    },
};

export default api;
