import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import CryptoJS from "crypto-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Default encryption secret fallback (should not be used in production)
const DEFAULT_ENCRYPTION_SECRET = "proxy-smart-default-secret-key";

// Get encryption secret with fallback
const getEncryptionSecret = (): string => {
  const secret = import.meta.env.VITE_ENCRYPTION_SECRET;
  if (!secret) {
    console.warn("VITE_ENCRYPTION_SECRET not found, using default secret. This is NOT secure for production!");
    return DEFAULT_ENCRYPTION_SECRET;
  }
  return secret;
};

// Encrypt
export const applyEncrypt = (text: string): string => {
  try {
    return CryptoJS.AES.encrypt(text, getEncryptionSecret()).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    // Return the original text if encryption fails (fallback)
    return text;
  }
};

// Decrypt
export const applyDecrypt = (cipherText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, getEncryptionSecret());
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // If decryption fails, bytes.toString() returns empty string
    if (!decrypted) {
      console.warn("Decryption failed, returning original text");
      return cipherText;
    }

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return the original cipher text if decryption fails (fallback)
    return cipherText;
  }
};
