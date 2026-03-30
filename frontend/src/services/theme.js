import api from "../api";

const THEME_CLASS = "ormeco-dark";
const THEME_STORAGE_KEY = "ormeco:dark-mode";

export function applyTheme(enabled) {
    if (typeof document === "undefined") return;

    const isDark = !!enabled;
    document.documentElement.classList.toggle(THEME_CLASS, isDark);
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "1" : "0");
}

export function loadThemePreference() {
    if (typeof window === "undefined") return false;

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const isDark = saved === "1";
    applyTheme(isDark);
    return isDark;
}

export async function syncThemeFromServer() {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
        const { data } = await api.get("/settings/system");
        const isDark = !!(data && data.appearance && data.appearance.darkModeEnabled);
        applyTheme(isDark);
        return isDark;
    } catch (_) {
        return false;
    }
}