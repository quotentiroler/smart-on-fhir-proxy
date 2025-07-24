import localforage from "localforage";
import { applyDecrypt, applyEncrypt } from "./utils";

localforage.config({
    name: "myteacher",
});

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
