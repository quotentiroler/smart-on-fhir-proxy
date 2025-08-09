import localforage from "localforage";
import { applyDecrypt, applyEncrypt } from "./utils";

localforage.config({
    name: "proxy-smart",
});

// Encrypted persistent storage using localforage
export const getItem = async <T>(key: string): Promise<T | null> => {
    let storedValue = await localforage.getItem<string>(key);

    if (storedValue) {
        storedValue = applyDecrypt(storedValue);

        try {
            // Try to parse as JSON
            return JSON.parse(storedValue) as T;
        } catch {
            // If parsing fails, return the raw string
            return storedValue as T;
        }
    }

    return null;
};

export const storeItem = async (key: string, value: object): Promise<void> => {
    const valuestring = JSON.stringify(value);
    await setItem(key, valuestring);
};

export const setItem = async (key: string, value: string): Promise<void> => {
    const encryptedValue = applyEncrypt(value);
    await localforage.setItem(key, encryptedValue);
}

export const removeItem = async (key: string): Promise<void> => {
    await localforage.removeItem(key);
};

// Session storage utilities (for temporary data like PKCE parameters)
export const getSessionItem = (key: string): string | null => {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        console.warn('Failed to get session storage item:', error);
        return null;
    }
};

export const setSessionItem = (key: string, value: string): void => {
    try {
        sessionStorage.setItem(key, value);
    } catch (error) {
        console.warn('Failed to set session storage item:', error);
    }
};

export const removeSessionItem = (key: string): void => {
    try {
        sessionStorage.removeItem(key);
    } catch (error) {
        console.warn('Failed to remove session storage item:', error);
    }
};

// Theme storage utilities (with fallback)
export const getTheme = (storageKey: string, defaultTheme: string): string => {
    try {
        return localStorage.getItem(storageKey) || defaultTheme;
    } catch (error) {
        console.warn('Failed to get theme from storage:', error);
        return defaultTheme;
    }
};

export const setTheme = (storageKey: string, theme: string): void => {
    try {
        localStorage.setItem(storageKey, theme);
    } catch (error) {
        console.warn('Failed to set theme in storage:', error);
    }
};

// Utility to clear all OAuth-related data (both encrypted and session)
export const clearAllAuthData = async (): Promise<void> => {
    // Clear encrypted token storage
    try {
        await removeItem('openid_tokens');
    } catch (error) {
        console.warn('Failed to clear encrypted tokens:', error);
    }

    // Clear session storage
    removeSessionItem('pkce_code_verifier');
    removeSessionItem('oauth_state');

    // Clear any cached OAuth state in localStorage
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.includes('oauth') || key.includes('pkce') || key.includes('auth')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Failed to clear localStorage oauth data:', error);
    }
};
