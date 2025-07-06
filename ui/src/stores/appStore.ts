import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import i18n, { supportedLanguages } from '../lib/i18n';

// Get the initial language from browser or default to 'en'
const getInitialLanguage = (): string => {
  const browserLanguage = navigator.language.split("-")[0];
  const selectedLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : "en";
  return selectedLanguage;
};

interface AppState {
  // Language settings
  language: string;
  setLanguage: (language: string) => Promise<void>;
  
  // Theme settings (for future use)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // UI preferences
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Notification preferences
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Language settings
      language: getInitialLanguage(),
      setLanguage: async (language: string) => {
        
        try {
          console.debug('🔄 Attempting to change i18n language to:', language);
          await i18n.changeLanguage(language);
          console.debug('✅ i18n language changed successfully to:', i18n.language);
          
          // Update store state
          set({ language });
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
        } catch (error) {
          console.error('❌ Failed to change language:', error);
        }
      },
      
      // Theme settings
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System theme
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', isDark);
        }
      },
      
      // UI preferences
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Notification preferences
      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);

// Initialize language on app start
export const initializeAppStore = async () => {
  const { language, setLanguage } = useAppStore.getState();
  await setLanguage(language);
};