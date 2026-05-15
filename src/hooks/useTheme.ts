import { useState, useEffect, useCallback } from 'react';
import { AppTheme, ExtensionSettings, defaultSettings } from '../types';

const STORAGE_KEY = 'img2svg_settings';

const getStoredSettings = (): ExtensionSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
};

const saveSettings = (settings: ExtensionSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const useTheme = () => {
  const [theme, setTheme] = useState<AppTheme>('system');

  useEffect(() => {
    // Load setting initially from local storage
    const storedSettings = getStoredSettings();
    if (storedSettings?.theme) {
      setTheme(storedSettings.theme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      // System theme is handled by @media (prefers-color-scheme: dark) in index.css
      // but we might want to know if it's currently dark for some logic
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const updateTheme = useCallback((newTheme: AppTheme) => {
    setTheme(newTheme);
    
    // Save to local storage
    const storedSettings = getStoredSettings();
    const updatedSettings = { ...storedSettings, theme: newTheme };
    saveSettings(updatedSettings);
  }, []);

  return { theme, setTheme: updateTheme };
};
