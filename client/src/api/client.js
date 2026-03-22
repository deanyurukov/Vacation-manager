import { endpoints } from './endpoints.js';

const TOKEN_KEY = 'vm_token';
const USER_KEY = 'vm_user';

export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function persistAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export async function parseJsonSafe(res) {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export async function parseError(res) {
    const data = await parseJsonSafe(res);
    if (data && typeof data === 'object') {
        if (data.message) return data.message;
        if (data.title && data.errors) {
            const { PageSize, ...otherErrors } = data.errors;
            const hasOtherErrors = Object.keys(otherErrors).length > 0;
            if (hasOtherErrors) return JSON.stringify(otherErrors);
            return "Validation error";
        }
    }
    return res.statusText || `HTTP ${res.status}`;
}

/**
 * @param {string} url
 * @param {RequestInit & { json?: unknown, skipAuth?: boolean }} options
 */
export async function apiRequest(url, options = {}) {
    const { json, skipAuth, headers: initHeaders, body: bodyIn, ...rest } = options;
    const headers = new Headers(initHeaders);

    if (!skipAuth) {
        const token = getStoredToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    let body = bodyIn;
    if (json !== undefined) {
        if (bodyIn instanceof FormData) {
            throw new Error('Cannot combine json and FormData body');
        }
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(json);
    }

    const res = await fetch(url, { ...rest, headers, body });

    if (res.status === 401 && !skipAuth) {
        clearAuth();
        if (!window.location.pathname.startsWith('/login')) {
            window.location.assign('/login');
        }
    }

    return res;
}

export async function apiJson(url, options = {}) {
    const res = await apiRequest(url, options);
    if (!res.ok) {
        throw new Error(await parseError(res));
    }
    if (res.status === 204) return null;
    return parseJsonSafe(res);
}

export async function apiBlob(url) {
    const res = await apiRequest(url, { method: "GET" });
    if (!res.ok) {
        throw new Error(await parseError(res));
    }
    return res.blob();
}

export async function loginRequest(username, password) {
    const res = await apiRequest(endpoints.auth.login(), {
        method: 'POST',
        skipAuth: true,
        json: { username, password },
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
        throw new Error(data?.message || (await parseError(res)));
    }
    return data;
}
