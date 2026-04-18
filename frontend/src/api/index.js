import axios from "axios";
import { useAuthStore } from "../store/auth";

const api = axios.create({
    baseURL: "http://localhost:4000/api"
});

let handlingAuthError = false;

api.interceptors.request.use((config) => {
    const auth = useAuthStore();
    if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error && error.response && error.response.status;
        const isAuthError = status === 401;

        if (isAuthError && !handlingAuthError) {
            handlingAuthError = true;
            const auth = useAuthStore();
            auth.logout();

            if (typeof window !== "undefined") {
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }

            setTimeout(() => {
                handlingAuthError = false;
            }, 250);
        }

        return Promise.reject(error);
    }
);

export default api;